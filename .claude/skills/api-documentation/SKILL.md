# API Documentation

> OpenAPI/Swagger specifications, auto-generated documentation, and API versioning strategies.


## Metadata
- **Category:** documentation
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

This skill covers comprehensive API documentation patterns including OpenAPI/Swagger spec generation, interactive documentation, SDK generation, and versioning strategies. All patterns support multiple backend stacks.

### Documentation Approaches

| Approach | Description | Best For |
|----------|-------------|----------|
| **Code-First** | Generate OpenAPI from code annotations | Rapid development |
| **Spec-First** | Write OpenAPI spec, generate code | API contracts, large teams |
| **Hybrid** | Annotated code with spec validation | Balance of both |

### Stack Coverage

| Stack | Primary Tools |
|-------|--------------|
| **Rust/Axum** | utoipa, aide |
| **Go/Fiber** | swaggo/swag, go-swagger |
| **Python/FastAPI** | Built-in OpenAPI, Pydantic |
| **Node.js/Express** | swagger-jsdoc, tsoa |

## Reference Navigation

### Core Documentation
- [openapi-spec.md](references/openapi-spec.md) - OpenAPI 3.1 specification patterns
- [code-first-docs.md](references/code-first-docs.md) - Auto-generation from code
- [interactive-docs.md](references/interactive-docs.md) - Swagger UI, Redoc, Scalar

### Advanced Topics
- [api-versioning.md](references/api-versioning.md) - Versioning strategies
- [sdk-generation.md](references/sdk-generation.md) - Client SDK generation

## Quick Start

### Rust/Axum - utoipa

```rust
// Cargo.toml
// utoipa = { version = "4", features = ["axum_extras"] }
// utoipa-swagger-ui = { version = "6", features = ["axum"] }

use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use utoipa_swagger_ui::SwaggerUi;

#[derive(Serialize, ToSchema)]
pub struct User {
    #[schema(example = "123")]
    pub id: String,
    #[schema(example = "john@example.com")]
    pub email: String,
}

/// Get user by ID
#[utoipa::path(
    get,
    path = "/users/{id}",
    params(
        ("id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User found", body = User),
        (status = 404, description = "User not found")
    ),
    tag = "users"
)]
async fn get_user(Path(id): Path<String>) -> Json<User> {
    Json(User { id, email: "john@example.com".into() })
}

#[derive(OpenApi)]
#[openapi(
    paths(get_user),
    components(schemas(User)),
    tags(
        (name = "users", description = "User management")
    ),
    info(
        title = "My API",
        version = "1.0.0",
        description = "API documentation"
    )
)]
struct ApiDoc;

pub fn create_router() -> Router {
    Router::new()
        .route("/users/:id", get(get_user))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
}
```

### Python/FastAPI - Built-in

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="My API",
    version="1.0.0",
    description="API documentation",
    openapi_tags=[
        {"name": "users", "description": "User management"}
    ]
)

class User(BaseModel):
    id: str = Field(example="123")
    email: str = Field(example="john@example.com")

@app.get(
    "/users/{user_id}",
    response_model=User,
    tags=["users"],
    summary="Get user by ID",
    responses={404: {"description": "User not found"}}
)
async def get_user(user_id: str):
    """
    Retrieve a user by their ID.
    
    - **user_id**: The unique identifier of the user
    """
    return User(id=user_id, email="john@example.com")

# Docs available at:
# - /docs (Swagger UI)
# - /redoc (ReDoc)
# - /openapi.json (OpenAPI spec)
```

### Go/Fiber - swaggo

```go
// Install: go install github.com/swaggo/swag/cmd/swag@latest
// Generate: swag init

// @title My API
// @version 1.0.0
// @description API documentation
// @BasePath /api/v1

package main

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/swagger"
    _ "myapp/docs" // Generated docs
)

type User struct {
    ID    string `json:"id" example:"123"`
    Email string `json:"email" example:"john@example.com"`
}

// GetUser godoc
// @Summary Get user by ID
// @Description Retrieve a user by their unique identifier
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} User
// @Failure 404 {object} ErrorResponse
// @Router /users/{id} [get]
func GetUser(c *fiber.Ctx) error {
    id := c.Params("id")
    return c.JSON(User{ID: id, Email: "john@example.com"})
}

func main() {
    app := fiber.New()
    
    app.Get("/swagger/*", swagger.HandlerDefault)
    app.Get("/users/:id", GetUser)
    
    app.Listen(":8080")
}
```

### Node.js/Express - swagger-jsdoc

```typescript
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API documentation',
    },
  },
  apis: ['./routes/*.ts'],
};

const specs = swaggerJsdoc(options);

const app = express();
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, email: 'john@example.com' });
});
```

## Documentation Checklist

### Essential
- [ ] All endpoints documented with descriptions
- [ ] Request/response schemas defined
- [ ] Authentication requirements specified
- [ ] Error responses documented
- [ ] Examples provided for complex types

### Enhanced
- [ ] API versioning clearly documented
- [ ] Rate limits documented
- [ ] Deprecation notices included
- [ ] Changelog maintained
- [ ] SDK generation configured

## Related Skills

- [security](../security/SKILL.md) - API security documentation
- [testing](../testing/SKILL.md) - API testing from docs
- [devops](../devops/SKILL.md) - CI/CD doc generation

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Swagger Tools](https://swagger.io/tools/)
- [Redoc](https://github.com/Redocly/redoc)
- [Scalar](https://github.com/scalar/scalar)
