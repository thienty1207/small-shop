# Encryption and Hashing Patterns

> Cryptographic patterns for password hashing, data encryption, and secure token generation.

## Password Hashing

### Algorithm Selection

| Algorithm | Use Case | Parameters |
|-----------|----------|------------|
| **Argon2id** | Passwords (recommended) | 64MB memory, 3 iterations, 2 parallelism |
| **bcrypt** | Passwords (legacy systems) | Cost factor 12+ |
| **scrypt** | Passwords (alternative) | N=2^14, r=8, p=1 |

### Rust - Argon2id

```rust
// Cargo.toml
// argon2 = "0.5"
// password-hash = "0.5"

use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Algorithm, Argon2, Params, Version,
};

pub struct PasswordService {
    argon2: Argon2<'static>,
}

impl Default for PasswordService {
    fn default() -> Self {
        // OWASP recommended parameters
        let params = Params::new(
            65536,  // 64 MB memory cost
            3,      // 3 iterations
            2,      // 2 parallelism
            Some(32), // 32 byte output
        ).unwrap();

        Self {
            argon2: Argon2::new(Algorithm::Argon2id, Version::V0x13, params),
        }
    }
}

impl PasswordService {
    pub fn hash(&self, password: &str) -> Result<String, argon2::password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        Ok(self.argon2.hash_password(password.as_bytes(), &salt)?.to_string())
    }

    pub fn verify(&self, password: &str, hash: &str) -> bool {
        let Ok(parsed_hash) = PasswordHash::new(hash) else {
            return false;
        };
        self.argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hash_verify() {
        let service = PasswordService::default();
        let password = "secure_password_123!";
        
        let hash = service.hash(password).unwrap();
        
        assert!(service.verify(password, &hash));
        assert!(!service.verify("wrong_password", &hash));
    }
}
```

### Go - Argon2id

```go
package crypto

import (
    "crypto/rand"
    "crypto/subtle"
    "encoding/base64"
    "errors"
    "fmt"
    "strings"

    "golang.org/x/crypto/argon2"
)

type PasswordConfig struct {
    Memory      uint32
    Iterations  uint32
    Parallelism uint8
    SaltLength  uint32
    KeyLength   uint32
}

var DefaultPasswordConfig = &PasswordConfig{
    Memory:      64 * 1024, // 64 MB
    Iterations:  3,
    Parallelism: 2,
    SaltLength:  16,
    KeyLength:   32,
}

func HashPassword(password string, config *PasswordConfig) (string, error) {
    if config == nil {
        config = DefaultPasswordConfig
    }

    salt := make([]byte, config.SaltLength)
    if _, err := rand.Read(salt); err != nil {
        return "", err
    }

    hash := argon2.IDKey(
        []byte(password),
        salt,
        config.Iterations,
        config.Memory,
        config.Parallelism,
        config.KeyLength,
    )

    // PHC format: $argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
    return fmt.Sprintf(
        "$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version,
        config.Memory,
        config.Iterations,
        config.Parallelism,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    ), nil
}

func VerifyPassword(password, encodedHash string) (bool, error) {
    config, salt, hash, err := decodeHash(encodedHash)
    if err != nil {
        return false, err
    }

    otherHash := argon2.IDKey(
        []byte(password),
        salt,
        config.Iterations,
        config.Memory,
        config.Parallelism,
        config.KeyLength,
    )

    return subtle.ConstantTimeCompare(hash, otherHash) == 1, nil
}

func decodeHash(encodedHash string) (*PasswordConfig, []byte, []byte, error) {
    parts := strings.Split(encodedHash, "$")
    if len(parts) != 6 {
        return nil, nil, nil, errors.New("invalid hash format")
    }

    var version int
    if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
        return nil, nil, nil, err
    }

    config := &PasswordConfig{}
    if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d",
        &config.Memory, &config.Iterations, &config.Parallelism); err != nil {
        return nil, nil, nil, err
    }

    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil {
        return nil, nil, nil, err
    }
    config.SaltLength = uint32(len(salt))

    hash, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil {
        return nil, nil, nil, err
    }
    config.KeyLength = uint32(len(hash))

    return config, salt, hash, nil
}
```

