# Stripe Integration

## Setup

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Checkout Session (Server-Side)

```typescript
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// One-time payment
export async function createCheckout(priceId: string, userId: string) {
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/cancel`,
    metadata: { userId },
    payment_intent_data: { metadata: { userId } }
  })
  return session.url
}

// Subscription
export async function createSubscription(priceId: string, customerId: string) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/dashboard?setup=success`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { customerId }
    }
  })
  return session.url
}
```

## Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      await db.users.update({
        where: { id: session.metadata!.userId },
        data: {
          stripeCustomerId: session.customer as string,
          subscriptionStatus: 'active'
        }
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await db.payments.create({
        data: {
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          customerId: invoice.customer as string,
          status: 'paid'
        }
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await db.subscriptions.upsert({
        where: { stripeSubId: sub.id },
        update: { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
        create: { stripeSubId: sub.id, status: sub.status, customerId: sub.customer as string }
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.subscriptions.update({
        where: { stripeSubId: sub.id },
        data: { status: 'cancelled' }
      })
      break
    }
  }

  return new Response('ok')
}
```

## Billing Portal

```typescript
// Let customers manage their own subscription
export async function createBillingPortal(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/dashboard`
  })
  return session.url
}
```

## Customer Management

```typescript
// Create or retrieve customer
export async function getOrCreateCustomer(userId: string, email: string) {
  const user = await db.users.findUnique({ where: { id: userId } })
  
  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId }
  })

  await db.users.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id }
  })

  return customer.id
}
```

## Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```
