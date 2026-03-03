# CLAUDE.md — smallshop

## Stack

- **Backend:** Rust 2024 edition, Axum 0.8, SQLx 0.8 (PostgreSQL), Tokio, Argon2, Lettre (email), UUID v4
- **Frontend:** React 18, TypeScript 5, Vite 5, React Router 6, TanStack Query, Tailwind CSS 3, shadcn/ui (Radix), Zod, React Hook Form, Recharts, Sonner (toast)
- **Testing:** Vitest, Testing Library
- **Package Manager:** Bun (frontend), Cargo (backend)
- **Database:** PostgreSQL

## File Structure

```
backend/src/          → Rust API server (Axum)
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
