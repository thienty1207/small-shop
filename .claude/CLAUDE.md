# CLAUDE.md — smallshop

## Stack

- **Backend:** Rust 2024 edition, Axum 0.8, SQLx 0.8 (PostgreSQL), Tokio, Argon2, Lettre (email), UUID v4
- **Frontend:** React 18, TypeScript 5, Vite 5, React Router 6, TanStack Query, Tailwind CSS 3, shadcn/ui (Radix), Zod, React Hook Form, Recharts, Sonner (toast)
- **Testing:** Vitest, Testing Library (frontend) · `cargo test` + `axum-test` (backend)
- **Package Manager:** Bun (frontend), Cargo (backend)
- **Database:** PostgreSQL

---

## Skills — USE BEFORE STARTING ANY TASK

Before implementing any feature, ALWAYS read the relevant skill files first.
Skills are located at `.claude/skills/<skill-name>/SKILL.md`.

### Skills relevant to THIS project — ALWAYS use these

This is a Rust + React e-commerce app. The following skills directly apply to every task.
**Read the SKILL.md file + its `references/` sub-files before starting work.**

#### Core skills (use on EVERY feature)

| Skill | Path | When to read |
|---|---|---|
| **rust-backend-advance** | `.claude/skills/rust-backend-advance/SKILL.md` | ANY backend work: handlers, services, repos, middleware, error handling, Axum patterns, async Rust |
| **databases** | `.claude/skills/databases/SKILL.md` | ANY SQL migration, query, schema change. Sub-files: `references/postgresql-schema-design.md`, `references/postgresql-advanced-queries.md`, `references/postgresql-optimization.md` |
| **authentication** | `.claude/skills/authentication/SKILL.md` | ANY auth work: OAuth, JWT, sessions, RBAC. Sub-files: `references/oauth-providers.md`, `references/auth-security.md` |
| **ui-styling** | `.claude/skills/ui-styling/SKILL.md` | ANY frontend component: Tailwind, shadcn/ui, theming, dark mode, responsive |
| **debugging** | `.claude/skills/debugging/SKILL.md` | ANY bug fix: structured root-cause analysis, hypothesis-driven debugging |
| **code-review** | `.claude/skills/code-review/SKILL.md` | BEFORE marking any feature as done: review checklist, verify no regressions |
| **testing** | `.claude/skills/testing/SKILL.md` | AFTER every feature: write tests in `test/backend/` or `test/frontend/` |

#### Feature-specific skills (use when the task matches)

| Skill | Path | When to read |
|---|---|---|
| **ui-ux-pro-max** | `.claude/skills/ui-ux-pro-max/SKILL.md` | Designing new pages, layouts, improving UX flows |
| **ui-ux-designer** | `.claude/skills/ui-ux-designer/SKILL.md` | Wireframes, design systems, interface decisions |
| **ui-polish** | `.claude/skills/ui-polish/SKILL.md` | Aesthetics refinement, visual quality checks |
| **frontend-design** | `.claude/skills/frontend-design/SKILL.md` | Bold design direction, typography, color, motion |
| **payments** | `.claude/skills/payments/SKILL.md` | Stripe/Paddle/SePay integration, checkout flows |
| **devops** | `.claude/skills/devops/SKILL.md` | Docker, CI/CD, deployment, Cloudflare, GCP |
| **backend-architect** | `.claude/skills/backend-architect/SKILL.md` | Architecture decisions, layer design, service boundaries |
| **plan-writing** | `.claude/skills/plan-writing/SKILL.md` | Writing implementation plans before large features |
| **production-readiness** | `.claude/skills/production-readiness/SKILL.md` | Pre-launch checklist, performance, monitoring |
| **security-hardening** | `.claude/skills/security-hardening/SKILL.md` | Security audit, input validation, CORS, rate limiting |

#### Workflow: How to use skills

```
1. Identify which skills match the current task (check tables above)
2. Read the SKILL.md file for each matching skill
3. Read relevant sub-files in references/ for deeper patterns
4. Follow the patterns and checklists defined in the skill
5. After implementation, read code-review skill and self-review
6. Write tests (testing skill)
```

