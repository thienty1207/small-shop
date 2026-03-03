# API Versioning Strategies

> URL paths, headers, and content negotiation for API versioning.

## Versioning Approaches

| Approach | Format | Pros | Cons |
|----------|--------|------|------|
| **URL Path** | `/v1/users` | Clear, cacheable | Breaks REST purity |
| **Query Param** | `/users?version=1` | Easy to implement | Less clean URLs |
| **Header** | `API-Version: 1` | Clean URLs | Hidden from URL |
| **Content Type** | `Accept: application/vnd.api.v1+json` | Precise | Complex |

## URL Path Versioning (Recommended)

### Rust/Axum

```rust
use axum::{Router, routing::get};

pub fn versioned_router() -> Router {
    Router::new()
        .nest("/api/v1", v1::router())
        .nest("/api/v2", v2::router())
}

mod v1 {
    use axum::{Router, routing::get, Json};
    use serde::Serialize;

    #[derive(Serialize)]
    pub struct UserV1 {
        pub id: String,
        pub email: String,
        pub name: String,
    }

    pub fn router() -> Router {
        Router::new()
            .route("/users", get(list_users))
            .route("/users/:id", get(get_user))
    }

    async fn list_users() -> Json<Vec<UserV1>> {
        Json(vec![])
    }

    async fn get_user() -> Json<UserV1> {
        Json(UserV1 {
            id: "1".into(),
            email: "user@example.com".into(),
            name: "John".into(),
        })
    }
}

mod v2 {
    use axum::{Router, routing::get, Json};
    use serde::Serialize;

    // V2 has restructured user with profile
    #[derive(Serialize)]
    pub struct UserV2 {
        pub id: String,
        pub email: String,
        pub profile: Profile,
        pub created_at: chrono::DateTime<chrono::Utc>,
    }

    #[derive(Serialize)]
    pub struct Profile {
        pub display_name: String,
        pub avatar_url: Option<String>,
    }

    pub fn router() -> Router {
        Router::new()
            .route("/users", get(list_users))
            .route("/users/:id", get(get_user))
    }

    async fn list_users() -> Json<Vec<UserV2>> {
        Json(vec![])
    }

    async fn get_user() -> Json<UserV2> {
        // Implementation
        todo!()
    }
}
```

### Go/Fiber

```go
func SetupRoutes(app *fiber.App) {
    // V1 API
    v1 := app.Group("/api/v1")
    v1.Get("/users", v1Handlers.ListUsers)
    v1.Get("/users/:id", v1Handlers.GetUser)

    // V2 API
    v2 := app.Group("/api/v2")
    v2.Get("/users", v2Handlers.ListUsers)
    v2.Get("/users/:id", v2Handlers.GetUser)
}
```

### Python/FastAPI

```python
from fastapi import FastAPI, APIRouter

app = FastAPI()

# V1 Router
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])

@v1_router.get("/users")
async def list_users_v1():
    return [{"id": "1", "email": "user@example.com", "name": "John"}]

# V2 Router with different schema
v2_router = APIRouter(prefix="/api/v2", tags=["v2"])

@v2_router.get("/users")
async def list_users_v2():
    return [{
        "id": "1",
        "email": "user@example.com",
        "profile": {"display_name": "John", "avatar_url": None},
        "created_at": "2024-01-01T00:00:00Z"
    }]

app.include_router(v1_router)
app.include_router(v2_router)
```

## Header-Based Versioning

### Rust/Axum

```rust
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
    Router,
};

#[derive(Clone, Copy, PartialEq)]
pub enum ApiVersion {
    V1,
    V2,
}

async fn version_extractor(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let version = request
        .headers()
        .get("API-Version")
        .and_then(|v| v.to_str().ok())
        .map(|v| match v {
            "1" | "v1" | "2023-01-01" => ApiVersion::V1,
            "2" | "v2" | "2024-01-01" => ApiVersion::V2,
            _ => ApiVersion::V2, // Default to latest
        })
        .unwrap_or(ApiVersion::V2);

    request.extensions_mut().insert(version);
    Ok(next.run(request).await)
}

// Use in handler
async fn get_user(
    Extension(version): Extension<ApiVersion>,
    Path(id): Path<String>,
) -> Response {
    match version {
        ApiVersion::V1 => Json(get_user_v1(&id)).into_response(),
        ApiVersion::V2 => Json(get_user_v2(&id)).into_response(),
    }
}
```

### Go/Fiber

```go
func VersionMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        version := c.Get("API-Version", "2") // Default to v2
        
        switch version {
        case "1", "v1", "2023-01-01":
            c.Locals("api_version", 1)
        case "2", "v2", "2024-01-01":
            c.Locals("api_version", 2)
        default:
            c.Locals("api_version", 2)
        }
        
        return c.Next()
    }
}

func GetUser(c *fiber.Ctx) error {
    version := c.Locals("api_version").(int)
    id := c.Params("id")
    
    switch version {
    case 1:
        return c.JSON(getUserV1(id))
    default:
        return c.JSON(getUserV2(id))
    }
}
```

## Date-Based Versioning (Stripe-style)

