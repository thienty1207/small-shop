# Code-First Documentation

> Auto-generate OpenAPI specs from code annotations across multiple stacks.

## Rust - utoipa

### Setup

```toml
# Cargo.toml
[dependencies]
utoipa = { version = "4", features = ["axum_extras", "chrono", "uuid"] }
utoipa-swagger-ui = { version = "6", features = ["axum"] }
# Or for Scalar UI
utoipa-scalar = { version = "0.1", features = ["axum"] }
```

### Schema Definitions

```rust
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// User account information
#[derive(Serialize, Deserialize, ToSchema)]
pub struct User {
    /// Unique identifier
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: uuid::Uuid,
    
    /// User's email address
    #[schema(example = "user@example.com", format = "email")]
    pub email: String,
    
    /// Display name
    #[schema(example = "John Doe", min_length = 1, max_length = 100)]
    pub name: Option<String>,
    
    /// Account status
    #[schema(example = "active")]
    pub status: UserStatus,
    
    /// Account creation timestamp
    #[schema(read_only)]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
}

/// Request to create a new user
#[derive(Deserialize, ToSchema)]
pub struct CreateUserRequest {
    #[schema(example = "user@example.com")]
    pub email: String,
    
    #[schema(example = "John Doe")]
    pub name: Option<String>,
    
    /// Password (write-only, not returned in responses)
    #[schema(example = "SecureP@ss123", min_length = 8, write_only)]
    pub password: String,
}

/// Paginated response wrapper
#[derive(Serialize, ToSchema)]
pub struct PaginatedResponse<T: ToSchema> {
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Serialize, ToSchema)]
pub struct PaginationMeta {
    pub page: u32,
    pub limit: u32,
    pub total: u64,
    pub total_pages: u32,
}
```

### Endpoint Documentation

```rust
use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
pub struct ListUsersParams {
    /// Page number (1-indexed)
    #[param(minimum = 1, default = 1)]
    pub page: Option<u32>,
    
    /// Items per page
    #[param(minimum = 1, maximum = 100, default = 20)]
    pub limit: Option<u32>,
    
    /// Filter by status
    pub status: Option<UserStatus>,
    
    /// Search query
    #[param(min_length = 1)]
    pub search: Option<String>,
}

/// List all users
///
/// Retrieve a paginated list of users with optional filtering.
#[utoipa::path(
    get,
    path = "/users",
    params(ListUsersParams),
    responses(
        (status = 200, description = "Users retrieved successfully", body = PaginatedResponse<User>),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn list_users(
    Query(params): Query<ListUsersParams>,
    State(db): State<DbPool>,
) -> Json<PaginatedResponse<User>> {
    // Implementation
    todo!()
}

/// Get user by ID
///
/// Retrieve detailed information about a specific user.
#[utoipa::path(
    get,
    path = "/users/{id}",
    params(
        ("id" = uuid::Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User found", body = User),
        (status = 404, description = "User not found", body = ErrorResponse),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn get_user(
    Path(id): Path<uuid::Uuid>,
    State(db): State<DbPool>,
) -> Result<Json<User>, AppError> {
    todo!()
}

/// Create a new user
///
/// Register a new user account with email and password.
#[utoipa::path(
    post,
    path = "/users",
    request_body(
        content = CreateUserRequest,
        description = "User creation data",
        content_type = "application/json"
    ),
    responses(
        (status = 201, description = "User created successfully", body = User),
        (status = 400, description = "Validation error", body = ValidationErrorResponse),
        (status = 409, description = "Email already exists"),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn create_user(
    State(db): State<DbPool>,
    Json(request): Json<CreateUserRequest>,
) -> Result<Json<User>, AppError> {
    todo!()
}
```

### OpenAPI Document

```rust
use utoipa::OpenApi;
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "My API",
        version = "1.0.0",
        description = "Production-ready API documentation",
        contact(name = "API Support", email = "api@example.com"),
        license(name = "MIT", url = "https://opensource.org/licenses/MIT")
    ),
    servers(
        (url = "https://api.example.com", description = "Production"),
        (url = "https://staging-api.example.com", description = "Staging"),
        (url = "http://localhost:8080", description = "Development")
    ),
    paths(
        list_users,
        get_user,
        create_user,
        // Add all endpoints
    ),
    components(
        schemas(
            User,
            UserStatus,
            CreateUserRequest,
            PaginatedResponse<User>,
            PaginationMeta,
            ErrorResponse,
            ValidationErrorResponse,
        )
    ),
    tags(
        (name = "Users", description = "User management endpoints"),
        (name = "Auth", description = "Authentication endpoints"),
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some("JWT Bearer token"))
                        .build(),
                ),
            );
        }
    }
}
```

