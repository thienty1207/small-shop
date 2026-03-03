---
name: architecture-decision-records
description: >
  Document and manage Architecture Decision Records (ADRs). Capture technical decisions
  with context, alternatives, and consequences. Framework-agnostic: works for any
  tech stack. Use when making significant technical choices that affect architecture.
---

# Architecture Decision Records (ADRs)

Capture the **WHY** behind technical decisions so future you (and your team) understands the reasoning.

## When to Use

- Choosing a framework/language (Axum vs Actix, Gin vs Fiber)
- Choosing a database (PostgreSQL vs MongoDB)
- Deciding architecture style (monolith vs microservices)
- Changing a core dependency
- Introducing a new pattern or practice
- Deprecating existing functionality

## When NOT to Use

- Routine bug fixes or minor patches
- Style/formatting decisions (use linters)
- Temporary experiments

---

## ADR Template (Standard — MADR Format)

```markdown
# ADR-001: [Short Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date
YYYY-MM-DD

## Context
What is the issue or problem we're facing?
What constraints or requirements drive this decision?

## Decision Drivers
- [Driver 1: e.g., Team expertise in Rust]
- [Driver 2: e.g., Performance requirements < 10ms p99]
- [Driver 3: e.g., Must support 100K concurrent connections]

## Considered Options
1. **Option A** — [Brief description]
2. **Option B** — [Brief description]
3. **Option C** — [Brief description]

## Decision
We will use **[Option X]** because [reasoning].

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Risks
- [Risk 1 + mitigation]

## References
- [Link to discussion, RFC, or benchmark]
```

---

## ADR Directory Structure

```
docs/
└── decisions/
    ├── README.md              ← Index of all ADRs
    ├── 001-use-axum.md
    ├── 002-postgresql-over-mongodb.md
    ├── 003-event-driven-orders.md
    └── 004-monolith-first.md
```

### ADR Index (README.md)

```markdown
# Architecture Decision Records

| # | Decision | Status | Date |
|---|----------|--------|------|
| 001 | Use Axum for backend | Accepted | 2026-01-15 |
| 002 | PostgreSQL over MongoDB | Accepted | 2026-01-20 |
| 003 | Event-driven order processing | Accepted | 2026-02-01 |
| 004 | Start as modular monolith | Accepted | 2026-02-05 |
```

---

## Lightweight ADR (For Smaller Decisions)

```markdown
# ADR-005: Use SQLx over Diesel for ORM

**Status**: Accepted | **Date**: 2026-02-10

**Context**: Need Rust ORM for PostgreSQL.

**Decision**: SQLx — compile-time query checking, async-first, no DSL.

**Alternatives rejected**:
- Diesel: Sync-only, heavy macro DSL
- SeaORM: Less mature, slower compile

**Consequences**: Must write raw SQL (acceptable for team).
```

---

## Y-Statement Format (One-Liner)

```
In the context of [context],
facing [concern],
we decided for [option],
to achieve [quality],
accepting [downside].
```

### Examples

```
In the context of backend framework selection,
facing the need for async performance and type safety,
we decided for Axum (Rust),
to achieve sub-10ms latency and compile-time guarantees,
accepting slower development speed and steeper learning curve.

In the context of API design for mobile clients,
facing limited bandwidth and battery constraints,
we decided for GraphQL with persisted queries,
to achieve minimal data transfer and flexible querying,
accepting increased backend complexity.

In the context of inter-service communication,
facing eventual consistency requirements for order processing,
we decided for NATS JetStream event streaming,
to achieve reliable async processing with ordering guarantees,
accepting added infrastructure complexity.
```

---

## ADR Lifecycle

```
┌──────────┐    Review    ┌──────────┐    Time     ┌──────────────┐
│ Proposed │ ──────────→  │ Accepted │ ─────────→  │ Deprecated / │
└──────────┘              └──────────┘             │ Superseded   │
                                                    └──────────────┘

Rules:
├── NEVER delete an ADR (even wrong ones have context)
├── Supersede with new ADR + link to old one
├── Review ADRs quarterly (still relevant?)
└── Deprecated ≠ deleted (mark status, explain why)
```

---

## Multi-Stack ADR Examples

### Example: Choosing Backend Language

```markdown
# ADR-001: Multi-Stack Backend Strategy

## Status: Accepted
## Date: 2026-02-12

## Context
Building a platform with multiple services of different characteristics.

## Decision
Use multi-stack approach:
- **Rust (60%)**: Performance-critical services (API gateway, real-time)
- **Go (15%)**: Infrastructure tooling, CLI utilities
- **Python (15%)**: ML pipelines, data processing, admin scripts
- **Node.js (10%)**: BFF for web frontend, rapid prototyping

## Consequences
### Positive
- Right tool for each job
- Better performance where it matters

### Negative
- Higher hiring complexity
- More toolchain maintenance
```

---

## Best Practices

### DO's
- ✅ Write ADRs BEFORE implementing (not after)
- ✅ Keep them short (1-2 pages max)
- ✅ Include alternatives considered
- ✅ Link to data/benchmarks
- ✅ Review in team (PR-style)

### DON'Ts
- ❌ Write ADRs for every small decision
- ❌ Delete old/wrong ADRs
- ❌ Skip the "Consequences" section
- ❌ Make them too long (nobody reads 10-page ADRs)

---

## Related Skills

- [backend-architect](../backend-architect/SKILL.md) — Architecture patterns
- [plan-writing](../plan-writing/SKILL.md) — Task planning
- [code-review](../code-review/SKILL.md) — Review processes
