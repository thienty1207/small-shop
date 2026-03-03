# Interactive Documentation

> Swagger UI, Redoc, Scalar, and other interactive documentation tools.

## Swagger UI

### Rust/Axum - utoipa-swagger-ui

```rust
use utoipa_swagger_ui::{SwaggerUi, Config};

// Basic setup
let app = Router::new()
    .merge(
        SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi())
    );

// With configuration
let swagger_config = Config::from("/api-docs/openapi.json")
    .doc_expansion("list")
    .deep_linking(true)
    .try_it_out_enabled(true)
    .filter(true)
    .display_request_duration(true)
    .persist_authorization(true)
    .with_credentials(true);

let app = Router::new()
    .merge(
        SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi())
            .config(swagger_config)
    );
```

### Go/Fiber - swagger middleware

```go
import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/swagger"
    _ "myapp/docs"
)

// Basic setup
app.Get("/swagger/*", swagger.HandlerDefault)

// With configuration
app.Get("/swagger/*", swagger.New(swagger.Config{
    URL:                  "/swagger/doc.json",
    DeepLinking:          true,
    DocExpansion:         "list",
    DefaultModelsExpandDepth: 3,
    PersistAuthorization: true,
}))
```

### Python/FastAPI - Built-in

```python
from fastapi import FastAPI

app = FastAPI(
    docs_url="/docs",           # Swagger UI
    redoc_url="/redoc",         # ReDoc
    openapi_url="/openapi.json" # OpenAPI spec
)

# Disable docs in production
import os

app = FastAPI(
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# Custom Swagger UI configuration
from fastapi.openapi.docs import get_swagger_ui_html

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="My API - Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_ui_parameters={
            "docExpansion": "list",
            "filter": True,
            "tryItOutEnabled": True,
            "persistAuthorization": True,
        }
    )
```

### Node.js/Express - swagger-ui-express

```typescript
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './openapi.json';

// Basic setup
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// With options
const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'My API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
  },
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Authentication for docs
app.use('/docs', 
  basicAuth({ users: { 'admin': 'secret' }, challenge: true }),
  swaggerUi.serve, 
  swaggerUi.setup(swaggerDocument)
);
```

## Scalar

Modern, beautiful API documentation UI.

### Rust/Axum - utoipa-scalar

```rust
use utoipa_scalar::{Scalar, Servable};

let app = Router::new()
    .merge(Scalar::with_url("/scalar", ApiDoc::openapi()));
```

### HTML Standalone

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script
    id="api-reference"
    data-url="/openapi.json"
    data-configuration='{
      "theme": "purple",
      "darkMode": true,
      "hiddenClients": ["unirest"],
      "authentication": {
        "preferredSecurityScheme": "bearerAuth"
      }
    }'>
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
```

### Node.js/Express

```typescript
import { apiReference } from '@scalar/express-api-reference';

app.use(
  '/scalar',
  apiReference({
    spec: {
      url: '/openapi.json',
    },
    theme: 'purple',
    darkMode: true,
  })
);
```

### Scalar Configuration Options

```typescript
const scalarConfig = {
  // Theme
  theme: 'purple' | 'blue' | 'orange' | 'green' | 'gray',
  darkMode: boolean,
  
  // Layout
  layout: 'modern' | 'classic',
  showSidebar: boolean,
  
  // Features
  searchHotKey: 'k',
  hiddenClients: ['unirest', 'c'],
  defaultHttpClient: {
    targetKey: 'javascript',
    clientKey: 'fetch',
  },
  
  // Authentication
  authentication: {
    preferredSecurityScheme: 'bearerAuth',
    apiKey: {
      token: 'your-api-key',
    },
  },
  
  // Metadata
  metaData: {
    title: 'My API',
    description: 'API documentation',
  },
};
```

## Redoc

Clean, three-panel documentation layout.

### HTML Standalone

```html
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url='/openapi.json'></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
```

### Redoc Configuration

```html
<redoc 
  spec-url='/openapi.json'
  expand-responses="200,201"
  hide-download-button
  hide-hostname
  native-scrollbars
  no-auto-auth
  path-in-middle-panel
  required-props-first
  scroll-y-offset="0"
  show-extensions
  sort-props-alphabetically
  untrusted-spec
  theme='{
    "colors": {
      "primary": { "main": "#6200ee" }
    },
    "typography": {
      "fontSize": "16px",
      "fontFamily": "Roboto, sans-serif"
    },
    "sidebar": {
      "backgroundColor": "#fafafa"
    }
  }'>
