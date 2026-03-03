# Paddle Integration

## Overview
Paddle is a Merchant of Record (MoR) — they handle global tax compliance, invoicing, and payment processing. You receive net payouts.

## Setup

```bash
npm install @paddle/paddle-node-sdk @paddle/paddle-js
```

```env
PADDLE_API_KEY=your-api-key
PADDLE_WEBHOOK_SECRET=your-webhook-secret
PADDLE_ENVIRONMENT=sandbox  # or production
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your-client-token
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
```

## Overlay Checkout (Recommended)

```tsx
"use client"
import { initializePaddle, Paddle } from '@paddle/paddle-js'
import { useEffect, useState } from 'react'

export function PaddleCheckout({ priceId, userId }: { priceId: string; userId: string }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)

  useEffect(() => {
    initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          console.log('Payment successful!', event.data)
          // Redirect or update UI
        }
      }
    }).then(setPaddle)
  }, [])

  function openCheckout() {
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { userId },
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en',
        successUrl: 'https://myapp.com/success'
      }
    })
  }

  return <button onClick={openCheckout}>Subscribe</button>
}
```

## Server-Side (Node SDK)

```typescript
import { Paddle, Environment } from '@paddle/paddle-node-sdk'

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: Environment.sandbox
})

// List products
const products = await paddle.products.list()

// List prices for a product
const prices = await paddle.prices.list({ productId: 'pro_xxx' })

// Get subscription
const subscription = await paddle.subscriptions.get('sub_xxx')

// Cancel subscription
await paddle.subscriptions.cancel('sub_xxx', { effectiveFrom: 'next_billing_period' })

// Pause subscription
await paddle.subscriptions.pause('sub_xxx', { effectiveFrom: 'next_billing_period' })

// Resume subscription
await paddle.subscriptions.resume('sub_xxx', { effectiveFrom: 'immediately' })
```

## Webhook Handler

```typescript
import { Paddle, EventName } from '@paddle/paddle-node-sdk'

const paddle = new Paddle(process.env.PADDLE_API_KEY!)

export async function POST(req: Request) {
  const signature = req.headers.get('paddle-signature')!
  const body = await req.text()

  try {
    const event = paddle.webhooks.unmarshal(body, process.env.PADDLE_WEBHOOK_SECRET!, signature)

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
        await db.subscriptions.create({
          data: {
            paddleSubId: event.data.id,
            userId: event.data.customData?.userId,
            status: event.data.status,
            priceId: event.data.items[0]?.price?.id
          }
        })
        break

      case EventName.SubscriptionUpdated:
        await db.subscriptions.update({
          where: { paddleSubId: event.data.id },
          data: { status: event.data.status }
        })
        break

      case EventName.SubscriptionCanceled:
        await db.subscriptions.update({
          where: { paddleSubId: event.data.id },
          data: { status: 'cancelled', cancelledAt: new Date() }
        })
        break

      case EventName.TransactionCompleted:
        await db.transactions.create({
          data: {
            paddleTxnId: event.data.id,
            amount: event.data.details?.totals?.total,
            currency: event.data.currencyCode,
            status: 'completed'
          }
        })
        break
    }

    return new Response('ok')
  } catch (e) {
    return new Response('Invalid signature', { status: 400 })
  }
}
```

## Paddle vs Stripe Decision

| Feature | Paddle (MoR) | Stripe |
|---------|-------------|--------|
| Tax handling | Paddle handles all tax | You handle (or use Stripe Tax) |
| Invoicing | Paddle sends invoices | You send invoices |
| Refunds | Through Paddle dashboard | Through Stripe API |
| Pricing | 5% + 50¢ | 2.9% + 30¢ |
| Best for | SaaS, digital products | Custom flows, marketplaces |
| Payout | Net after fees + tax | Gross minus fees |