```rust
use chrono::NaiveDate;

#[derive(Clone, Copy)]
pub struct ApiVersion {
    date: NaiveDate,
}

impl ApiVersion {
    pub const V2023_01_01: Self = Self { date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap() };
    pub const V2024_01_01: Self = Self { date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap() };
    pub const LATEST: Self = Self::V2024_01_01;

    pub fn from_header(header: &str) -> Option<Self> {
        NaiveDate::parse_from_str(header, "%Y-%m-%d")
            .ok()
            .map(|date| Self { date })
    }

    pub fn includes(&self, feature_version: Self) -> bool {
        self.date >= feature_version.date
    }
}

// Usage in handler
async fn get_user(
    Extension(version): Extension<ApiVersion>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    let user = fetch_user(&id).await;
    
    let response = if version.includes(ApiVersion::V2024_01_01) {
        // New format with profile object
        json!({
            "id": user.id,
            "email": user.email,
            "profile": {
                "display_name": user.name,
                "avatar_url": user.avatar
            }
        })
    } else {
        // Old flat format
        json!({
            "id": user.id,
            "email": user.email,
            "name": user.name
        })
    };
    
    Json(response)
}
```

## Deprecation Handling

### Sunset Headers

```rust
use axum::{
    http::{header::HeaderName, HeaderValue},
    middleware::from_fn,
    response::Response,
};

pub async fn add_deprecation_headers(
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    
    // Check if using deprecated version
    if let Some(version) = request.extensions().get::<ApiVersion>() {
        if *version == ApiVersion::V1 {
            let headers = response.headers_mut();
            
            headers.insert(
                HeaderName::from_static("deprecation"),
                HeaderValue::from_static("true"),
            );
            headers.insert(
                HeaderName::from_static("sunset"),
                HeaderValue::from_static("Sat, 01 Jun 2025 00:00:00 GMT"),
            );
            headers.insert(
                HeaderName::from_static("link"),
                HeaderValue::from_static("</api/v2>; rel=\"successor-version\""),
            );
        }
    }
    
    response
}
```

### Deprecation in OpenAPI

```yaml
paths:
  /api/v1/users:
    get:
      deprecated: true
      summary: List users (deprecated)
      description: |
        **⚠️ Deprecated**: This endpoint will be removed on June 1, 2025.
        Please migrate to `/api/v2/users`.
      x-sunset: "2025-06-01"
```

## Version Migration

### Adapter Pattern

```rust
// Internal canonical model
pub struct UserInternal {
    pub id: String,
    pub email: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// V1 external model
#[derive(Serialize)]
pub struct UserV1 {
    pub id: String,
    pub email: String,
    pub name: String,
}

impl From<UserInternal> for UserV1 {
    fn from(user: UserInternal) -> Self {
        Self {
            id: user.id,
            email: user.email,
            name: user.display_name,
        }
    }
}

// V2 external model
#[derive(Serialize)]
pub struct UserV2 {
    pub id: String,
    pub email: String,
    pub profile: ProfileV2,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct ProfileV2 {
    pub display_name: String,
    pub avatar_url: Option<String>,
}

impl From<UserInternal> for UserV2 {
    fn from(user: UserInternal) -> Self {
        Self {
            id: user.id,
            email: user.email,
            profile: ProfileV2 {
                display_name: user.display_name,
                avatar_url: user.avatar_url,
            },
            created_at: user.created_at,
        }
    }
}

// Generic versioned handler
async fn get_user<T: From<UserInternal> + Serialize>(
    Path(id): Path<String>,
    State(db): State<DbPool>,
) -> Result<Json<T>, AppError> {
    let user = db.get_user(&id).await?;
    Ok(Json(user.into()))
}
```

## Documentation for Multiple Versions

```rust
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(title = "My API v1", version = "1.0.0"),
    paths(v1::list_users, v1::get_user),
    components(schemas(v1::UserV1))
)]
pub struct ApiDocV1;

#[derive(OpenApi)]
#[openapi(
    info(title = "My API v2", version = "2.0.0"),
    paths(v2::list_users, v2::get_user),
    components(schemas(v2::UserV2, v2::ProfileV2))
)]
pub struct ApiDocV2;

// Serve both
Router::new()
    .merge(SwaggerUi::new("/docs/v1").url("/api-docs/v1/openapi.json", ApiDocV1::openapi()))
    .merge(SwaggerUi::new("/docs/v2").url("/api-docs/v2/openapi.json", ApiDocV2::openapi()))
```

## Best Practices

### When to Version
- Breaking changes to response structure
- Removal of fields
- Changes to field types
- Changes to error formats

### When NOT to Version
- Adding new optional fields
- Adding new endpoints
- Bug fixes
- Performance improvements

### Version Lifecycle
1. **Active**: Current stable version
2. **Maintenance**: Bug fixes only
3. **Deprecated**: Sunset header, migration docs
4. **Retired**: Returns 410 Gone

### Recommended Headers

| Header | Example | Purpose |
|--------|---------|---------|
| `API-Version` | `2024-01-01` | Request version |
| `Deprecation` | `true` | Marks deprecated |
| `Sunset` | `Sat, 01 Jun 2025 00:00:00 GMT` | Retirement date |
| `Link` | `</api/v2>; rel="successor-version"` | Migration link |
