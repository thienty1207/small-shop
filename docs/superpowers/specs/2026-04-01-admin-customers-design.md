# Admin Customers CRUD Design

**Date:** 2026-04-01  
**Priority:** P2 (High value feature)  
**Scope:** Implement customer list, search, pagination on admin panel

---

## Goal

Replace admin Customers placeholder with fully functional list showing all registered users with search, pagination, and customer detail view.

---

## Architecture

```
Admin → GET /admin/customers
├─ UI: Fetch paginated list (page=1, limit=20, search="")
├─ API: GET /api/admin/customers?page=1&limit=20&search=email|name
├─ Backend: Query users table, return PaginatedResponse<CustomerListItem>
├─ Frontend: Render table with columns: Name, Email, Phone, SignUp Date, Last Login, Actions (view/export)
└─ Drill-down: Click row → modal/panel showing full profile + orders

```

---

## Tech Stack

**Backend:**
- Axum handlers (`admin/customer.rs`)
- SQLx queries (pagination, search)
- Existing repository pattern

**Frontend:**
- React hooks (useState, useEffect)
- TanStack Query (optional: caching)
- shadcn/ui components (Table, Dialog, SearchInput)
- Tailwind CSS

---

## File Structure & Responsibilities

| File | Change | Responsibility |
|------|--------|-----------------|
| `backend/src/handlers/admin/customer.rs` | Full rewrite | Query users, pagination, search |
| `backend/src/repositories/user_repo.rs` | Add `find_all_paginated()`, `search_users()` | DB queries |
| `backend/src/services/customer_service.rs` | New | Business logic (filtering, aggregation) |
| `backend/src/routes/admin.rs` | Ensure route wired | Already defined |
| `frontend/src/pages/admin/Customers.tsx` | Full rewrite | Table, search, pagination, modal |
| `frontend/src/lib/admin-api.ts` | Add types | `CustomerListItem`, `CustomerDetail` |

---

## Backend: Data Model

### CustomerListItem (list view)
```typescript
{
  id: string,
  name: string,
  email: string,
  phone?: string,
  avatar_url?: string,
  google_id?: string,
  created_at: string,       // account created
  last_login_at?: string,   // last OAuth login
  orders_count: number,     // total orders
  total_spent: number,      // sum of order totals
}
```

### CustomerDetail (modal view)
```typescript
{
  ...CustomerListItem,
  address?: string,
  recent_orders: OrderSummary[],
  wishlist_count: number,
  reviews_count: number,
}
```

### API Response
```typescript
{
  items: CustomerListItem[],
  total: number,
  page: number,
  limit: number,
  total_pages: number,
}
```

---

## Frontend: UI Components

**Main table:**
- Search input (name/email)
- Pagination controls (prev/next, page indicator)
- Table columns: Name, Email, Phone, SignUp Date, Last Login, Orders, Spent, Actions
- Action buttons: View Detail, Export (future)

**Detail modal:**
- Customer info card (avatar, name, email, phone, address)
- Stats: Orders count, Total spent, Wishlist, Reviews
- Recent orders mini-table
- Close button

**States:**
- Loading (skeleton)
- Empty (no customers)
- Error (with retry button)

---

## Database Queries

### find_all_paginated (with search)
```sql
SELECT 
  u.id, u.name, u.email, u.phone, u.avatar_url, u.google_id, 
  u.created_at, u.last_login_at,
  COALESCE(o.orders_count, 0) as orders_count,
  COALESCE(o.total_spent, 0) as total_spent
FROM users u
LEFT JOIN (
  SELECT customer_id, COUNT(*) as orders_count, SUM(total) as total_spent
  FROM orders
  WHERE status NOT IN ('cancelled')
  GROUP BY customer_id
) o ON u.id = o.customer_id
WHERE (u.name ILIKE $1 OR u.email ILIKE $1)
ORDER BY u.created_at DESC
LIMIT $2 OFFSET $3
```

### COUNT query (for pagination)
```sql
SELECT COUNT(*) as total
FROM users u
WHERE (u.name ILIKE $1 OR u.email ILIKE $1)
```

---

## Error Handling

**Backend errors:**
- 401: Not authenticated
- 403: Insufficient permission (only manager/super_admin can list)
- 400: Invalid pagination params (page < 1, limit > 1000)
- 500: DB query error → 500 Internal

**Frontend errors:**
- Network error → Show toast + retry button
- Invalid response → Log, show generic error
- Pagination edge case → Graceful fallback to page 1

---

## Testing Strategy

### Backend (unit + integration)
1. **Unit tests** (customer_service.rs):
   - ✅ Search filter works (ilike, case-insensitive)
   - ✅ Pagination offset calculation correct
   - ✅ Order count aggregation accurate
   - ✅ Total_spent calculation correct

2. **Integration tests** (routes):
   - ✅ GET /api/admin/customers (unauthenticated) → 401
   - ✅ GET /api/admin/customers (staff user) → 403
   - ✅ GET /api/admin/customers (manager/super_admin) → 200
   - ✅ Pagination: page=1, limit=20 → returns first 20
   - ✅ Pagination: page=2, limit=20 → returns next 20
   - ✅ Search: ?search=test → filters by name or email
   - ✅ Empty result: ?search=nonexistent → returns []

### Frontend (component tests)
1. **Rendering:**
   - ✅ Table renders with correct columns
   - ✅ Loading state shows skeleton
   - ✅ Empty state message shown
   - ✅ Error state shows retry button

2. **Pagination:**
   - ✅ Next/prev buttons work
   - ✅ Page indicator shows correct page
   - ✅ Disabled when no more pages

3. **Search:**
   - ✅ Debounced search works (not on every keystroke)
   - ✅ Search result reflects in table

4. **Modal:**
   - ✅ Click row opens modal
   - ✅ Modal shows customer detail
   - ✅ Close button works

---

## Permissions

| Role | Permission |
|------|-----------|
| Client | ❌ No access |
| Staff | ❌ No access (403) |
| Manager | ✅ Read-only list |
| Super Admin | ✅ Read-only list |

*Note: Edit/Delete customer deferred to future phase.*

---

## Success Criteria

- ✅ Customer list loads with pagination
- ✅ Search filters by name or email
- ✅ Detail modal shows full customer info
- ✅ Stats (orders, spent) calculated correctly
- ✅ Permissions enforced (staff blocked)
- ✅ No broken UI on empty state
- ✅ All tests pass
- ✅ Performance: list loads < 1s with 1000+ customers

---

## Rollout Notes

1. Deploy backend first
2. Test API manually via Postman/curl
3. Deploy frontend
4. QA: Test list, search, pagination, modal
5. Monitor: Log customer queries for analytics

---

## Future Enhancements (Out of scope P2)

- Edit customer profile
- Soft-delete customer
- Export customer list to CSV
- Advanced filters (by order date, spend range)
- Bulk actions (email, tag)

