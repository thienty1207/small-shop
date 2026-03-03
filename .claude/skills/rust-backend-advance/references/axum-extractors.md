# Axum Extractors

Deep dive into Axum's extractor system for request parsing.

## Extractor Basics

Extractors are types that implement `FromRequest` or `FromRequestParts`. They parse incoming requests and provide typed data to handlers.

```rust
// Order matters! Body extractors must come last
async fn handler(
    State(state): State<AppState>,      // FromRequestParts
    Path(id): Path<Uuid>,                // FromRequestParts  
    Query(params): Query<ListParams>,    // FromRequestParts
    headers: HeaderMap,                  // FromRequestParts
    Json(body): Json<CreateInput>,       // FromRequest (consumes body)
) -> impl IntoResponse {
    // ...
}
```

---

## Built-in Extractors

### Path - URL Parameters

```rust
use axum::extract::Path;

// Single value
// Route: /users/:id
async fn get_user(Path(id): Path<Uuid>) -> impl IntoResponse { }

// Multiple values (tuple)
// Route: /users/:user_id/posts/:post_id
async fn get_post(Path((user_id, post_id)): Path<(Uuid, Uuid)>) -> impl IntoResponse { }

// Struct (more readable)
#[derive(Deserialize)]
struct PostPath {
    user_id: Uuid,
    post_id: Uuid,
}

async fn get_post(Path(path): Path<PostPath>) -> impl IntoResponse {
    // path.user_id, path.post_id
}

// Wildcard path
// Route: /files/*path
async fn get_file(Path(file_path): Path<String>) -> impl IntoResponse {
    // file_path = "some/nested/file.txt"
}
```

### Query - Query String

```rust
use axum::extract::Query;

#[derive(Deserialize)]
struct Pagination {
    #[serde(default = "default_page")]
    page: u32,
    
    #[serde(default = "default_limit")]  
    limit: u32,
    
    #[serde(default)]
    sort: Option<String>,
    
    #[serde(default)]
    order: SortOrder,
}

fn default_page() -> u32 { 1 }
fn default_limit() -> u32 { 20 }

#[derive(Deserialize, Default)]
#[serde(rename_all = "lowercase")]
enum SortOrder {
    #[default]
    Asc,
    Desc,
}

// GET /users?page=2&limit=50&sort=name&order=desc
async fn list_users(Query(params): Query<Pagination>) -> impl IntoResponse {
    let offset = (params.page - 1) * params.limit;
    // ...
}
```

### Json - Request Body

```rust
use axum::Json;

#[derive(Deserialize)]
struct CreateUser {
    name: String,
    email: String,
    
    #[serde(default)]
    role: Role,
    
    #[serde(default)]
    metadata: Option<serde_json::Value>,
}

async fn create_user(Json(input): Json<CreateUser>) -> impl IntoResponse {
    // input is deserialized and validated
}
```

### State - Application State

```rust
use axum::extract::State;

#[derive(Clone)]
struct AppState {
    db: PgPool,
    config: Arc<Config>,
}

async fn handler(State(state): State<AppState>) -> impl IntoResponse {
    // state.db, state.config
}

// Extract partial state with FromRef
use axum::extract::FromRef;

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

async fn handler(State(pool): State<PgPool>) -> impl IntoResponse {
    // Just the pool
}
```

### Headers

```rust
use axum::http::HeaderMap;
use axum::extract::TypedHeader;
use headers::{Authorization, authorization::Bearer, ContentType};

// Raw headers
async fn with_headers(headers: HeaderMap) -> impl IntoResponse {
    let auth = headers.get("Authorization");
    let content_type = headers.get("Content-Type");
}

// Typed headers (requires headers crate feature)
async fn with_typed_headers(
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>,
    TypedHeader(content_type): TypedHeader<ContentType>,
) -> impl IntoResponse {
    let token = auth.token();
}

// Optional typed header
async fn optional_header(
    auth: Option<TypedHeader<Authorization<Bearer>>>,
) -> impl IntoResponse {
    if let Some(TypedHeader(auth)) = auth {
        // Authenticated
    }
}
```

### Form Data

```rust
use axum::Form;

#[derive(Deserialize)]
struct LoginForm {
    username: String,
    password: String,
    remember_me: Option<bool>,
}

async fn login(Form(form): Form<LoginForm>) -> impl IntoResponse {
    // form.username, form.password
}
```

### Request Parts

```rust
use axum::http::{Request, Method, Uri, Version};
use axum::body::Body;

// Full request
async fn full_request(request: Request<Body>) -> impl IntoResponse {
    let (parts, body) = request.into_parts();
    // parts.method, parts.uri, parts.headers
}

// Individual parts
async fn parts(
    method: Method,
    uri: Uri,
    version: Version,
) -> impl IntoResponse {
    format!("{} {} {:?}", method, uri, version)
}
```

### Extension - Request Extensions

```rust
use axum::Extension;

// Set by middleware
async fn handler(Extension(user): Extension<CurrentUser>) -> impl IntoResponse {
    format!("Hello, {}", user.name)
}

// In middleware
async fn auth_middleware(mut request: Request<Body>, next: Next) -> Response {
    let user = validate_user(&request).await?;
    request.extensions_mut().insert(user);
    next.run(request).await
}
```

