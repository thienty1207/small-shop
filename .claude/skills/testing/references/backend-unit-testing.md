# Backend Unit Testing

Unit testing patterns for backend services across Rust, Go, Python, and Node.js.

## Core Principles (Language-Agnostic)

1. **Test one thing** — Each test verifies a single behavior
2. **Fast execution** — Unit tests should run in milliseconds
3. **No external dependencies** — Mock databases, APIs, file systems
4. **Deterministic** — Same input always produces same output
5. **Self-documenting** — Test names describe expected behavior

## Test Structure: Arrange-Act-Assert

```
Arrange: Set up test data and dependencies
Act:     Execute the function under test
Assert:  Verify the expected outcome
```

---

## Rust (cargo test) 🦀

### Basic Unit Test
```rust
// src/domain/user.rs
pub struct User {
    pub id: uuid::Uuid,
    pub email: String,
    pub name: String,
}

impl User {
    pub fn new(email: &str, name: &str) -> Result<Self, ValidationError> {
        if !email.contains('@') {
            return Err(ValidationError::InvalidEmail);
        }
        Ok(Self {
            id: uuid::Uuid::new_v4(),
            email: email.to_string(),
            name: name.to_string(),
        })
    }
    
    pub fn display_name(&self) -> String {
        format!("{} <{}>", self.name, self.email)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation_valid_email() {
        let user = User::new("test@example.com", "John").unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.name, "John");
    }

    #[test]
    fn test_user_creation_invalid_email() {
        let result = User::new("invalid-email", "John");
        assert!(matches!(result, Err(ValidationError::InvalidEmail)));
    }

    #[test]
    fn test_display_name_format() {
        let user = User::new("test@example.com", "John").unwrap();
        assert_eq!(user.display_name(), "John <test@example.com>");
    }
}
```

### Mocking with mockall
```rust
// Cargo.toml: mockall = "0.12"
use mockall::{automock, predicate::*};

#[automock]
pub trait UserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DbError>;
    async fn save(&self, user: &User) -> Result<(), DbError>;
}

pub struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    pub async fn get_user(&self, id: Uuid) -> Result<User, ServiceError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or(ServiceError::NotFound)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_user_found() {
        let mut mock_repo = MockUserRepository::new();
        let user_id = Uuid::new_v4();
        let expected_user = User {
            id: user_id,
            email: "test@example.com".to_string(),
            name: "John".to_string(),
        };
        
        mock_repo
            .expect_find_by_id()
            .with(eq(user_id))
            .times(1)
            .returning(move |_| Ok(Some(expected_user.clone())));
        
        let service = UserService { repo: mock_repo };
        let result = service.get_user(user_id).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().email, "test@example.com");
    }

    #[tokio::test]
    async fn test_get_user_not_found() {
        let mut mock_repo = MockUserRepository::new();
        
        mock_repo
            .expect_find_by_id()
            .returning(|_| Ok(None));
        
        let service = UserService { repo: mock_repo };
        let result = service.get_user(Uuid::new_v4()).await;
        
        assert!(matches!(result, Err(ServiceError::NotFound)));
    }
}
```

### Test Organization
```
src/
├── lib.rs
├── domain/
│   ├── mod.rs
│   └── user.rs        # Unit tests in same file (#[cfg(test)])
├── services/
│   └── user_service.rs
tests/                  # Integration tests
├── api_tests.rs
└── db_tests.rs
```

### Running Tests
```bash
cargo test                          # All tests
cargo test user                     # Tests matching "user"
cargo test --lib                    # Only unit tests
cargo test --test integration       # Only integration tests
cargo test -- --nocapture           # Show println! output
cargo test -- --test-threads=1      # Sequential execution
```

---

## Go (testing package) 🐹

### Basic Unit Test
```go
// user/user.go
package user

import (
    "errors"
    "strings"
    
    "github.com/google/uuid"
)

type User struct {
    ID    uuid.UUID
    Email string
    Name  string
}

var ErrInvalidEmail = errors.New("invalid email")

func NewUser(email, name string) (*User, error) {
    if !strings.Contains(email, "@") {
        return nil, ErrInvalidEmail
    }
    return &User{
        ID:    uuid.New(),
        Email: email,
        Name:  name,
    }, nil
}

func (u *User) DisplayName() string {
    return u.Name + " <" + u.Email + ">"
}
```

