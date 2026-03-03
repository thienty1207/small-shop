# SDK Generation

> Generate client SDKs from OpenAPI specifications for multiple languages.

## OpenAPI Generator

The most popular tool for generating clients from OpenAPI specs.

### Installation

```bash
# npm (recommended)
npm install @openapitools/openapi-generator-cli -g

# Homebrew
brew install openapi-generator

# Docker
docker pull openapitools/openapi-generator-cli
```

### Basic Usage

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o ./sdk/typescript

# Generate Rust client
openapi-generator-cli generate \
  -i openapi.json \
  -g rust \
  -o ./sdk/rust

# Generate Python client
openapi-generator-cli generate \
  -i openapi.json \
  -g python \
  -o ./sdk/python

# Generate Go client
openapi-generator-cli generate \
  -i openapi.json \
  -g go \
  -o ./sdk/go
```

### Configuration File

```yaml
# openapitools.yaml
$schema: https://raw.githubusercontent.com/OpenAPITools/openapi-generator/master/modules/openapi-generator-cli/src/main/resources/schemas/config-schema.json
spaces: 2
generator-cli:
  version: 7.4.0
generators:
  typescript-client:
    generatorName: typescript-fetch
    output: ./sdk/typescript
    inputSpec: ./openapi.json
    additionalProperties:
      npmName: "@mycompany/api-client"
      npmVersion: "1.0.0"
      supportsES6: true
      typescriptThreePlus: true
  
  python-client:
    generatorName: python
    output: ./sdk/python
    inputSpec: ./openapi.json
    additionalProperties:
      packageName: mycompany_api
      packageVersion: "1.0.0"
      projectName: mycompany-api-client
```

```bash
# Generate all configured SDKs
openapi-generator-cli generate
```

### Generator Options

#### TypeScript (fetch)

```bash
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o ./sdk/typescript \
  --additional-properties=\
npmName=@mycompany/api-client,\
npmVersion=1.0.0,\
supportsES6=true,\
typescriptThreePlus=true,\
withInterfaces=true,\
useSingleRequestParameter=true
```

#### TypeScript (axios)

```bash
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./sdk/typescript \
  --additional-properties=\
npmName=@mycompany/api-client,\
withSeparateModelsAndApi=true,\
modelPackage=models,\
apiPackage=api
```

#### Python

```bash
openapi-generator-cli generate \
  -i openapi.json \
  -g python \
  -o ./sdk/python \
  --additional-properties=\
packageName=mycompany_api,\
packageVersion=1.0.0,\
generateSourceCodeOnly=true
```

#### Go

```bash
openapi-generator-cli generate \
  -i openapi.json \
  -g go \
  -o ./sdk/go \
  --additional-properties=\
packageName=mycompanyapi,\
isGoSubmodule=true,\
withGoMod=true
```

#### Rust

```bash
openapi-generator-cli generate \
  -i openapi.json \
  -g rust \
  -o ./sdk/rust \
  --additional-properties=\
packageName=mycompany-api,\
packageVersion=1.0.0,\
library=reqwest
```

## Orval (TypeScript-First)

Strongly typed TypeScript client generation with React Query support.

### Installation

```bash
npm install orval -D
```

### Configuration

```typescript
// orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './openapi.json',
    output: {
      target: './src/api/index.ts',
      client: 'react-query',
      mode: 'tags-split',
      mock: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/api/custom-fetch.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});
```

```bash
# Generate
npx orval
```

### Generated Usage (React Query)

```typescript
// Auto-generated hooks
import { useListUsers, useGetUser, useCreateUser } from './api';

function UserList() {
  const { data, isLoading } = useListUsers({
    page: 1,
    limit: 20,
    status: 'active',
  });

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {data?.data.map(user => (
        <li key={user.id}>{user.email}</li>
      ))}
    </ul>
  );
}