### Python - Argon2

```python
# pip install argon2-cffi

from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError

# Configure with OWASP recommendations
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    type=Type.ID,  # Argon2id
)

def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    try:
        ph.verify(hashed, password)
        return True
    except VerifyMismatchError:
        return False

def needs_rehash(hashed: str) -> bool:
    """Check if hash needs to be updated to current parameters."""
    return ph.check_needs_rehash(hashed)
```

### Node.js - Argon2

```typescript
// npm install argon2

import argon2 from 'argon2';

const hashOptions: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 2,
  hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, hashOptions);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function needsRehash(hash: string): Promise<boolean> {
  return argon2.needsRehash(hash, hashOptions);
}
```

## Symmetric Encryption (AES-256-GCM)

### Rust - AES-256-GCM

```rust
// Cargo.toml
// aes-gcm = "0.10"
// rand = "0.8"

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};

pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    pub fn new(key: &[u8; 32]) -> Self {
        let key = Key::<Aes256Gcm>::from_slice(key);
        Self {
            cipher: Aes256Gcm::new(key),
        }
    }

    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let key_hex = std::env::var("ENCRYPTION_KEY")?;
        let key_bytes = hex::decode(&key_hex)?;
        if key_bytes.len() != 32 {
            return Err("Key must be 32 bytes".into());
        }
        Ok(Self::new(key_bytes.as_slice().try_into().unwrap()))
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = self.cipher.encrypt(&nonce, plaintext)?;

        // Format: nonce (12 bytes) || ciphertext || tag (16 bytes included)
        let mut result = nonce.to_vec();
        result.extend(ciphertext);
        Ok(result)
    }

    pub fn encrypt_with_aad(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        use aes_gcm::aead::Payload;
        
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let payload = Payload { msg: plaintext, aad };
        let ciphertext = self.cipher.encrypt(&nonce, payload)?;

        let mut result = nonce.to_vec();
        result.extend(ciphertext);
        Ok(result)
    }

    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        if ciphertext.len() < 12 {
            return Err(aes_gcm::Error);
        }

        let (nonce_bytes, encrypted) = ciphertext.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        self.cipher.decrypt(nonce, encrypted)
    }

    pub fn decrypt_with_aad(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        use aes_gcm::aead::Payload;
        
        if ciphertext.len() < 12 {
            return Err(aes_gcm::Error);
        }

        let (nonce_bytes, encrypted) = ciphertext.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let payload = Payload { msg: encrypted, aad };

        self.cipher.decrypt(nonce, payload)
    }
}

// Generate a secure encryption key
pub fn generate_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}
```

### Go - AES-256-GCM

```go
package crypto

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "errors"
    "io"
)

type EncryptionService struct {
    gcm cipher.AEAD
}

func NewEncryptionService(key []byte) (*EncryptionService, error) {
    if len(key) != 32 {
        return nil, errors.New("key must be 32 bytes for AES-256")
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    return &EncryptionService{gcm: gcm}, nil
}

func (e *EncryptionService) Encrypt(plaintext []byte) ([]byte, error) {
    nonce := make([]byte, e.gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }

    // Nonce is prepended to the ciphertext
    return e.gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func (e *EncryptionService) EncryptWithAAD(plaintext, aad []byte) ([]byte, error) {
    nonce := make([]byte, e.gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }

    return e.gcm.Seal(nonce, nonce, plaintext, aad), nil
}

func (e *EncryptionService) Decrypt(ciphertext []byte) ([]byte, error) {
    nonceSize := e.gcm.NonceSize()
    if len(ciphertext) < nonceSize {
        return nil, errors.New("ciphertext too short")
    }

    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
    return e.gcm.Open(nil, nonce, ciphertext, nil)
}

func GenerateKey() ([]byte, error) {
    key := make([]byte, 32)
    if _, err := rand.Read(key); err != nil {
        return nil, err
    }
    return key, nil
}
```