```go
// user/user_test.go
package user

import (
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestNewUser_ValidEmail(t *testing.T) {
    user, err := NewUser("test@example.com", "John")
    
    require.NoError(t, err)
    assert.Equal(t, "test@example.com", user.Email)
    assert.Equal(t, "John", user.Name)
}

func TestNewUser_InvalidEmail(t *testing.T) {
    user, err := NewUser("invalid-email", "John")
    
    assert.Nil(t, user)
    assert.ErrorIs(t, err, ErrInvalidEmail)
}

func TestUser_DisplayName(t *testing.T) {
    user, _ := NewUser("test@example.com", "John")
    
    assert.Equal(t, "John <test@example.com>", user.DisplayName())
}

// Table-driven tests
func TestNewUser_Validation(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr error
    }{
        {"valid email", "test@example.com", nil},
        {"missing @", "invalid", ErrInvalidEmail},
        {"empty email", "", ErrInvalidEmail},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := NewUser(tt.email, "Test")
            if tt.wantErr != nil {
                assert.ErrorIs(t, err, tt.wantErr)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Mocking with testify/mock
```go
// repository/user_repository.go
type UserRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*User, error)
    Save(ctx context.Context, user *User) error
}

// repository/mock_user_repository.go
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

// service/user_service_test.go
func TestUserService_GetUser(t *testing.T) {
    mockRepo := new(MockUserRepository)
    userID := uuid.New()
    expectedUser := &User{ID: userID, Email: "test@example.com"}
    
    mockRepo.On("FindByID", mock.Anything, userID).Return(expectedUser, nil)
    
    service := NewUserService(mockRepo)
    user, err := service.GetUser(context.Background(), userID)
    
    require.NoError(t, err)
    assert.Equal(t, expectedUser, user)
    mockRepo.AssertExpectations(t)
}
```

### Running Tests
```bash
go test ./...                       # All tests
go test ./user/...                  # Package tests
go test -v ./...                    # Verbose
go test -race ./...                 # Race detection
go test -cover ./...                # Coverage
go test -coverprofile=coverage.out && go tool cover -html=coverage.out
```

---

## Python (pytest) 🐍

### Basic Unit Test
```python
# domain/user.py
from dataclasses import dataclass
from uuid import UUID, uuid4

class ValidationError(Exception):
    pass

@dataclass
class User:
    id: UUID
    email: str
    name: str
    
    @classmethod
    def create(cls, email: str, name: str) -> "User":
        if "@" not in email:
            raise ValidationError("Invalid email")
        return cls(id=uuid4(), email=email, name=name)
    
    def display_name(self) -> str:
        return f"{self.name} <{self.email}>"
```

```python
# tests/test_user.py
import pytest
from domain.user import User, ValidationError

class TestUser:
    def test_create_valid_email(self):
        user = User.create("test@example.com", "John")
        
        assert user.email == "test@example.com"
        assert user.name == "John"
    
    def test_create_invalid_email(self):
        with pytest.raises(ValidationError, match="Invalid email"):
            User.create("invalid-email", "John")
    
    def test_display_name(self):
        user = User.create("test@example.com", "John")
        
        assert user.display_name() == "John <test@example.com>"

# Parametrized tests
@pytest.mark.parametrize("email,should_raise", [
    ("test@example.com", False),
    ("invalid", True),
    ("", True),
])
def test_email_validation(email, should_raise):
    if should_raise:
        with pytest.raises(ValidationError):
            User.create(email, "Test")
    else:
        user = User.create(email, "Test")
        assert user.email == email
```

### Mocking with pytest-mock
```python
# services/user_service.py
from typing import Protocol
from uuid import UUID

class UserRepository(Protocol):
    async def find_by_id(self, id: UUID) -> User | None: ...
    async def save(self, user: User) -> None: ...

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo
    
    async def get_user(self, id: UUID) -> User:
        user = await self.repo.find_by_id(id)
        if not user:
            raise NotFoundError("User not found")
        return user
```

```python
# tests/test_user_service.py
import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

@pytest.fixture
def mock_repo():
    return AsyncMock()

@pytest.fixture
def user_service(mock_repo):
    return UserService(mock_repo)