</redoc>
```

### Node.js/Express

```typescript
import redoc from 'redoc-express';

app.get('/redoc', redoc({
  title: 'My API',
  specUrl: '/openapi.json',
  redocOptions: {
    theme: {
      colors: {
        primary: { main: '#6200ee' },
      },
    },
  },
}));
```

## Stoplight Elements

React-based documentation components.

```jsx
import { API } from '@stoplight/elements';
import '@stoplight/elements/styles.min.css';

function ApiDocs() {
  return (
    <API
      apiDescriptionUrl="/openapi.json"
      router="hash"
      layout="sidebar"
      tryItCredentialsPolicy="same-origin"
      hideSchemas={false}
      hideTryIt={false}
      hideInternal={true}
    />
  );
}
```

## Multi-Spec Documentation

### Serving Multiple APIs

```rust
// Rust - Multiple OpenAPI specs
let app = Router::new()
    .merge(
        SwaggerUi::new("/docs/v1")
            .url("/api-docs/v1/openapi.json", ApiDocV1::openapi())
    )
    .merge(
        SwaggerUi::new("/docs/v2")
            .url("/api-docs/v2/openapi.json", ApiDocV2::openapi())
    );
```

```typescript
// Node.js - Multiple specs
import v1Spec from './specs/v1.json';
import v2Spec from './specs/v2.json';

app.use('/docs/v1', swaggerUi.serve, swaggerUi.setup(v1Spec));
app.use('/docs/v2', swaggerUi.serveFiles(v2Spec), swaggerUi.setup(v2Spec));
```

## Authentication in Docs

### Pre-configured Bearer Token

```typescript
// Swagger UI setup with pre-auth
const swaggerOptions = {
  swaggerOptions: {
    authAction: {
      bearerAuth: {
        name: 'bearerAuth',
        schema: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        value: process.env.DOCS_TEST_TOKEN,
      },
    },
    persistAuthorization: true,
  },
};
```

### OAuth2 PKCE Flow

```yaml
# OpenAPI spec
components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes:
            read: Read access
            write: Write access
```

```typescript
// Swagger UI OAuth config
const options = {
  swaggerOptions: {
    oauth2RedirectUrl: 'https://api.example.com/docs/oauth2-redirect.html',
    initOAuth: {
      clientId: 'your-client-id',
      usePkceWithAuthorizationCodeGrant: true,
    },
  },
};
```

## Comparison Table

| Feature | Swagger UI | Scalar | Redoc | Elements |
|---------|-----------|--------|-------|----------|
| Try It Out | ✅ | ✅ | ❌ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ |
| Code Samples | Limited | ✅ | ✅ | ✅ |
| Customization | Medium | High | High | High |
| React Support | ❌ | ✅ | ❌ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ |
| Mock Server | ❌ | ✅ | ❌ | ❌ |

## Best Practices

### Production Considerations

1. **Protect documentation**
   - Use authentication for internal APIs
   - Disable "Try It Out" in production if needed
   - Hide sensitive endpoint details

2. **Performance**
   - Cache OpenAPI spec
   - Use CDN for static assets
   - Consider generating static HTML

3. **Customization**
   - Add company branding
   - Include getting started guides
   - Add code examples in multiple languages

### Documentation URLs

| Environment | Documentation URL |
|-------------|-------------------|
| Development | http://localhost:8080/docs |
| Staging | https://staging-api.example.com/docs |
| Production | https://api.example.com/docs (protected) |
| Public | https://docs.example.com (static) |
