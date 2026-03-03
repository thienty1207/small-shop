# Error Handling

Comprehensive error handling patterns for Axum APIs.

## The AppError Pattern

### Define Error Types

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    // Client errors (4xx)
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Forbidden")]
    Forbidden,
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Too many requests")]
    TooManyRequests,
    
    // Server errors (5xx)
    #[error("Database error")]
    Database(#[from] sqlx::Error),
    
    #[error("Internal error: {0}")]
    Internal(String),
    
    #[error("External service error: {0}")]
    ExternalService(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_code, message) = match &self {
            // Client errors
            Self::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                msg.clone(),
            ),
            Self::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                msg.clone(),
            ),
            Self::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                "Authentication required".to_string(),
            ),
            Self::Forbidden => (
                StatusCode::FORBIDDEN,
                "FORBIDDEN",
                "Permission denied".to_string(),
            ),
            Self::Conflict(msg) => (
                StatusCode::CONFLICT,
                "CONFLICT",
                msg.clone(),
            ),
            Self::TooManyRequests => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMIT_EXCEEDED",
                "Too many requests".to_string(),
            ),
            
            // Server errors - log but don't expose details
            Self::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
            Self::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
            Self::ExternalService(msg) => {
                tracing::error!("External service error: {}", msg);
                (
                    StatusCode::BAD_GATEWAY,
                    "EXTERNAL_SERVICE_ERROR",
                    "External service unavailable".to_string(),
                )
            }
        };
        
        let body = Json(json!({
            "error": {
                "code": error_code,
                "message": message,
            }
        }));
        
        (status, body).into_response()
    }
}
```

### Result Type Alias

```rust
pub type AppResult<T> = Result<T, AppError>;

// Usage
async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;
    
    Ok(Json(user))
}
```

---

## Error Conversion

### From Implementations

```rust
// Automatic conversion from sqlx::Error
impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => AppError::NotFound("Record not found".to_string()),
            sqlx::Error::Database(db_err) => {
                // Handle PostgreSQL-specific errors
                if let Some(code) = db_err.code() {
                    match code.as_ref() {
                        "23505" => return AppError::Conflict("Record already exists".to_string()),
                        "23503" => return AppError::Validation("Foreign key violation".to_string()),
                        "23502" => return AppError::Validation("Not null violation".to_string()),
                        _ => {}
                    }
                }
                AppError::Database(sqlx::Error::Database(db_err))
            }
            _ => AppError::Database(error),
        }
    }
}

// From reqwest for external API calls
impl From<reqwest::Error> for AppError {
    fn from(error: reqwest::Error) -> Self {
        AppError::ExternalService(error.to_string())
    }
}

// From JSON parsing errors
impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        AppError::Validation(format!("JSON parse error: {}", error))
    }
}
```

---

## Validation Errors

### With validator Crate

```rust
use validator::{Validate, ValidationErrors};

impl From<ValidationErrors> for AppError {
    fn from(errors: ValidationErrors) -> Self {
        let messages: Vec<String> = errors
            .field_errors()
            .iter()
            .flat_map(|(field, errors)| {
                errors.iter().map(move |e| {
                    format!("{}: {}", field, e.message.as_ref().map(|m| m.to_string()).unwrap_or_default())
                })
            })
            .collect();
        
        AppError::Validation(messages.join(", "))
    }
}

// Usage
#[derive(Validate, Deserialize)]
pub struct CreateUserInput {
    #[validate(length(min = 1, max = 100, message = "Name must be 1-100 characters"))]
    pub name: String,
    
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
}

pub async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> AppResult<(StatusCode, Json<User>)> {
    input.validate()?;  // Automatically converts to AppError
    
    // ...
}
```

### Detailed Validation Response

```rust
#[derive(Serialize)]
pub struct ValidationErrorResponse {
    pub code: &'static str,
    pub message: &'static str,
    pub errors: Vec<FieldError>,
}

#[derive(Serialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

impl AppError {
    pub fn validation_errors(errors: Vec<FieldError>) -> Response {
        let body = Json(ValidationErrorResponse {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors,
        });
        
        (StatusCode::BAD_REQUEST, body).into_response()
    }
}

