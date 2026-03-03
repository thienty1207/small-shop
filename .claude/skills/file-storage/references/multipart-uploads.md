# Multipart Upload Patterns

> Large file handling, chunked uploads, and resumable uploads.

## Direct Upload vs Server Relay

| Pattern | Best For | Pros | Cons |
|---------|----------|------|------|
| **Direct (Presigned)** | Large files | Less server load | More client complexity |
| **Server Relay** | Small files | Simple, validation | Memory/bandwidth |
| **Chunked** | Very large | Resumable, progress | Complex state |

## Rust - Presigned Upload Flow

```rust
use aws_sdk_s3::{presigning::PresigningConfig, Client};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct UploadInitiation {
    upload_url: String,
    key: String,
    expires_in_secs: u64,
}

/// Step 1: Client requests upload URL
async fn initiate_upload(
    State(state): State<AppState>,
    Json(req): Json<InitiateUploadRequest>,
) -> Result<Json<UploadInitiation>, AppError> {
    // Validate file type and size
    let allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if !allowed_types.contains(&req.content_type.as_str()) {
        return Err(AppError::BadRequest("Invalid file type".into()));
    }
    
    // Generate unique key
    let key = format!(
        "uploads/{}/{}/{}",
        state.user_id,
        Utc::now().format("%Y/%m/%d"),
        Uuid::new_v4()
    );
    
    // Generate presigned URL
    let presign_config = PresigningConfig::expires_in(Duration::from_secs(3600))?;
    let presigned = state.s3
        .put_object()
        .bucket(&state.bucket)
        .key(&key)
        .content_type(&req.content_type)
        .content_length(req.size as i64)
        .presigned(presign_config)
        .await?;
    
    Ok(Json(UploadInitiation {
        upload_url: presigned.uri().to_string(),
        key,
        expires_in_secs: 3600,
    }))
}

/// Step 2: Client uploads directly to S3
// (Client-side code)

/// Step 3: Client confirms upload, server validates
async fn confirm_upload(
    State(state): State<AppState>,
    Json(req): Json<ConfirmUploadRequest>,
) -> Result<Json<UploadResult>, AppError> {
    // Verify file exists and matches expected metadata
    let head = state.s3
        .head_object()
        .bucket(&state.bucket)
        .key(&req.key)
        .send()
        .await?;
    
    // Validate size
    if head.content_length.unwrap_or(0) > MAX_FILE_SIZE {
        // Delete invalid upload
        state.s3.delete_object()
            .bucket(&state.bucket)
            .key(&req.key)
            .send()
            .await?;
        return Err(AppError::BadRequest("File too large".into()));
    }
    
    // Store metadata in database
    let file = sqlx::query_as!(
        File,
        r#"
        INSERT INTO files (user_id, key, size, content_type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
        state.user_id,
        req.key,
        head.content_length.unwrap_or(0),
        head.content_type.unwrap_or_default(),
    )
    .fetch_one(&state.db)
    .await?;
    
    Ok(Json(UploadResult {
        id: file.id,
        url: generate_cdn_url(&file.key),
    }))
}
```

## Chunked Upload for Large Files

