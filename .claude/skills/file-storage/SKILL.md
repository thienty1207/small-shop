# File Storage

> Cloud storage, local file handling, and multipart uploads across multiple stacks.


## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

File storage handles user uploads, generated documents, and static assets with support for cloud and local storage backends.

### Storage Options

| Provider | Best For | Cost | SDK Support |
|----------|----------|------|-------------|
| **AWS S3** | General purpose | $0.023/GB | All stacks |
| **Cloudflare R2** | No egress fees | $0.015/GB | S3 compatible |
| **GCS** | GCP integration | $0.020/GB | All stacks |
| **MinIO** | Self-hosted | Free | S3 compatible |
| **Local FS** | Development | Free | Native |

## Quick Start

### Rust - aws-sdk-s3

```rust
// Cargo.toml: aws-sdk-s3 = "1.0", aws-config = "1.0"

use aws_sdk_s3::{primitives::ByteStream, Client};
use std::path::Path;

pub struct StorageService {
    client: Client,
    bucket: String,
}

impl StorageService {
    pub async fn new(bucket: String) -> Self {
        let config = aws_config::load_from_env().await;
        let client = Client::new(&config);
        Self { client, bucket }
    }
    
    /// Upload file with auto content-type detection
    pub async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> Result<String, StorageError> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await?;
        
        Ok(format!("s3://{}/{}", self.bucket, key))
    }
    
    /// Generate presigned URL for direct upload
    pub async fn presigned_upload_url(&self, key: &str, expires_in: Duration) -> Result<String, StorageError> {
        use aws_sdk_s3::presigning::PresigningConfig;
        
        let presign_config = PresigningConfig::expires_in(expires_in)?;
        let presigned = self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presign_config)
            .await?;
        
        Ok(presigned.uri().to_string())
    }
    
    /// Generate presigned URL for download
    pub async fn presigned_download_url(&self, key: &str, expires_in: Duration) -> Result<String, StorageError> {
        use aws_sdk_s3::presigning::PresigningConfig;
        
        let presign_config = PresigningConfig::expires_in(expires_in)?;
        let presigned = self.client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presign_config)
            .await?;
        
        Ok(presigned.uri().to_string())
    }
    
    pub async fn delete(&self, key: &str) -> Result<(), StorageError> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;
        Ok(())
    }
}
```

### Rust - Axum Multipart Upload

```rust
use axum::{
    extract::{Multipart, State},
    response::Json,
};

#[derive(Serialize)]
struct UploadResponse {
    url: String,
    size: u64,
}

pub async fn upload_file(
    State(storage): State<StorageService>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    while let Some(field) = multipart.next_field().await? {
        let name = field.name().unwrap_or("file").to_string();
        let filename = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let data = field.bytes().await?;
        
        // Generate unique key
        let key = format!("uploads/{}/{}", Uuid::new_v4(), filename);
        
        let url = storage.upload(&key, data.to_vec(), &content_type).await?;
        
        return Ok(Json(UploadResponse {
            url,
            size: data.len() as u64,
        }));
    }
    
    Err(AppError::BadRequest("No file provided".into()))
}
```

### Go - AWS SDK v2

```go
import (
    "context"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService struct {
    client *s3.Client
    bucket string
}

func NewStorageService(ctx context.Context, bucket string) (*StorageService, error) {
    cfg, err := config.LoadDefaultConfig(ctx)
    if err != nil {
        return nil, err
    }
    
    return &StorageService{
        client: s3.NewFromConfig(cfg),
        bucket: bucket,
    }, nil
}

func (s *StorageService) Upload(ctx context.Context, key string, data []byte, contentType string) error {
    _, err := s.client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:      &s.bucket,
        Key:         &key,
        Body:        bytes.NewReader(data),
        ContentType: &contentType,
    })
    return err
}

func (s *StorageService) PresignedUploadURL(ctx context.Context, key string, expires time.Duration) (string, error) {
    presignClient := s3.NewPresignClient(s.client)
    
    result, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
        Bucket: &s.bucket,
        Key:    &key,
    }, s3.WithPresignExpires(expires))
    
    if err != nil {
        return "", err
    }
    return result.URL, nil
}
```

### Python - boto3

```python
import boto3
from botocore.config import Config

class StorageService:
    def __init__(self, bucket: str):
        self.s3 = boto3.client('s3', config=Config(signature_version='s3v4'))
        self.bucket = bucket
    
    def upload(self, key: str, data: bytes, content_type: str) -> str:
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return f"s3://{self.bucket}/{key}"
    
    def presigned_upload_url(self, key: str, expires_in: int = 3600) -> str:
        return self.s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': self.bucket, 'Key': key},
            ExpiresIn=expires_in,
        )
    
    def presigned_download_url(self, key: str, expires_in: int = 3600) -> str:
        return self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': key},
            ExpiresIn=expires_in,
        )

# FastAPI endpoint
@app.post("/upload")
async def upload_file(file: UploadFile, storage: StorageService = Depends()):
    key = f"uploads/{uuid4()}/{file.filename}"
    content = await file.read()
    url = storage.upload(key, content, file.content_type)
    return {"url": url}
```

### Node.js - @aws-sdk/client-s3

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
  private client: S3Client;
  
  constructor(private bucket: string) {
    this.client = new S3Client({});
  }
  
  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));
    return `s3://${this.bucket}/${key}`;
  }
  
  async presignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
  
  async presignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
```

## R2/MinIO (S3-Compatible)

```rust
// Use S3 SDK with custom endpoint
let config = aws_config::from_env()
    .endpoint_url("https://account.r2.cloudflarestorage.com")
    .load()
    .await;

let client = Client::new(&config);
```

```typescript
// Node.js
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});
```

## Related Skills

- [security](../security/SKILL.md) - Signed URLs, access control
- [databases](../databases/SKILL.md) - Store file metadata
- [background-jobs](../background-jobs/SKILL.md) - Async file processing