function CreateUserForm() {
  const mutation = useCreateUser();
  
  const handleSubmit = (data: CreateUserRequest) => {
    mutation.mutate({ data });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Custom Fetch Instance

```typescript
// src/api/custom-fetch.ts
import { getToken } from '../auth';

export const customFetch = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};
```

## oapi-codegen (Go)

Native Go client/server generation.

### Installation

```bash
go install github.com/deepmap/oapi-codegen/v2/cmd/oapi-codegen@latest
```

### Configuration

```yaml
# oapi-codegen.yaml
package: api
output: ./internal/api/api.gen.go
generate:
  models: true
  client: true
  embedded-spec: true
  strict-server: true
output-options:
  skip-prune: false
  include-tags:
    - users
    - orders
```

```bash
oapi-codegen --config oapi-codegen.yaml openapi.json
```

### Generated Client Usage

```go
package main

import (
    "context"
    "net/http"
    
    "mycompany/internal/api"
)

func main() {
    client, err := api.NewClientWithResponses(
        "https://api.example.com",
        api.WithRequestEditorFn(func(ctx context.Context, req *http.Request) error {
            req.Header.Set("Authorization", "Bearer "+token)
            return nil
        }),
    )
    if err != nil {
        panic(err)
    }

    // List users
    resp, err := client.ListUsersWithResponse(ctx, &api.ListUsersParams{
        Page:  ptr(1),
        Limit: ptr(20),
    })
    if err != nil {
        panic(err)
    }

    for _, user := range *resp.JSON200.Data {
        fmt.Println(user.Email)
    }
}
```

## progenitor (Rust)

Generates Rust clients from OpenAPI specs.

### Installation

```bash
cargo install progenitor
```

### Usage

```bash
progenitor generate \
  --input openapi.json \
  --output ./sdk \
  --name mycompany-api \
  --version 1.0.0
```

### Generated Client

```rust
use mycompany_api::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("https://api.example.com")
        .bearer_token("your-token");

    // List users
    let users = client
        .list_users()
        .page(1)
        .limit(20)
        .status(UserStatus::Active)
        .send()
        .await?;

    for user in users.data {
        println!("{}", user.email);
    }

    // Create user
    let new_user = client
        .create_user()
        .body(CreateUserRequest {
            email: "user@example.com".into(),
            name: Some("John".into()),
            password: "secret123".into(),
        })
        .send()
        .await?;

    Ok(())
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate SDKs

on:
  push:
    paths:
      - 'openapi.json'
      - '.github/workflows/generate-sdk.yml'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate TypeScript SDK
        uses: openapi-generators/openapitools-generator-action@v1
        with:
          generator: typescript-fetch
          openapi-file: openapi.json
          config-file: openapitools-typescript.yaml
          
      - name: Publish TypeScript SDK
        run: |
          cd sdk/typescript
          npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Version Sync

```yaml
# Sync SDK version with API version
name: Sync SDK Version

on:
  release:
    types: [published]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Update SDK versions
        run: |
          VERSION=${{ github.event.release.tag_name }}
          
          # Update TypeScript SDK
          cd sdk/typescript
          npm version $VERSION --no-git-tag-version
          
          # Update Python SDK
          cd ../python
          sed -i "s/version=.*/version=\"$VERSION\",/" setup.py
```

## Best Practices

### SDK Quality

1. **Include documentation**
   - README with installation and usage
   - API reference generated from OpenAPI
   - Code examples

2. **Type safety**
   - Strongly typed models
   - Enum validation
   - Null safety

3. **Error handling**
   - Typed error responses
   - Retry logic
   - Rate limit handling

### Distribution

| Language | Package Manager |
|----------|-----------------|
| TypeScript | npm, GitHub Packages |
| Python | PyPI, private PyPI |
| Go | Go modules, GitHub |
| Rust | crates.io |

### Versioning

- Match SDK version to API version
- Use semantic versioning
- Maintain changelog
- Support multiple API versions

### Testing

```typescript
// Test generated SDK against mock server
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { UsersApi } from './sdk';

const server = setupServer(
  http.get('/users', () => {
    return HttpResponse.json({
      data: [{ id: '1', email: 'test@example.com' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

test('list users', async () => {
  const api = new UsersApi();
  const response = await api.listUsers();
  expect(response.data).toHaveLength(1);
});
```
