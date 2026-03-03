---
name: payments
description: Multi-provider payment integration — Stripe (checkout, billing, Connect), Paddle (MoR subscriptions), SePay (VietQR, Vietnamese banks), Polar (global SaaS), Creem.io (MoR + licensing). Checkout flows, webhooks, subscriptions, QR payments, multi-provider management.
license: MIT
---

# Payment Integration Mastery

Production-proven multi-provider payment processing with Stripe, Paddle, SePay, Polar, and Creem.io.

## Platform Selection

| Platform | Best For | Tax Handling | Pricing |
|----------|----------|-------------|---------|
| **Stripe** | Enterprise, custom flows, Connect platforms | You handle tax | 2.9% + 30¢ |
| **Paddle** | SaaS subscriptions, global sales | MoR (they handle tax) | 5% + 50¢ |
| **SePay** | Vietnam market, VND, bank transfers | You handle | Low fees |
| **Polar** | Open-source SaaS, subscriptions | MoR | 5% |
| **Creem.io** | MoR + software licensing | MoR | Varies |

## Implementation Flow (All Providers)
```
1. Auth (API keys, secrets)
2. Create Products/Prices
3. Implement Checkout
4. Handle Webhooks
5. Manage Subscriptions
6. Monitor & Reconcile
```

## Reference Navigation

### Stripe
- **[Stripe Integration](references/stripe-integration.md)** — Checkout Sessions, Payment Element, Billing Portal, Connect
- **[Stripe Webhooks](references/stripe-webhooks.md)** — Event handling, signature verification, idempotency

### Paddle
- **[Paddle Integration](references/paddle-integration.md)** — MoR model, overlay/inline checkout, subscription lifecycle
- **[Paddle Webhooks](references/paddle-webhooks.md)** — SHA256 verification, event types, Retain

### Vietnam & Others
- **[SePay VietQR](references/sepay-vietqr.md)** — Vietnamese bank integration, QR code payments, webhook setup
- **[Polar & Creem](references/polar-creem.md)** — Global SaaS billing, software licensing, benefits delivery

### Architecture
- **[Multi-Provider Patterns](references/multi-provider-patterns.md)** — Unified order management, provider abstraction, currency handling

## Quick Start (Stripe)

```typescript
// Server: Create checkout session
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: 'price_xxx',
    quantity: 1
  }],
  mode: 'subscription',
  success_url: 'https://myapp.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://myapp.com/cancel'
})

// Redirect to session.url
```

```typescript
// Webhook handler
import { buffer } from 'micro'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object)
      break
  }
  
  return new Response('ok')
}
```

## Best Practices

1. **Always verify webhook signatures** — Never trust unverified webhooks
2. **Idempotent webhook handlers** — Process each event exactly once
3. **Store provider IDs** — Map Stripe/Paddle IDs to your internal IDs
4. **Handle edge cases** — Failed payments, disputed charges, refunds
5. **Test with CLI tools** — `stripe listen --forward-to localhost:3000/webhook`
6. **Use MoR for global** — Paddle/Creem handle tax compliance for you

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [rust-backend-advance](../rust-backend-advance/SKILL.md) | Webhook handling, payment APIs |
| [databases](../databases/SKILL.md) | Order/payment data storage |
| [nextjs-turborepo](../nextjs-turborepo/SKILL.md) | Checkout UI, payment forms |
| [testing](../testing/SKILL.md) | Payment flow E2E testing |
| [devops](../devops/SKILL.md) | Webhook security, secrets management |