**Non-negotiable:** If a skill exists for the domain you are working in, reading it is REQUIRED, not optional.
Skipping skills leads to avoidable bugs, inconsistent patterns, and rework.

### ABSOLUTE RULE — Read skills FIRST, code SECOND

> **Before implementing ANY feature** (frontend, backend, database, or any combination),
> you MUST read the relevant skill files listed above. No exceptions, no shortcuts.
>
> This rule applies to:
> - Every new page or component (→ `ui-styling`, `ui-ux-pro-max`)
> - Every new API handler, service, or repository (→ `rust-backend-advance`)
> - Every SQL migration or schema change (→ `databases`)
> - Every auth-related change (→ `authentication`)
> - Every bug fix (→ `debugging`)
> - Before marking done (→ `code-review`)
> - After every feature (→ `testing`)
>
> **If you skip reading skills, you will produce non-standard code and must refactor.**

---

## Testing Requirements — MANDATORY AFTER EVERY FEATURE

**After implementing any feature requested by the user, you MUST write tests.**

### Test folder structure
```
test/
  backend/    → Rust integration/unit tests for backend features
  frontend/   → Vitest + Testing Library tests for frontend features
```

### Backend tests (`test/backend/`)
- Use `cargo test` + `axum-test` crate for handler integration tests
- File naming: `<feature>_test.rs` (e.g., `auth_test.rs`, `user_profile_test.rs`)
- Every new handler/service function must have at minimum:
  - ✅ Happy path test
  - ✅ Auth failure test (401 for protected routes)
  - ✅ Validation error test (400 for bad input)
- Use `sqlx::test` for repository-level tests that need a real DB

### Frontend tests (`test/frontend/`)
- Use Vitest + React Testing Library
- File naming: `<Component>.test.tsx` or `<feature>.test.ts`
- Every new page/component must have at minimum:
  - ✅ Renders without crashing
  - ✅ Shows correct data from context/props
  - ✅ User interactions (clicks, form submissions) work as expected
- Mock API calls with `vi.mock` or MSW

### Rule
> **You cannot mark a feature as "done" without writing tests.**
> Tests go in `test/backend/` or `test/frontend/` — NOT inside `backend/src/` or `frontend/src/`.

---

## File Structure

```
backend/src/
  main.rs             → Entry point: start server, load config, build Router
  lib.rs              → Library root: re-export main modules for use in tests
  config.rs           → Load environment variables, app configuration (port, db url, jwt secret...)
  error.rs            → Define AppError for the whole app, impl IntoResponse for Axum
  state.rs            → AppState struct (db pool, config...) used as Axum State
  │
  routes/             → Declare URL routing, group endpoints by domain
  │   mod.rs          → (!) ONLY pub mod declarations, re-export create_router()
  │   product.rs      → Product routes: GET /products, POST /products/:id ...
  │   order.rs        → Order routes
  │   user.rs         → User routes
  │   cart.rs         → Cart routes
  │
  handlers/           → HTTP layer: receive Request → call Service → return Response
  │   mod.rs          → (!) ONLY pub mod declarations
  │   product.rs      → list_products, get_product, create_product...
  │   order.rs        → create_order, get_order, list_orders...
  │   user.rs         → register, login, get_profile...
  │   cart.rs         → add_to_cart, remove_from_cart...
  │
  services/           → Business logic layer: handles domain logic, knows nothing about HTTP
  │   mod.rs          → (!) ONLY pub mod declarations
  │   product_service.rs → filtering, pricing, product validation logic
  │   order_service.rs   → order creation, total calculation, inventory check logic
  │   auth_service.rs    → login logic, password hashing, JWT generation
  │   cart_service.rs    → add/remove/calculate cart logic
  │
  repositories/       → Database layer: ONLY SQL queries, no business logic
  │   mod.rs          → (!) ONLY pub mod declarations
  │   product_repo.rs → find_by_id, find_all, insert, update, delete (pure SQL)
  │   order_repo.rs   → find_by_user, insert_order, update_status...
  │   user_repo.rs    → find_by_email, insert_user...
  │
  models/             → Data structs: DB models, request DTOs, response structs
  │   mod.rs          → (!) ONLY pub mod declarations
  │   product.rs      → Product, CreateProductDto, UpdateProductDto, ProductResponse
  │   order.rs        → Order, CreateOrderDto, OrderResponse
  │   user.rs         → User, RegisterDto, LoginDto, UserResponse
  │   cart.rs         → Cart, CartItem, AddToCartDto
  │
  middleware/         → Tower middleware: auth guard, logging, rate limiting
      mod.rs          → (!) ONLY pub mod declarations
      auth.rs         → JWT validation middleware, extract current user
      logging.rs      → Request/response logging

frontend/src/
  pages/              → Route-level pages (Index, Products, Cart, Checkout, Login, Register, Account, OrderDetail...)
  components/ui/      → shadcn/ui primitives (DO NOT edit manually)
  components/shop/    → Shop-specific components (ProductCard, PriceDisplay, QuantityStepper...)
  components/layout/  → Header, Footer
  contexts/           → React contexts (CartContext)
  data/               → Static/mock data (products.ts)
  hooks/              → Custom hooks (use-mobile, use-toast)
  lib/                → Utilities (utils.ts)
sql/                  → Database migrations
```

