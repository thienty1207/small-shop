# Secrets Management

> Secure handling of API keys, database credentials, and encryption keys.

## Environment Variables

### Never Commit Secrets

```bash
# .gitignore
.env
.env.*
!.env.example
*.pem
*.key
secrets/
```

### Environment File Structure

```bash
# .env.example (committed - template only)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
ENCRYPTION_KEY=your-32-byte-hex-key

# .env.local (never committed)
DATABASE_URL=postgresql://prod_user:actual_password@db.example.com:5432/production
JWT_SECRET=actual-jwt-secret-min-32-chars
```

### Loading Environment Variables

```rust
// Rust - dotenvy
use dotenvy::dotenv;

fn main() {
    // Load .env in development only
    #[cfg(debug_assertions)]
    dotenv().ok();
    
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
}

// Typed config with validation
use config::{Config, Environment};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_port() -> u16 { 8080 }

impl AppConfig {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        Config::builder()
            .add_source(Environment::default().separator("__"))
            .build()?
            .try_deserialize()
    }
}
```

```go
// Go - godotenv + envconfig
import (
    "github.com/joho/godotenv"
    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
    RedisURL    string `envconfig:"REDIS_URL" required:"true"`
    JWTSecret   string `envconfig:"JWT_SECRET" required:"true"`
    Port        int    `envconfig:"PORT" default:"8080"`
}

func LoadConfig() (*Config, error) {
    // Load .env in development
    _ = godotenv.Load()
    
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

```python
# Python - pydantic-settings
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    jwt_secret: str
    port: int = 8080
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

```typescript
// Node.js - zod validation
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(8080),
});

export const env = envSchema.parse(process.env);
```

## HashiCorp Vault Integration

### Rust - Vault Client

```rust
// Cargo.toml: vaultrs = "0.7"

use vaultrs::client::{VaultClient, VaultClientSettingsBuilder};
use vaultrs::kv2;

pub struct VaultService {
    client: VaultClient,
}

impl VaultService {
    pub async fn new(addr: &str, token: &str) -> Result<Self, vaultrs::error::ClientError> {
        let client = VaultClient::new(
            VaultClientSettingsBuilder::default()
                .address(addr)
                .token(token)
                .build()?
        )?;
        
        Ok(Self { client })
    }
    
    pub async fn get_secret(&self, path: &str, key: &str) -> Result<String, VaultError> {
        let secret: std::collections::HashMap<String, String> = 
            kv2::read(&self.client, "secret", path).await?;
        
        secret.get(key)
            .cloned()
            .ok_or(VaultError::KeyNotFound)
    }
    
    pub async fn get_database_credentials(&self) -> Result<DatabaseCreds, VaultError> {
        // Dynamic database credentials
        let creds = vaultrs::database::generate_credentials(
            &self.client, 
            "database", 
            "readonly-role"
        ).await?;
        
        Ok(DatabaseCreds {
            username: creds.username,
            password: creds.password,
            ttl: creds.lease_duration,
        })
    }
}

// Kubernetes auth for pods
impl VaultService {
    pub async fn from_kubernetes(addr: &str) -> Result<Self, VaultError> {
        let jwt = std::fs::read_to_string(
            "/var/run/secrets/kubernetes.io/serviceaccount/token"
        )?;
        
        let client = VaultClient::new(
            VaultClientSettingsBuilder::default()
                .address(addr)
                .build()?
        )?;
        
        // Login with Kubernetes service account
        let auth = vaultrs::auth::kubernetes::login(
            &client,
            "kubernetes",
            "my-role",
            &jwt,
        ).await?;
        
        Ok(Self { 
            client: VaultClient::new(
                VaultClientSettingsBuilder::default()
                    .address(addr)
                    .token(&auth.client_token)
                    .build()?
            )?
        })
    }
}
```

### Go - Vault Client

```go
import (
    "context"
    vault "github.com/hashicorp/vault/api"
)

type VaultService struct {
    client *vault.Client
}

func NewVaultService(addr, token string) (*VaultService, error) {
    config := vault.DefaultConfig()
    config.Address = addr
    
    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }
    
    client.SetToken(token)
    
    return &VaultService{client: client}, nil
}

func (v *VaultService) GetSecret(path, key string) (string, error) {
    secret, err := v.client.KVv2("secret").Get(context.Background(), path)
    if err != nil {
        return "", err
    }
    
    value, ok := secret.Data[key].(string)
    if !ok {
        return "", fmt.Errorf("key %s not found", key)
    }
    
    return value, nil
}

// Kubernetes auth
func NewVaultServiceFromKubernetes(addr string) (*VaultService, error) {
    jwt, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        return nil, err
    }
    
    config := vault.DefaultConfig()
    config.Address = addr
    
    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }
    
    // Login with Kubernetes
    resp, err := client.Logical().Write("auth/kubernetes/login", map[string]interface{}{
        "role": "my-role",
        "jwt":  string(jwt),
    })
    if err != nil {
        return nil, err
    }
    
    client.SetToken(resp.Auth.ClientToken)
    
    return &VaultService{client: client}, nil
}
```

## AWS Secrets Manager

### Rust - AWS SDK

