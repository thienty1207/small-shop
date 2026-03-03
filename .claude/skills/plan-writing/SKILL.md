---
name: plan-writing
description: >
  Structured task planning and implementation breakdown. Create clear, actionable plans
  with dependencies, acceptance criteria, and verification steps. Framework-agnostic:
  works for any project type. Use before starting any non-trivial feature development.
---

# Plan Writing

Break down complex work into small, actionable tasks with clear verification criteria.

## When to Use

- Starting a new feature (multi-day work)
- Planning a refactoring effort
- Creating implementation proposals for team review
- Breaking down epics into stories/tasks
- Any work that touches 3+ files

## When NOT to Use

- Quick bug fixes (< 30 minutes)
- Single-file changes
- Well-understood, routine tasks

---

## Planning Framework

### Step 1: Understand Scope

```
BEFORE writing any plan:
├── What is the user/business goal?
├── What are the inputs and outputs?
├── What are the constraints?
│   ├── Time: deadline?
│   ├── Tech: must use specific stack?
│   ├── Compatibility: must not break existing?
│   └── Performance: latency/throughput targets?
├── Who are the stakeholders?
└── What does "done" look like?
```

### Step 2: Break Down Tasks

```
PRINCIPLES:
├── Each task = 1-4 hours of work (max)
├── Each task has clear verification
├── Tasks are ordered by dependency
├── No task depends on more than 2 others
└── First task should be achievable quickly (momentum!)
```

### Step 3: Write the Plan

```markdown
# [Feature Name] Implementation Plan

## Goal
[1-2 sentences: what and why]

## Tasks

### 1. [Task Name]
- **Files**: `path/to/file1.rs`, `path/to/file2.rs`
- **Changes**: [What specifically changes]
- **Verify**: [How to confirm it works]

### 2. [Task Name]
- **Depends on**: Task 1
- **Files**: `path/to/file3.rs`
- **Changes**: [What specifically changes]
- **Verify**: [How to confirm it works]

## Risks
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]
```

---

## Task Granularity Guide

### ✅ Good Task Size

```markdown
### Add user validation endpoint
- Files: src/handlers/users.rs, src/models/user.rs
- Changes: Add POST /api/users/validate that checks email uniqueness
- Verify: curl -X POST localhost:8080/api/users/validate -d '{"email":"test@test.com"}'
  → Returns 200 if available, 409 if taken
```

### ❌ Bad Task Size (Too Large)

```markdown
### Implement user management
- Build the entire user CRUD with auth, validation, and admin panel
```

### ❌ Bad Task Size (Too Small)

```markdown
### Add import statement
- Add `use serde::Serialize;` to user.rs
```

---

## Verification Strategies

### For Each Task

```
Types of verification:
├── Command: Run a specific CLI command
│   └── cargo test --test user_tests
├── API call: Make an HTTP request
│   └── curl localhost:8080/api/health → 200 OK
├── Build: Compilation succeeds
│   └── cargo build (no errors)
├── Visual: Check UI/output
│   └── Open http://localhost:3000/dashboard
└── Automated: Test passes
    └── pytest tests/test_users.py -v
```

### Verification Principles

```
✅ GOOD verification:
├── Specific and repeatable
├── Has expected output
├── Can be run by anyone
└── Catches regressions

❌ BAD verification:
├── "Check that it works"
├── "Manually verify"
├── "Should be fine"
└── No verification at all
```

---

## Multi-Stack Plan Examples

### Rust Feature Plan

```markdown
# Add Rate Limiting to API

## Goal
Prevent abuse by limiting requests per IP to 100/minute.

### 1. Add tower-governor dependency
- Files: Cargo.toml
- Changes: Add tower-governor = "0.4"
- Verify: cargo build succeeds

### 2. Create rate limiter middleware
- Files: src/middleware/rate_limit.rs
- Changes: GovernorLayer with 100 req/min per IP
- Verify: cargo test rate_limit

### 3. Apply to API routes
- Files: src/main.rs
- Changes: Add rate_limit layer to router
- Verify: Send 101 requests → 429 on 101st
```

### Go Feature Plan

```markdown
# Add Rate Limiting to API

### 1. Add rate limiter package
- Files: go.mod
- Changes: go get golang.org/x/time/rate
- Verify: go build ./...

### 2. Create middleware
- Files: internal/middleware/ratelimit.go
- Changes: Token bucket limiter, 100/min per IP
- Verify: go test ./internal/middleware/...

### 3. Apply to routes
- Files: cmd/server/main.go
- Changes: Wrap router with RateLimitMiddleware
- Verify: bombardier -c 200 -n 200 http://localhost:8080/api/users
```

### Python Feature Plan

```markdown
# Add Rate Limiting to API

### 1. Install slowapi
- Changes: pip install slowapi, add to requirements.txt
- Verify: python -c "import slowapi"

### 2. Configure limiter
- Files: app/middleware/rate_limit.py
- Changes: Limiter(key_func=get_remote_address), 100/minute
- Verify: pytest tests/test_rate_limit.py

### 3. Apply to FastAPI app
- Files: app/main.py
- Changes: app.state.limiter = limiter
- Verify: locust --headless -u 200 -r 50
```

---

## Risk Assessment Template

```
For each risk:
├── Impact: High/Medium/Low
├── Probability: High/Medium/Low
├── Mitigation: What you'll do to reduce it
└── Contingency: What if mitigation fails?

Common risks:
├── Breaking existing functionality
│   └── Mitigation: Write tests BEFORE changes
├── Performance degradation
│   └── Mitigation: Benchmark before/after
├── Scope creep
│   └── Mitigation: Strict task boundaries
└── Dependency issues
    └── Mitigation: Pin versions, audit
```

---

## Plan Review Checklist

- [ ] Goal is clear and measurable
- [ ] Tasks are small enough (1-4 hours each)
- [ ] Each task has verification criteria
- [ ] Dependencies are explicit
- [ ] Risks identified with mitigations
- [ ] No ambiguous language ("probably", "maybe", "should be fine")
- [ ] Files and changes are specific
- [ ] First task can start immediately

---

## Related Skills

- [architecture-decision-records](../architecture-decision-records/SKILL.md) — Decision documentation
- [backend-architect](../backend-architect/SKILL.md) — Architecture design
- [testing](../testing/SKILL.md) — Test strategies
- [code-review](../code-review/SKILL.md) — Review processes
