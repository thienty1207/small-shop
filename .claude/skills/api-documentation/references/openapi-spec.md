# OpenAPI Specification Patterns

> OpenAPI 3.1 specification structure, schemas, and best practices.

## OpenAPI 3.1 Structure

```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: |
    # Introduction
    This API provides access to...
    
    ## Authentication
    All endpoints require Bearer token authentication.
  contact:
    name: API Support
    email: api@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging
  - url: http://localhost:8080/v1
    description: Development

tags:
  - name: users
    description: User management operations
  - name: orders
    description: Order operations

security:
  - bearerAuth: []

paths:
  /users:
    get:
      # ... endpoints
      
components:
  schemas:
    # ... data models
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Path Definitions

### CRUD Operations

```yaml
paths:
  /users:
    get:
      operationId: listUsers
      summary: List all users
      description: Retrieve a paginated list of users
      tags:
        - users
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, pending]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
    
    post:
      operationId: createUser
      summary: Create a new user
      tags:
        - users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            examples:
              basic:
                summary: Basic user
                value:
                  email: user@example.com
                  name: John Doe
              withRole:
                summary: User with role
                value:
                  email: admin@example.com
                  name: Admin User
                  role: admin
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/ValidationError'
        '409':
          description: Email already exists

  /users/{userId}:
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Unique user identifier
    
    get:
      operationId: getUser
      summary: Get user by ID
      tags:
        - users
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'
    
    put:
      operationId: updateUser
      summary: Update user
      tags:
        - users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    
    delete:
      operationId: deleteUser
      summary: Delete user
      tags:
        - users
      responses:
        '204':
          description: User deleted
        '404':
          $ref: '#/components/responses/NotFound'
```

## Schema Definitions

### Basic Types

```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
          example: "550e8400-e29b-41d4-a716-446655440000"
        email:
          type: string
          format: email
          example: "user@example.com"
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: "John Doe"
        role:
          type: string
          enum: [user, admin, moderator]
          default: user
        avatar:
          type: string
          format: uri
          nullable: true
        metadata:
          type: object
          additionalProperties: true
        createdAt:
          type: string
          format: date-time
          readOnly: true
        updatedAt:
          type: string
          format: date-time
          readOnly: true

    CreateUserRequest:
      type: object
      required:
        - email
      properties:
        email:
          type: string
          format: email
        name:
          type: string
        password:
          type: string
          format: password
          minLength: 8
          writeOnly: true
        role:
          type: string
          enum: [user, admin]

    UpdateUserRequest:
      type: object
      properties:
        name:
          type: string
        avatar:
          type: string
          format: uri
```

### Composition Patterns

```yaml
components:
  schemas:
    # Inheritance with allOf
    AdminUser:
      allOf:
        - $ref: '#/components/schemas/User'
        - type: object
          properties:
            permissions:
              type: array
              items:
                type: string
            lastLogin:
              type: string
              format: date-time

    # Union types with oneOf
    Notification:
      oneOf:
        - $ref: '#/components/schemas/EmailNotification'
        - $ref: '#/components/schemas/PushNotification'
        - $ref: '#/components/schemas/SMSNotification'
      discriminator:
        propertyName: type
        mapping:
          email: '#/components/schemas/EmailNotification'
          push: '#/components/schemas/PushNotification'
          sms: '#/components/schemas/SMSNotification'

    EmailNotification:
      type: object
      required:
        - type
        - recipient
        - subject
      properties:
        type:
          type: string
          const: email
        recipient:
          type: string
          format: email
        subject:
          type: string
        body:
          type: string

    # Partial types with anyOf
    SearchResult:
      anyOf:
        - $ref: '#/components/schemas/User'
        - $ref: '#/components/schemas/Order'
        - $ref: '#/components/schemas/Product'
```

### Pagination

```yaml
components:
  schemas:
    PaginatedResponse:
      type: object
      properties:
        data:
          type: array
          items: {}
        pagination:
          $ref: '#/components/schemas/PaginationMeta'

    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
          minimum: 1
          example: 1
        limit:
          type: integer
          minimum: 1
          maximum: 100
          example: 20
        total:
          type: integer
          minimum: 0
          example: 150
        totalPages:
          type: integer
          minimum: 0
          example: 8
        hasNext:
          type: boolean
        hasPrev:
          type: boolean

    UserListResponse:
      allOf:
        - $ref: '#/components/schemas/PaginatedResponse'
        - type: object
          properties:
            data:
              type: array
              items:
                $ref: '#/components/schemas/User'
```

## Parameters

### Reusable Parameters

```yaml
components:
  parameters:
    PageParam:
      name: page
      in: query
      required: false
      schema:
        type: integer
        minimum: 1
        default: 1
      description: Page number

    LimitParam:
      name: limit
      in: query
      required: false
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      description: Items per page

    SortParam:
      name: sort
      in: query
      required: false
      schema:
        type: string
        pattern: '^[a-zA-Z_]+:(asc|desc)$'
      example: 'createdAt:desc'
      description: Sort field and direction

    FilterParam:
      name: filter
      in: query
      required: false
      style: deepObject
      explode: true
      schema:
        type: object
        additionalProperties:
          type: string
      example:
        status: active
        role: admin
```

## Response Patterns

### Standard Responses

```yaml
components:
  responses:
    Success:
      description: Successful operation
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: true
              message:
                type: string

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: NOT_FOUND
            message: Resource not found

    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: UNAUTHORIZED
            message: Authentication required

    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationErrorResponse'

    RateLimited:
      description: Too many requests
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
        X-RateLimit-Reset:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  schemas:
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: ERROR_CODE
        message:
          type: string
          example: Human-readable error message
        details:
          type: object
          additionalProperties: true

    ValidationErrorResponse:
      type: object
      properties:
        code:
          type: string
          const: VALIDATION_ERROR
        message:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
              code:
                type: string
```

## Security Schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT Bearer token

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service authentication

    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          refreshUrl: https://auth.example.com/oauth/refresh
          scopes:
            read:users: Read user information
            write:users: Modify users
            admin: Full admin access

    openIdConnect:
      type: openIdConnect
      openIdConnectUrl: https://auth.example.com/.well-known/openid-configuration

# Apply globally
security:
  - bearerAuth: []

# Override per-endpoint
paths:
  /public/health:
    get:
      security: []  # No auth required
  /admin/users:
    get:
      security:
        - bearerAuth: []
        - oauth2: [admin]
```

## Webhooks (OpenAPI 3.1)

```yaml
webhooks:
  userCreated:
    post:
      operationId: userCreatedWebhook
      summary: User created event
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                event:
                  type: string
                  const: user.created
                timestamp:
                  type: string
                  format: date-time
                data:
                  $ref: '#/components/schemas/User'
      responses:
        '200':
          description: Webhook received
      security:
        - webhookSignature: []
```

## Best Practices

### Naming Conventions
- Use camelCase for property names
- Use plural nouns for collection endpoints (`/users`)
- Use nested paths for relationships (`/users/{id}/orders`)
- Use operationId that matches handler function names

### Documentation Quality
- Write descriptions for all endpoints and schemas
- Include examples for complex types
- Document error responses
- Add deprecation notices when removing features

### Validation
- Lint specs with `spectral` or `redocly`
- Test specs with mock servers
- Version control your OpenAPI specs