### Router Setup

```rust
use utoipa_swagger_ui::SwaggerUi;
use utoipa_scalar::{Scalar, Servable as ScalarServable};

pub fn create_router() -> Router {
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // Or Scalar (modern alternative)
        .merge(Scalar::with_url("/scalar", ApiDoc::openapi()))
}
```

## Go - swaggo/swag

### Setup

```bash
# Install swag CLI
go install github.com/swaggo/swag/cmd/swag@latest

# Generate docs
swag init
```

```go
// main.go

// @title My API
// @version 1.0.0
// @description Production-ready API documentation
// @contact.name API Support
// @contact.email api@example.com
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host api.example.com
// @BasePath /api/v1
// @schemes https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT Bearer token

package main
```

### Model Documentation

```go
// User represents a user account
type User struct {
    // Unique identifier
    ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
    // User's email address
    Email string `json:"email" example:"user@example.com"`
    // Display name
    Name string `json:"name,omitempty" example:"John Doe"`
    // Account status
    Status UserStatus `json:"status" example:"active" enums:"active,inactive,suspended"`
    // Account creation timestamp
    CreatedAt time.Time `json:"created_at"`
} // @name User

type UserStatus string

const (
    UserStatusActive    UserStatus = "active"
    UserStatusInactive  UserStatus = "inactive"
    UserStatusSuspended UserStatus = "suspended"
)

// CreateUserRequest represents user creation data
type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email" example:"user@example.com"`
    Name     string `json:"name,omitempty" example:"John Doe"`
    Password string `json:"password" binding:"required,min=8" example:"SecureP@ss123"`
} // @name CreateUserRequest

// PaginatedResponse wraps paginated data
type PaginatedResponse[T any] struct {
    Data       []T            `json:"data"`
    Pagination PaginationMeta `json:"pagination"`
} // @name PaginatedResponse

type PaginationMeta struct {
    Page       int `json:"page" example:"1"`
    Limit      int `json:"limit" example:"20"`
    Total      int `json:"total" example:"150"`
    TotalPages int `json:"total_pages" example:"8"`
} // @name PaginationMeta
```

### Handler Documentation

```go
// ListUsers godoc
// @Summary List all users
// @Description Retrieve a paginated list of users with optional filtering
// @Tags Users
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1) minimum(1)
// @Param limit query int false "Items per page" default(20) minimum(1) maximum(100)
// @Param status query string false "Filter by status" Enums(active, inactive, suspended)
// @Param search query string false "Search query"
// @Success 200 {object} PaginatedResponse[User] "Users retrieved successfully"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Security BearerAuth
// @Router /users [get]
func (h *Handler) ListUsers(c *fiber.Ctx) error {
    // Implementation
}

// GetUser godoc
// @Summary Get user by ID
// @Description Retrieve detailed information about a specific user
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "User ID" format(uuid)
// @Success 200 {object} User "User found"
// @Failure 404 {object} ErrorResponse "User not found"
// @Security BearerAuth
// @Router /users/{id} [get]
func (h *Handler) GetUser(c *fiber.Ctx) error {
    // Implementation
}

// CreateUser godoc
// @Summary Create a new user
// @Description Register a new user account with email and password
// @Tags Users
// @Accept json
// @Produce json
// @Param request body CreateUserRequest true "User creation data"
// @Success 201 {object} User "User created successfully"
// @Failure 400 {object} ValidationErrorResponse "Validation error"
// @Failure 409 {object} ErrorResponse "Email already exists"
// @Security BearerAuth
// @Router /users [post]
func (h *Handler) CreateUser(c *fiber.Ctx) error {
    // Implementation
}
```

### Router Setup

```go
import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/swagger"
    _ "myapp/docs" // Generated docs package
)

func setupRoutes(app *fiber.App) {
    // Swagger UI
    app.Get("/swagger/*", swagger.HandlerDefault)
    
    // Or with custom config
    app.Get("/docs/*", swagger.New(swagger.Config{
        URL:          "/docs/doc.json",
        DeepLinking:  true,
        DocExpansion: "list",
    }))
    
    // API routes
    api := app.Group("/api/v1")
    api.Get("/users", handler.ListUsers)
    api.Get("/users/:id", handler.GetUser)
    api.Post("/users", handler.CreateUser)
}
```

## Python - FastAPI (Built-in)

FastAPI generates OpenAPI automatically from Pydantic models and type hints.

```python
from fastapi import FastAPI, HTTPException, Query, Path
from pydantic import BaseModel, EmailStr, Field
from typing import Generic, TypeVar, Optional
from datetime import datetime
from enum import Enum
import uuid