// Usage
if input.name.is_empty() {
    return Err(AppError::Validation("Name is required".into()));
}

// Or with multiple errors
let mut errors = vec![];
if input.name.is_empty() {
    errors.push(FieldError { field: "name".into(), message: "Name is required".into() });
}
if !input.email.contains('@') {
    errors.push(FieldError { field: "email".into(), message: "Invalid email".into() });
}
if !errors.is_empty() {
    return Err(AppError::ValidationErrors(errors));
}
```

---

## Error Context with anyhow

### Adding Context

```rust
use anyhow::Context;

pub async fn process_order(order_id: Uuid) -> AppResult<Order> {
    let order = fetch_order(order_id)
        .await
        .context(format!("Failed to fetch order {}", order_id))?;
    
    process_payment(&order)
        .await
        .context("Failed to process payment")?;
    
    send_confirmation(&order)
        .await
        .context("Failed to send confirmation")?;
    
    Ok(order)
}

// Convert anyhow::Error to AppError
impl From<anyhow::Error> for AppError {
    fn from(error: anyhow::Error) -> Self {
        AppError::Internal(format!("{:#}", error))
    }
}
```

---

## Error Middleware

### Fallback Error Handler

```rust
use axum::extract::rejection::JsonRejection;

// Handle JSON parsing errors globally
async fn handle_error(error: BoxError) -> Response {
    if error.is::<JsonRejection>() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "code": "INVALID_JSON",
                    "message": "Invalid JSON in request body"
                }
            }))
        ).into_response();
    }
    
    if error.is::<tower::timeout::error::Elapsed>() {
        return (
            StatusCode::REQUEST_TIMEOUT,
            Json(json!({
                "error": {
                    "code": "TIMEOUT",
                    "message": "Request timed out"
                }
            }))
        ).into_response();
    }
    
    tracing::error!("Unhandled error: {:?}", error);
    
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred"
            }
        }))
    ).into_response()
}
```

### Panic Handler

```rust
use tower_http::catch_panic::CatchPanicLayer;

let app = Router::new()
    .route("/", get(handler))
    .layer(CatchPanicLayer::custom(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An internal error occurred"
                }
            }))
        ).into_response()
    }));
```

---

## Domain-Specific Errors

### Business Rule Errors

```rust
#[derive(Error, Debug)]
pub enum OrderError {
    #[error("Insufficient stock for product {product_id}")]
    InsufficientStock { product_id: Uuid },
    
    #[error("Order total exceeds credit limit")]
    CreditLimitExceeded { limit: i64, total: i64 },
    
    #[error("Cannot cancel completed order")]
    CannotCancelCompleted,
    
    #[error("Invalid order state transition from {from} to {to}")]
    InvalidStateTransition { from: String, to: String },
}

impl From<OrderError> for AppError {
    fn from(error: OrderError) -> Self {
        match error {
            OrderError::InsufficientStock { .. } |
            OrderError::CreditLimitExceeded { .. } |
            OrderError::CannotCancelCompleted |
            OrderError::InvalidStateTransition { .. } => {
                AppError::Validation(error.to_string())
            }
        }
    }
}
```

---

## Error Response Format

### Consistent API Response

```rust
#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

#[derive(Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Json<Self> {
        Json(Self {
            success: true,
            data: Some(data),
            error: None,
        })
    }
}

impl ApiResponse<()> {
    pub fn error(code: &str, message: &str) -> Json<Self> {
        Json(Self {
            success: false,
            data: None,
            error: Some(ApiError {
                code: code.to_string(),
                message: message.to_string(),
                details: None,
            }),
        })
    }
}
```

---

## Logging Errors

```rust
use tracing::instrument;

#[instrument(skip(pool, input), fields(email = %input.email))]
pub async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> AppResult<Json<User>> {
    let result = do_create_user(&pool, input).await;
    
    if let Err(ref e) = result {
        // Log based on error type
        match e {
            AppError::Validation(_) => tracing::debug!("Validation error: {:?}", e),
            AppError::NotFound(_) => tracing::debug!("Not found: {:?}", e),
            AppError::Database(_) => tracing::error!("Database error: {:?}", e),
            _ => tracing::warn!("Error: {:?}", e),
        }
    }
    
    result
}
```