---

## Optional Extractors

All extractors can be made optional:

```rust
async fn handler(
    Query(params): Query<Pagination>,           // Required - 400 if invalid
    auth: Option<TypedHeader<Authorization>>,   // Optional - None if missing
) -> impl IntoResponse {
    if let Some(auth) = auth {
        // Authenticated request
    } else {
        // Anonymous request
    }
}
```

---

## Result Extractors

Handle extraction errors explicitly:

```rust
async fn handler(
    query_result: Result<Query<Params>, QueryRejection>,
    json_result: Result<Json<Input>, JsonRejection>,
) -> impl IntoResponse {
    match query_result {
        Ok(Query(params)) => { /* valid */ }
        Err(e) => { /* handle error */ }
    }
}
```

---

## Custom Extractors

### FromRequestParts (Headers, Path, Query, State)

```rust
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};

pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub role: Role,
}

#[async_trait]
impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AppError;
    
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Get auth header
        let header = parts.headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized)?;
        
        // Parse "Bearer <token>"
        let token = header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized)?;
        
        // Validate and decode JWT
        let claims = jsonwebtoken::decode::<Claims>(token, &KEYS.decoding, &Validation::default())
            .map_err(|_| AppError::Unauthorized)?
            .claims;
        
        Ok(CurrentUser {
            id: claims.sub,
            email: claims.email,
            role: claims.role,
        })
    }
}

// Usage - automatic extraction
async fn protected_route(user: CurrentUser) -> impl IntoResponse {
    format!("Hello, {}!", user.email)
}
```

### FromRequest (Consumes Body)

```rust
use axum::{
    async_trait,
    extract::FromRequest,
    http::Request,
    body::Body,
};

pub struct ValidatedJson<T>(pub T);

#[async_trait]
impl<S, T> FromRequest<S> for ValidatedJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned + Validate,
{
    type Rejection = AppError;
    
    async fn from_request(req: Request<Body>, state: &S) -> Result<Self, Self::Rejection> {
        // First extract as Json
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| AppError::Validation(e.to_string()))?;
        
        // Then validate
        value.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;
        
        Ok(ValidatedJson(value))
    }
}

// Usage
async fn create_user(ValidatedJson(input): ValidatedJson<CreateUser>) -> impl IntoResponse {
    // input is already validated
}
```

---

## Extractor with State Access

```rust
use axum::extract::FromRef;

pub struct DbUser(pub User);

#[async_trait]
impl<S> FromRequestParts<S> for DbUser
where
    PgPool: FromRef<S>,  // Access to pool from state
    S: Send + Sync,
{
    type Rejection = AppError;
    
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Get pool from state
        let pool = PgPool::from_ref(state);
        
        // Get user ID from path
        let Path(id): Path<Uuid> = Path::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::BadRequest)?;
        
        // Fetch from database
        let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
            .fetch_optional(&pool)
            .await?
            .ok_or(AppError::NotFound("User not found".into()))?;
        
        Ok(DbUser(user))
    }
}

// Usage - automatically fetches user
async fn get_user(DbUser(user): DbUser) -> Json<User> {
    Json(user)
}
```

---

## Combining Extractors

```rust
// Create a combined extractor
pub struct AuthenticatedRequest<T> {
    pub user: CurrentUser,
    pub body: T,
}

#[async_trait]
impl<S, T> FromRequest<S> for AuthenticatedRequest<T>
where
    S: Send + Sync,
    T: DeserializeOwned,
{
    type Rejection = AppError;
    
    async fn from_request(req: Request<Body>, state: &S) -> Result<Self, Self::Rejection> {
        let (mut parts, body) = req.into_parts();
        
        // Extract user from headers
        let user = CurrentUser::from_request_parts(&mut parts, state).await?;
        
        // Reconstruct request and extract body
        let req = Request::from_parts(parts, body);
        let Json(body) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| AppError::Validation(e.to_string()))?;
        
        Ok(AuthenticatedRequest { user, body })
    }
}

// Usage
async fn create_post(
    AuthenticatedRequest { user, body }: AuthenticatedRequest<CreatePost>,
) -> impl IntoResponse {
    // user and body available
}
```

---

## Rejection Handling

### Custom Rejection Types

```rust
use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
    Json,
};

pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(serde_json::json!({
                "error": self.message,
            }))
        ).into_response()
    }
}

// Custom extractor with nice error
pub struct ValidEmail(pub String);

#[async_trait]
impl<S> FromRequestParts<S> for ValidEmail
where
    S: Send + Sync,
{
    type Rejection = ApiError;
    
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Query(params): Query<HashMap<String, String>> = 
            Query::from_request_parts(parts, state)
                .await
                .map_err(|_| ApiError {
                    status: StatusCode::BAD_REQUEST,
                    message: "Invalid query params".into(),
                })?;
        
        let email = params.get("email")
            .ok_or(ApiError {
                status: StatusCode::BAD_REQUEST,
                message: "Email parameter required".into(),
            })?;
        
        if !email.contains('@') {
            return Err(ApiError {
                status: StatusCode::BAD_REQUEST,
                message: "Invalid email format".into(),
            });
        }
        
        Ok(ValidEmail(email.clone()))
    }
}
```