app = FastAPI(
    title="My API",
    version="1.0.0",
    description="Production-ready API documentation",
    contact={"name": "API Support", "email": "api@example.com"},
    license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
    servers=[
        {"url": "https://api.example.com", "description": "Production"},
        {"url": "https://staging-api.example.com", "description": "Staging"},
    ],
    openapi_tags=[
        {"name": "Users", "description": "User management endpoints"},
        {"name": "Auth", "description": "Authentication endpoints"},
    ],
)

class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class User(BaseModel):
    """User account information"""
    id: uuid.UUID = Field(description="Unique identifier", example="550e8400-e29b-41d4-a716-446655440000")
    email: EmailStr = Field(description="User's email address", example="user@example.com")
    name: Optional[str] = Field(None, description="Display name", example="John Doe", min_length=1, max_length=100)
    status: UserStatus = Field(description="Account status", example="active")
    created_at: datetime = Field(description="Account creation timestamp")

class CreateUserRequest(BaseModel):
    """Request to create a new user"""
    email: EmailStr = Field(description="Email address", example="user@example.com")
    name: Optional[str] = Field(None, description="Display name", example="John Doe")
    password: str = Field(description="Password", min_length=8, example="SecureP@ss123")

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper"""
    data: list[T]
    pagination: "PaginationMeta"

class PaginationMeta(BaseModel):
    page: int = Field(ge=1, example=1)
    limit: int = Field(ge=1, le=100, example=20)
    total: int = Field(ge=0, example=150)
    total_pages: int = Field(ge=0, example=8)

@app.get(
    "/users",
    response_model=PaginatedResponse[User],
    tags=["Users"],
    summary="List all users",
    description="Retrieve a paginated list of users with optional filtering.",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[UserStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, min_length=1, description="Search query"),
):
    pass

@app.get(
    "/users/{user_id}",
    response_model=User,
    tags=["Users"],
    summary="Get user by ID",
    description="Retrieve detailed information about a specific user.",
    responses={
        404: {"description": "User not found"},
    },
)
async def get_user(
    user_id: uuid.UUID = Path(description="User ID"),
):
    pass

@app.post(
    "/users",
    response_model=User,
    status_code=201,
    tags=["Users"],
    summary="Create a new user",
    description="Register a new user account with email and password.",
    responses={
        400: {"description": "Validation error"},
        409: {"description": "Email already exists"},
    },
)
async def create_user(request: CreateUserRequest):
    pass
```

## Node.js - tsoa

Type-safe OpenAPI generation with decorators.

```typescript
// npm install tsoa swagger-ui-express

// tsoa.json
{
  "entryFile": "src/index.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "controllerPathGlobs": ["src/**/*Controller.ts"],
  "spec": {
    "outputDirectory": "dist",
    "specVersion": 3
  }
}

// src/controllers/UsersController.ts
import {
  Controller,
  Get,
  Post,
  Route,
  Path,
  Query,
  Body,
  Tags,
  Security,
  Response,
  SuccessResponse,
} from 'tsoa';

interface User {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
}

interface CreateUserRequest {
  email: string;
  name?: string;
  password: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  /**
   * List all users
   * @summary Retrieve a paginated list of users
   */
  @Get()
  @Security('bearerAuth')
  public async listUsers(
    @Query() page: number = 1,
    @Query() limit: number = 20,
    @Query() status?: 'active' | 'inactive' | 'suspended',
    @Query() search?: string
  ): Promise<PaginatedResponse<User>> {
    // Implementation
  }

  /**
   * Get user by ID
   * @summary Retrieve detailed information about a specific user
   */
  @Get('{userId}')
  @Security('bearerAuth')
  @Response<{ message: string }>(404, 'User not found')
  public async getUser(@Path() userId: string): Promise<User> {
    // Implementation
  }

  /**
   * Create a new user
   * @summary Register a new user account
   */
  @Post()
  @Security('bearerAuth')
  @SuccessResponse(201, 'Created')
  @Response<{ message: string }>(400, 'Validation error')
  @Response<{ message: string }>(409, 'Email already exists')
  public async createUser(@Body() request: CreateUserRequest): Promise<User> {
    this.setStatus(201);
    // Implementation
  }
}
```

## Best Practices

### Documentation Quality
1. **Every endpoint needs**:
   - Summary (short, one line)
   - Description (detailed explanation)
   - All parameters documented
   - All response codes
   - Examples

2. **Schema documentation**:
   - Field descriptions
   - Examples for each field
   - Validation constraints
   - Format specifications

3. **Security documentation**:
   - Authentication requirements
   - Required scopes/permissions
   - Rate limit information