## Backend Architecture Rules — MUST FOLLOW

### Data Flow
```
HTTP Request
    ↓
routes/          → routing only (map URL → handler function)
    ↓
handlers/        → extract params/body, call service, return JSON response
    ↓
services/        → all business logic, never import axum
    ↓
repositories/    → SQL queries only, return domain models
    ↓
PostgreSQL
```

### Rules for `mod.rs` — NEVER violate
- `mod.rs` is **ONLY** allowed to contain `pub mod <file_name>;` and `pub use` statements
- **NEVER** write any struct, fn, impl, or logic inside `mod.rs`
- Its sole purpose: act as a public export gateway for clean imports elsewhere

```rust
// ✅ CORRECT — mod.rs re-exports only
pub mod product;
pub mod order;
pub use product::Product;

// ❌ WRONG — NEVER write logic in mod.rs
pub struct Product { ... }       // ← forbidden
pub async fn list_products() {}  // ← forbidden
```

### Layer responsibility rules

| Layer | Allowed | Not allowed |
|---|---|---|
| `routes/` | Declare Router, nest routes | Logic, DB queries |
| `handlers/` | Extract request, call service, return response | SQL queries, business logic |
| `services/` | Business logic, validation, calculations | Import `axum`, write SQL |
| `repositories/` | SQL queries with SQLx | Business logic, HTTP types |
| `models/` | Structs, Derive macros, serde | Functions, complex impl logic |
| `middleware/` | Tower Layer/middleware | Business logic |

## Hard Boundaries — Violation = revert immediately

1. **DO NOT edit `components/ui/`** — shadcn/ui generated files, add new components via CLI only
2. **DO NOT delete or rename migration files** in `sql/`
3. **DO NOT modify files outside task scope** — if needed, STOP and list the files required
4. **DO NOT add dependencies** unless explicitly requested
5. **DO NOT restructure existing directories** without approval
6. **DO NOT self-refactor code** when the task only asks to fix a bug

## Task Contract Template

Every task must follow this format:

```
## Goal
[One clear sentence describing the task]

## Constraints
- Files allowed to edit: [explicit list]
- Files NOT to touch: [if any]

## Adjacent Code (related files to be aware of)
- path/to/file.ts → short description

## Output Format
- [Describe the deliverable]

## Failure Conditions
- [What counts as failure]
```

## Conventions

- **Language:** All code, comments, commit messages, and file content MUST be in English. Vietnamese is only used when communicating with the user in chat.
- **Rust:** snake_case, Result<T, E> for error handling, async fn for handlers
- **TypeScript:** PascalCase components, camelCase functions/variables
- **Components:** Functional components + hooks only, no class components
- **Routing:** React Router v6 pattern (pages/ = route, components/ = reusable)
- **State:** CartContext for cart state, TanStack Query for server state
- **Styling:** Tailwind utility classes, cn() helper for conditional classes

## Commands

```bash
# Backend
cd backend && cargo build
cd backend && cargo run

# Frontend
cd frontend && bun dev         # dev server
cd frontend && bun run build   # production build
cd frontend && bun test        # run tests
```
