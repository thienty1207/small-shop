# Mail / Contact Feature — IMPLEMENTED

## Summary
Full contact form with email notifications, Cloudflare Turnstile spam protection, and database persistence.

## What Was Built

### Database
- `sql/003_contact_messages.sql` — `contact_messages` table
  - Fields: `id (UUID PK)`, `name`, `email`, `phone (nullable)`, `message`, `created_at`

### Backend (4-layer architecture)
- `backend/src/models/contact.rs` — `ContactMessage`, `CreateContactInput` structs
- `backend/src/repositories/contact_repo.rs` — `insert_contact()` saves to DB
- `backend/src/services/email_service.rs` — added:
  - `verify_turnstile()` — Cloudflare Turnstile challenge verification
  - `send_admin_notification()` — notifies shop admin with sender details
  - `send_auto_reply()` — sends confirmation email back to the user
  - HTML email templates: `admin_notification_html()`, `auto_reply_html()`
- `backend/src/handlers/contact.rs` — `submit_contact()` handler
  - Validates Turnstile token
  - Inserts into DB
  - Fires both emails (admin + auto-reply)
  - Returns 201 Created
- `backend/src/routes/contact.rs` — `POST /api/contact`

### Frontend
- `frontend/src/pages/Contact.tsx` — updated with:
  - Phone field (optional)
  - Cloudflare Turnstile widget (`@marsidev/react-turnstile`)
  - Form validation with Zod + React Hook Form
  - Submits to `POST /api/contact`
  - Success/error toast via Sonner

## Environment Variables Added
```
CLOUDFLARE_SECRET_KEY=<turnstile server-side secret>
CONTACT_FROM_NAME="Ho Thien Ty"
CONTACT_FROM_EMAIL=hothientybs@gmail.com
CONTACT_ADMIN_EMAIL=hothientybs@gmail.com
REPLY_LOGO_URL=https://...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=hothientybs@gmail.com
SMTP_PASSWORD="mcwz kvoi edcc ktjv"
```

## Tests
- `frontend/src/test/Contact.test.tsx` — 8/8 passing
  - Renders without crash
  - Shows all form fields
  - Validates required fields
  - Shows success message on submit
  - Shows error on API failure
  - Handles Turnstile widget