### Python - AES-256-GCM

```python
# pip install cryptography

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class EncryptionService:
    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("Key must be 32 bytes for AES-256")
        self.gcm = AESGCM(key)

    @classmethod
    def from_env(cls) -> "EncryptionService":
        key_hex = os.environ["ENCRYPTION_KEY"]
        key = bytes.fromhex(key_hex)
        return cls(key)

    def encrypt(self, plaintext: bytes, aad: bytes | None = None) -> bytes:
        """Encrypt plaintext with optional associated data."""
        nonce = os.urandom(12)  # 96 bits for GCM
        ciphertext = self.gcm.encrypt(nonce, plaintext, aad)
        return nonce + ciphertext

    def decrypt(self, ciphertext: bytes, aad: bytes | None = None) -> bytes:
        """Decrypt ciphertext with optional associated data."""
        if len(ciphertext) < 12:
            raise ValueError("Ciphertext too short")
        nonce, encrypted = ciphertext[:12], ciphertext[12:]
        return self.gcm.decrypt(nonce, encrypted, aad)


def generate_key() -> bytes:
    """Generate a cryptographically secure 256-bit key."""
    return os.urandom(32)
```

### Node.js - AES-256-GCM

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_SIZE = 12;
const TAG_SIZE = 16;

export class EncryptionService {
  private key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256');
    }
    this.key = key;
  }

  static fromEnv(): EncryptionService {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) throw new Error('ENCRYPTION_KEY not set');
    return new EncryptionService(Buffer.from(keyHex, 'hex'));
  }

  encrypt(plaintext: Buffer, aad?: Buffer): Buffer {
    const nonce = randomBytes(NONCE_SIZE);
    const cipher = createCipheriv(ALGORITHM, this.key, nonce);
    
    if (aad) cipher.setAAD(aad);
    
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: nonce || ciphertext || tag
    return Buffer.concat([nonce, encrypted, tag]);
  }

  decrypt(ciphertext: Buffer, aad?: Buffer): Buffer {
    if (ciphertext.length < NONCE_SIZE + TAG_SIZE) {
      throw new Error('Ciphertext too short');
    }

    const nonce = ciphertext.subarray(0, NONCE_SIZE);
    const tag = ciphertext.subarray(-TAG_SIZE);
    const encrypted = ciphertext.subarray(NONCE_SIZE, -TAG_SIZE);

    const decipher = createDecipheriv(ALGORITHM, this.key, nonce);
    decipher.setAuthTag(tag);
    if (aad) decipher.setAAD(aad);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

export function generateKey(): Buffer {
  return randomBytes(32);
}
```

## Secure Token Generation

### Cryptographically Secure Random Tokens

```rust
// Rust
use rand::{distributions::Alphanumeric, Rng};

pub fn generate_token(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

pub fn generate_bytes(length: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; length];
    rand::thread_rng().fill(&mut bytes[..]);
    bytes
}
```

```go
// Go
import (
    "crypto/rand"
    "encoding/base64"
)

func GenerateToken(length int) (string, error) {
    bytes := make([]byte, length)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}
```

```python
# Python
import secrets

def generate_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)

def generate_bytes(length: int = 32) -> bytes:
    return secrets.token_bytes(length)