```rust
use aws_sdk_secretsmanager::Client;

pub struct SecretsManager {
    client: Client,
}

impl SecretsManager {
    pub async fn new() -> Self {
        let config = aws_config::load_from_env().await;
        let client = Client::new(&config);
        Self { client }
    }
    
    pub async fn get_secret(&self, secret_id: &str) -> Result<String, aws_sdk_secretsmanager::Error> {
        let response = self.client
            .get_secret_value()
            .secret_id(secret_id)
            .send()
            .await?;
        
        Ok(response.secret_string().unwrap_or_default().to_string())
    }
    
    pub async fn get_json_secret<T: serde::de::DeserializeOwned>(
        &self, 
        secret_id: &str
    ) -> Result<T, Box<dyn std::error::Error>> {
        let secret = self.get_secret(secret_id).await?;
        Ok(serde_json::from_str(&secret)?)
    }
}

// Usage
#[derive(Deserialize)]
struct DbCredentials {
    username: String,
    password: String,
    host: String,
    port: u16,
}

let sm = SecretsManager::new().await;
let creds: DbCredentials = sm.get_json_secret("prod/database").await?;
```

### Python - boto3

```python
import json
import boto3
from functools import lru_cache

class SecretsManager:
    def __init__(self):
        self.client = boto3.client('secretsmanager')
    
    @lru_cache(maxsize=100)
    def get_secret(self, secret_id: str) -> str:
        response = self.client.get_secret_value(SecretId=secret_id)
        return response['SecretString']
    
    def get_json_secret(self, secret_id: str) -> dict:
        return json.loads(self.get_secret(secret_id))

# Usage
sm = SecretsManager()
db_creds = sm.get_json_secret("prod/database")
```

## Kubernetes Secrets

### Creating Secrets

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@db:5432/app"
  JWT_SECRET: "your-jwt-secret"
```

```bash
# From literal values
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...'

# From file
kubectl create secret generic tls-certs \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key
```

### Using Secrets in Pods

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          image: api:latest
          # As environment variables
          envFrom:
            - secretRef:
                name: app-secrets
          # Or individual keys
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DATABASE_URL
          # As mounted files
          volumeMounts:
            - name: secrets
              mountPath: /etc/secrets
              readOnly: true
      volumes:
        - name: secrets
          secret:
            secretName: app-secrets
```

### External Secrets Operator

```yaml
# Sync from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: prod/database
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: prod/auth
        property: jwt_secret
```

## Secret Rotation

### Rust - Automatic Rotation

```rust
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::Duration;

pub struct RotatingSecret {
    current: Arc<RwLock<String>>,
    fetch_fn: Box<dyn Fn() -> Pin<Box<dyn Future<Output = String> + Send>> + Send + Sync>,
}

impl RotatingSecret {
    pub async fn new<F, Fut>(fetch_fn: F, rotation_interval: Duration) -> Self 
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: Future<Output = String> + Send + 'static,
    {
        let initial = fetch_fn().await;
        let current = Arc::new(RwLock::new(initial));
        
        let current_clone = current.clone();
        let fetch_fn = Arc::new(fetch_fn);
        let fetch_fn_clone = fetch_fn.clone();
        
        // Background rotation task
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(rotation_interval);
            loop {
                interval.tick().await;
                let new_secret = fetch_fn_clone().await;
                *current_clone.write().await = new_secret;
                tracing::info!("Secret rotated successfully");
            }
        });
        
        Self {
            current,
            fetch_fn: Box::new(move || Box::pin(fetch_fn())),
        }
    }
    
    pub async fn get(&self) -> String {
        self.current.read().await.clone()
    }
}

// Usage
let db_password = RotatingSecret::new(
    || async { vault.get_secret("database", "password").await.unwrap() },
    Duration::from_secs(3600), // Rotate every hour
).await;
```

## Security Best Practices

### Do's

1. **Use dedicated secrets management** - Vault, AWS Secrets Manager, etc.
2. **Rotate secrets regularly** - Automate rotation where possible
3. **Use short-lived credentials** - Dynamic database credentials
4. **Audit secret access** - Log who accessed what secrets
5. **Encrypt secrets at rest** - Use encrypted storage
6. **Use least privilege** - Only grant access to needed secrets
7. **Version secrets** - Track changes to secrets

### Don'ts

1. **Never commit secrets** - Even in private repos
2. **Never log secrets** - Mask in logs
3. **Never hardcode secrets** - Use environment variables
4. **Never share secrets** - Each service has its own credentials
5. **Never use default secrets** - Change all defaults
6. **Never expose in error messages** - Sanitize errors

### Logging Safety

```rust
// Mask secrets in logs
pub fn mask_secret(secret: &str) -> String {
    if secret.len() <= 8 {
        "****".to_string()
    } else {
        format!("{}****{}", &secret[..4], &secret[secret.len()-4..])
    }
}

// Custom Debug that hides secrets
#[derive(Clone)]
pub struct Secret(String);

impl std::fmt::Debug for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Secret(****)")
    }
}

impl std::fmt::Display for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "****")
    }
}
```

### Secret Scanning in CI

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          
      - name: Gitleaks Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
