# SePay VietQR & Polar/Creem

## SePay — Vietnamese Bank Integration

### Overview
SePay provides QR code-based payments via Vietnamese banking system. Zero fees for bank transfers.

### Setup
```env
SEPAY_API_KEY=your-api-key
SEPAY_BANK_ACCOUNT=your-bank-account-number
SEPAY_BANK_CODE=MB  # MBBank, VCB, TCB, etc.
```

### Generate VietQR Payment
```typescript
interface VietQRParams {
  bankCode: string    // MB, VCB, TCB, BIDV, etc.
  accountNumber: string
  amount: number      // VND
  description: string // Payment reference
  template?: string   // QR template (compact, compact2, print, qr_only)
}

function generateVietQR(params: VietQRParams): string {
  const { bankCode, accountNumber, amount, description, template = 'compact2' } = params
  const encodedDesc = encodeURIComponent(description)
  return `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodedDesc}&template=${template}`
}

// Usage
const qrUrl = generateVietQR({
  bankCode: 'MB',
  accountNumber: '0123456789',
  amount: 500000,           // 500,000 VND
  description: `ORDER-${orderId}`
})
// Display as <img src={qrUrl} />
```

### Webhook Handler (Payment Confirmation)
```typescript
// SePay sends webhook when payment is received
export async function POST(req: Request) {
  const body = await req.json()
  
  // Verify API key
  const apiKey = req.headers.get('Authorization')
  if (apiKey !== `Bearer ${process.env.SEPAY_API_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { transferAmount, description, transferType } = body
  
  if (transferType === 'in') {  // Money received
    // Extract order ID from description
    const orderIdMatch = description.match(/ORDER-(\w+)/)
    if (orderIdMatch) {
      const orderId = orderIdMatch[1]
      await db.orders.update({
        where: { id: orderId },
        data: { status: 'paid', paidAmount: transferAmount }
      })
    }
  }

  return new Response('ok')
}
```

### Bank Codes
| Code | Bank |
|------|------|
| MB | MBBank |
| VCB | Vietcombank |
| TCB | Techcombank |
| BIDV | BIDV |
| ACB | ACB |
| VPB | VPBank |
| TPB | TPBank |
| STB | Sacombank |
| VIB | VIB |
| MSB | MSB |

---

## Polar — Global SaaS Billing

### Setup
```bash
npm install @polar-sh/sdk
```

```env
POLAR_ACCESS_TOKEN=your-access-token
POLAR_ORGANIZATION_ID=your-org-id
POLAR_WEBHOOK_SECRET=your-webhook-secret
```

### Create Checkout
```typescript
import { Polar } from '@polar-sh/sdk'

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN })

// Create checkout session
const checkout = await polar.checkouts.create({
  productPriceId: 'price_xxx',
  successUrl: 'https://myapp.com/success',
  customerEmail: 'user@example.com',
  metadata: { userId: 'user-123' }
})

// Redirect to checkout.url
```

### Webhook
```typescript
import { validateEvent } from '@polar-sh/sdk/webhooks'

export async function POST(req: Request) {
  const body = await req.text()
  const event = validateEvent(body, req.headers, process.env.POLAR_WEBHOOK_SECRET!)

  switch (event.type) {
    case 'subscription.created':
      await handleSubscriptionCreated(event.data)
      break
    case 'subscription.updated':
      await handleSubscriptionUpdated(event.data)
      break
  }

  return new Response('ok')
}
```

---

## Creem.io — MoR + Software Licensing

### Overview
Creem.io acts as Merchant of Record, handling global tax compliance. Also provides license key generation for software sales.

### Create Checkout
```typescript
const response = await fetch('https://api.creem.io/v1/checkouts', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CREEM_API_KEY!,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product_id: 'prod_xxx',
    success_url: 'https://myapp.com/success',
    request_data: { user_id: 'user-123' }
  })
})

const { checkout_url } = await response.json()
// Redirect user to checkout_url
```

### License Key Validation
```typescript
async function validateLicense(key: string): Promise<boolean> {
  const res = await fetch(`https://api.creem.io/v1/licenses/validate`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.CREEM_API_KEY! },
    body: JSON.stringify({ key })
  })
  const { valid } = await res.json()
  return valid
}
```
