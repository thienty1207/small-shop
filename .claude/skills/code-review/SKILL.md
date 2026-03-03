---
name: code-review
description: Rigorous code review methodology — technical review protocols, evidence-based claims, verification gates, security review, performance review, architecture review. Use when reviewing code, requesting reviews, or establishing review processes.
license: MIT
---

# Code Review Mastery

Structured, evidence-based code review that catches bugs, improves quality, and shares knowledge.

## Core Principle

> **Every claim must be backed by evidence. Every status must be verified.**
> "It works" means nothing without proof. "Tests pass" means nothing without output.

## Review Protocol

### When Receiving a Review Request

```markdown
## Review Checklist
- [ ] **Understand the goal** — Read the PR description, linked issue, spec
- [ ] **Read the diff** — Understand every changed line
- [ ] **Check the tests** — Are new tests added? Do they cover edge cases?
- [ ] **Run the code** — Don't just read; execute and verify
- [ ] **Check for regressions** — Does the change break existing behavior?
- [ ] **Security review** — Any injection, auth bypass, data leak risks?
- [ ] **Performance review** — Any N+1 queries, unnecessary re-renders?
- [ ] **Architecture review** — Does it follow established patterns?
```

### Verification Gates

```markdown
Gate 1: COMPILATION
  → Does it build without errors?
  → Evidence: build output / CI status

Gate 2: TESTS
  → Do all tests pass?
  → Evidence: test output with pass/fail counts

Gate 3: LINTING
  → No lint warnings or errors?
  → Evidence: lint output

Gate 4: FUNCTIONALITY
  → Does the feature work as described?
  → Evidence: manual test screenshots/recordings

Gate 5: EDGE CASES
  → Null inputs, empty arrays, max values, concurrent access?
  → Evidence: specific test cases

Gate 6: SECURITY
  → No SQL injection, XSS, auth bypass, secrets in code?
  → Evidence: review of input handling and auth checks

Gate 7: PERFORMANCE
  → No N+1 queries, unnecessary renders, memory leaks?
  → Evidence: profiler output or EXPLAIN ANALYZE
```

## Feedback Categories

### Blocking (Must Fix)
```
🔴 **MUST FIX:** SQL injection vulnerability in user input handling.
The `username` parameter is interpolated directly into the SQL query.
Use parameterized queries instead.

Current: `SELECT * FROM users WHERE name = '${input}'`
Fix: `SELECT * FROM users WHERE name = $1` with params: [input]
```

### Non-Blocking (Should Fix)
```
🟡 **SUGGESTION:** Consider using `Map` instead of `Object` for the cache.
Maps have O(1) deletion and preserve insertion order.
Not blocking but would improve performance for large datasets.
```

### Informational (FYI)
```
💡 **FYI:** This pattern is also used in `services/auth.ts:45`.
If we're changing it here, we should update both for consistency.
```

## Reference Navigation

- **[Review Checklist Templates](references/review-checklists.md)** — Templates for different review types (feature, bugfix, security)
- **[Common Review Findings](references/common-findings.md)** — Frequent issues and how to spot them
- **[Review Communication](references/review-communication.md)** — How to give and receive feedback constructively

## Security Review Quick Check

```markdown
Input handling:
- [ ] All user input validated and sanitized
- [ ] Parameterized queries (no string interpolation in SQL)
- [ ] HTML output encoded (no raw innerHTML)
- [ ] File uploads validated (type, size, name)

Authentication & Authorization:
- [ ] Auth checks on all protected endpoints
- [ ] No hardcoded secrets or API keys
- [ ] Tokens have expiration
- [ ] CORS configured correctly

Data:
- [ ] Sensitive data not logged
- [ ] PII handled per privacy policy
- [ ] Database migrations are reversible
- [ ] Error messages don't leak internal details
```

## Performance Review Quick Check

```markdown
Database:
- [ ] No N+1 queries (use JOIN or batch)
- [ ] Queries use indexes (check EXPLAIN)
- [ ] Pagination for large result sets

Frontend:
- [ ] Heavy components lazy-loaded
- [ ] Lists use virtualization for 100+ items
- [ ] Images optimized (next/image, srcset)
- [ ] No unnecessary re-renders (React.memo, useMemo)

API:
- [ ] Response payload minimized
- [ ] Caching headers set appropriately
- [ ] Compression enabled (gzip/brotli)
```

## Best Practices

1. **Be specific** — Point to exact lines, suggest exact fixes
2. **Be kind** — Critique the code, not the person
3. **Be timely** — Review within 24h, don't block the team
4. **Verify claims** — Don't say "this will break" without proof
5. **Teach** — Explain WHY something is wrong, share resources
6. **Prioritize** — Focus on bugs and security first, style last

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [debugging](../debugging/SKILL.md) | Investigating bugs found in review |
| [testing](../testing/SKILL.md) | Verifying test coverage for PRs |
| [rust-backend-advance](../rust-backend-advance/SKILL.md) | Rust-specific code review patterns |
| [ui-polish](../ui-polish/SKILL.md) | UI/Design review criteria |