```rust
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};

struct ChunkedUpload {
    upload_id: String,
    key: String,
    parts: Vec<CompletedPart>,
}

/// Initiate multipart upload
async fn start_chunked_upload(
    State(state): State<AppState>,
    Json(req): Json<StartChunkedRequest>,
) -> Result<Json<ChunkedUploadInit>, AppError> {
    let key = format!("uploads/{}/{}", state.user_id, Uuid::new_v4());
    
    let multipart = state.s3
        .create_multipart_upload()
        .bucket(&state.bucket)
        .key(&key)
        .content_type(&req.content_type)
        .send()
        .await?;
    
    let upload_id = multipart.upload_id.unwrap();
    
    // Store upload state in Redis for resumability
    let upload_state = UploadState {
        upload_id: upload_id.clone(),
        key: key.clone(),
        total_parts: req.total_chunks,
        completed_parts: vec![],
    };
    state.redis.set(
        &format!("upload:{}", upload_id),
        serde_json::to_string(&upload_state)?,
        3600 * 24, // 24 hour expiry
    ).await?;
    
    Ok(Json(ChunkedUploadInit { upload_id, key }))
}

/// Get presigned URL for each chunk
async fn get_chunk_url(
    State(state): State<AppState>,
    Path((upload_id, part_number)): Path<(String, i32)>,
) -> Result<Json<ChunkUrl>, AppError> {
    // Retrieve upload state
    let upload_state: UploadState = state.redis
        .get(&format!("upload:{}", upload_id))
        .await?
        .ok_or(AppError::NotFound)?;
    
    let presign_config = PresigningConfig::expires_in(Duration::from_secs(3600))?;
    let presigned = state.s3
        .upload_part()
        .bucket(&state.bucket)
        .key(&upload_state.key)
        .upload_id(&upload_id)
        .part_number(part_number)
        .presigned(presign_config)
        .await?;
    
    Ok(Json(ChunkUrl {
        url: presigned.uri().to_string(),
        part_number,
    }))
}

/// Complete multipart upload
async fn complete_chunked_upload(
    State(state): State<AppState>,
    Json(req): Json<CompleteChunkedRequest>,
) -> Result<Json<UploadResult>, AppError> {
    let parts: Vec<CompletedPart> = req.parts
        .iter()
        .map(|p| CompletedPart::builder()
            .part_number(p.part_number)
            .e_tag(&p.etag)
            .build())
        .collect();
    
    state.s3
        .complete_multipart_upload()
        .bucket(&state.bucket)
        .key(&req.key)
        .upload_id(&req.upload_id)
        .multipart_upload(
            CompletedMultipartUpload::builder()
                .set_parts(Some(parts))
                .build()
        )
        .send()
        .await?;
    
    // Cleanup Redis state
    state.redis.delete(&format!("upload:{}", req.upload_id)).await?;
    
    Ok(Json(UploadResult {
        id: Uuid::new_v4().to_string(),
        url: generate_cdn_url(&req.key),
    }))
}
```

## Client-Side Chunked Upload

```typescript
interface ChunkUploader {
  file: File;
  chunkSize: number;
  onProgress: (percent: number) => void;
}

async function uploadInChunks({ file, chunkSize, onProgress }: ChunkUploader) {
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  // 1. Initialize upload
  const { uploadId, key } = await fetch('/api/uploads/chunked/start', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      totalChunks,
    }),
  }).then(r => r.json());
  
  const parts: { partNumber: number; etag: string }[] = [];
  
  // 2. Upload each chunk
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    // Get presigned URL for this chunk
    const { url } = await fetch(`/api/uploads/chunked/${uploadId}/part/${i + 1}`)
      .then(r => r.json());
    
    // Upload chunk directly to S3
    const response = await fetch(url, {
      method: 'PUT',
      body: chunk,
    });
    
    parts.push({
      partNumber: i + 1,
      etag: response.headers.get('ETag')!,
    });
    
    onProgress(((i + 1) / totalChunks) * 100);
  }
  
  // 3. Complete upload
  return fetch('/api/uploads/chunked/complete', {
    method: 'POST',
    body: JSON.stringify({ uploadId, key, parts }),
  }).then(r => r.json());
}

// Usage with resumability
async function resumableUpload(file: File) {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const uploadKey = `upload-${file.name}-${file.size}`;
  
  // Check for existing upload
  const savedState = localStorage.getItem(uploadKey);
  let state = savedState ? JSON.parse(savedState) : null;
  
  if (!state) {
    // Start new upload
    state = await initializeUpload(file);
    localStorage.setItem(uploadKey, JSON.stringify(state));
  }
  
  // Resume from last completed chunk
  const startChunk = state.completedParts.length;
  
  // ... continue upload
  
  // Cleanup on complete
  localStorage.removeItem(uploadKey);
}
```

## Image Processing on Upload

```rust
// Process images after upload
async fn process_uploaded_image(key: &str) -> Result<ProcessedImage, Error> {
    // Download from S3
    let object = s3.get_object().bucket(bucket).key(key).send().await?;
    let bytes = object.body.collect().await?.into_bytes();
    
    // Process with image crate
    let img = image::load_from_memory(&bytes)?;
    
    // Generate thumbnails
    let thumb_128 = img.thumbnail(128, 128);
    let thumb_512 = img.thumbnail(512, 512);
    
    // Upload variants
    let thumb_key = format!("{}_thumb_128", key);
    s3.put_object()
        .bucket(bucket)
        .key(&thumb_key)
        .body(ByteStream::from(thumb_128.to_vec()))
        .content_type("image/webp")
        .send()
        .await?;
    
    Ok(ProcessedImage {
        original: key.to_string(),
        thumbnail: thumb_key,
    })
}
```