```

```typescript
// Node.js
import { randomBytes } from 'crypto';

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}
```

## HMAC for Message Authentication

### Rust - HMAC-SHA256

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn sign(message: &[u8], secret: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(secret)
        .expect("HMAC can take key of any size");
    mac.update(message);
    mac.finalize().into_bytes().to_vec()
}

pub fn verify(message: &[u8], signature: &[u8], secret: &[u8]) -> bool {
    let mut mac = HmacSha256::new_from_slice(secret)
        .expect("HMAC can take key of any size");
    mac.update(message);
    mac.verify_slice(signature).is_ok()
}

// Webhook signature verification
pub fn verify_webhook_signature(
    payload: &[u8],
    signature_header: &str,
    secret: &[u8],
) -> bool {
    // Format: "sha256=<hex_signature>"
    let Some(hex_sig) = signature_header.strip_prefix("sha256=") else {
        return false;
    };
    
    let Ok(signature) = hex::decode(hex_sig) else {
        return false;
    };
    
    verify(payload, &signature, secret)
}
```

## Key Derivation (HKDF)

### Rust - HKDF

```rust
use hkdf::Hkdf;
use sha2::Sha256;

pub fn derive_key(
    secret: &[u8],
    salt: &[u8],
    info: &[u8],
    output_length: usize,
) -> Vec<u8> {
    let hk = Hkdf::<Sha256>::new(Some(salt), secret);
    let mut output = vec![0u8; output_length];
    hk.expand(info, &mut output).expect("output length is valid");
    output
}

// Derive multiple keys from a master key
pub struct DerivedKeys {
    pub encryption_key: [u8; 32],
    pub signing_key: [u8; 32],
}

pub fn derive_keys(master_key: &[u8], salt: &[u8]) -> DerivedKeys {
    let hk = Hkdf::<Sha256>::new(Some(salt), master_key);
    
    let mut encryption_key = [0u8; 32];
    let mut signing_key = [0u8; 32];
    
    hk.expand(b"encryption", &mut encryption_key).unwrap();
    hk.expand(b"signing", &mut signing_key).unwrap();
    
    DerivedKeys {
        encryption_key,
        signing_key,
    }
}
```

## Hashing (Non-Password)

### SHA-256 for Data Integrity

```rust
// Rust
use sha2::{Sha256, Digest};

pub fn hash_data(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

// Stream hashing for large files
pub fn hash_file(path: &std::path::Path) -> std::io::Result<String> {
    use std::io::Read;
    
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    
    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    Ok(hex::encode(hasher.finalize()))
}
```

```go
// Go
import (
    "crypto/sha256"
    "encoding/hex"
    "io"
    "os"
)

func HashData(data []byte) string {
    h := sha256.Sum256(data)
    return hex.EncodeToString(h[:])
}

func HashFile(path string) (string, error) {
    f, err := os.Open(path)
    if err != nil {
        return "", err
    }
    defer f.Close()

    h := sha256.New()
    if _, err := io.Copy(h, f); err != nil {
        return "", err
    }

    return hex.EncodeToString(h.Sum(nil)), nil
}
```

## Best Practices

### Key Management

1. **Never hardcode keys** - Use environment variables or secrets managers
2. **Key rotation** - Implement key versioning for graceful rotation
3. **Key length** - Use appropriate key sizes (AES-256 = 32 bytes)
4. **Secure storage** - Use HSM, Vault, or cloud KMS for production

### Password Hashing

1. **Use Argon2id** - Preferred algorithm for new applications
2. **Configure properly** - Follow OWASP memory/time recommendations
3. **Plan for rehashing** - Check if hashes need updating on login
4. **Never log passwords** - Even hashed versions

### Encryption

1. **Use authenticated encryption** - AES-GCM, ChaCha20-Poly1305
2. **Never reuse nonces** - Always generate random nonces
3. **Use AAD when possible** - Bind ciphertext to context
4. **Encrypt-then-MAC** - If not using AEAD

### General

1. **Use constant-time comparison** - Prevent timing attacks
2. **Secure random generation** - Use OS-provided CSPRNG
3. **Clear sensitive data** - Zero memory after use where possible
4. **Audit libraries** - Keep dependencies updated