@pytest.mark.asyncio
async def test_get_user_found(user_service, mock_repo):
    user_id = uuid4()
    expected_user = User(id=user_id, email="test@example.com", name="John")
    mock_repo.find_by_id.return_value = expected_user
    
    result = await user_service.get_user(user_id)
    
    assert result == expected_user
    mock_repo.find_by_id.assert_called_once_with(user_id)

@pytest.mark.asyncio
async def test_get_user_not_found(user_service, mock_repo):
    mock_repo.find_by_id.return_value = None
    
    with pytest.raises(NotFoundError):
        await user_service.get_user(uuid4())
```

### Running Tests
```bash
pytest                              # All tests
pytest tests/test_user.py           # Specific file
pytest -v                           # Verbose
pytest -x                           # Stop on first failure
pytest --cov=src                    # Coverage
pytest -k "test_create"             # Pattern matching
```

---

## Node.js (Vitest/Jest) 📦

### Basic Unit Test
```typescript
// src/domain/user.ts
import { v4 as uuidv4 } from 'uuid';

export class ValidationError extends Error {}

export interface User {
  id: string;
  email: string;
  name: string;
}

export function createUser(email: string, name: string): User {
  if (!email.includes('@')) {
    throw new ValidationError('Invalid email');
  }
  return {
    id: uuidv4(),
    email,
    name,
  };
}

export function displayName(user: User): string {
  return `${user.name} <${user.email}>`;
}
```

```typescript
// src/domain/user.test.ts
import { describe, it, expect } from 'vitest';
import { createUser, displayName, ValidationError } from './user';

describe('User', () => {
  describe('createUser', () => {
    it('creates user with valid email', () => {
      const user = createUser('test@example.com', 'John');
      
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('John');
      expect(user.id).toBeDefined();
    });

    it('throws on invalid email', () => {
      expect(() => createUser('invalid-email', 'John'))
        .toThrow(ValidationError);
    });
  });

  describe('displayName', () => {
    it('formats name and email', () => {
      const user = createUser('test@example.com', 'John');
      
      expect(displayName(user)).toBe('John <test@example.com>');
    });
  });
});

// Parametrized tests
describe.each([
  ['test@example.com', false],
  ['invalid', true],
  ['', true],
])('email validation: %s', (email, shouldThrow) => {
  it(`${shouldThrow ? 'throws' : 'succeeds'}`, () => {
    if (shouldThrow) {
      expect(() => createUser(email, 'Test')).toThrow();
    } else {
      const user = createUser(email, 'Test');
      expect(user.email).toBe(email);
    }
  });
});
```

### Mocking
```typescript
// src/services/user-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user-service';

describe('UserService', () => {
  const mockRepo = {
    findById: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when found', async () => {
    const expectedUser = { id: '123', email: 'test@example.com', name: 'John' };
    mockRepo.findById.mockResolvedValue(expectedUser);
    
    const service = new UserService(mockRepo);
    const result = await service.getUser('123');
    
    expect(result).toEqual(expectedUser);
    expect(mockRepo.findById).toHaveBeenCalledWith('123');
  });

  it('throws when user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    
    const service = new UserService(mockRepo);
    
    await expect(service.getUser('123')).rejects.toThrow('User not found');
  });
});
```

### Running Tests
```bash
npx vitest                          # Watch mode
npx vitest run                      # Single run
npx vitest run --coverage           # With coverage
npx vitest run user                 # Pattern matching
```

---

## Best Practices

### 1. Test Naming Convention
```
test_[unit]_[scenario]_[expected_result]

Examples:
- test_user_creation_with_valid_email_succeeds
- test_order_total_with_discount_calculates_correctly
- test_login_with_invalid_password_returns_error
```

### 2. Coverage Targets
| Type | Target | Reality Check |
|------|--------|---------------|
| Unit tests | 80%+ | Focus on business logic |
| Critical paths | 100% | Auth, payments, data integrity |
| Edge cases | High | Null, empty, boundary values |

### 3. What NOT to Unit Test
- External API calls (mock them)
- Database queries (integration tests)
- Third-party libraries
- Private methods directly
- Trivial getters/setters

### 4. Test Data
```
✅ Use factories/builders for test data
✅ Generate unique IDs per test
✅ Use realistic but fake data
❌ Don't share mutable state between tests
❌ Don't use production data
```
