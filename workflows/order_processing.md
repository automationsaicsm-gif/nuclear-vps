# Workflow: Order Processing

## Objective
Process a new VPS order from plan selection through payment to VPS provisioning.

## Trigger
Payment success webhook or direct order submission from `/dashboard/order`

## Required Inputs
- `planId` (string)
- `billingCycle` (MONTHLY | QUARTERLY | ANNUALLY)
- `location` (LONDON | NEW_YORK)
- `os` (string, e.g. "Windows 2022")
- `paymentMethod` (stripe | paypal | coinbase | credit)
- `couponCode` (string, optional)
- `userId` (from JWT)

## Steps

### 1. Validate Plan
- Fetch plan from DB by `planId`
- Return 404 if not found or `available: false`

### 2. Calculate Price
```ts
const prices = {
  MONTHLY: plan.monthlyPrice,
  QUARTERLY: plan.quarterlyPrice * 3,
  ANNUALLY: plan.annualPrice * 12,
}
let total = prices[billingCycle]
```

### 3. Apply Coupon (if provided)
- Query `CouponCode` where `code = couponCode.toUpperCase()` AND `active = true`
- Check: not expired, not exceeded maxUses
- `discount = total * (coupon.discount / 100)`
- `total = total - discount`
- Increment `coupon.uses`

### 4. Apply Account Credit (if requested)
- Fetch `user.creditBalance`
- Apply up to available credit: `creditApplied = Math.min(creditBalance, total)`
- `total = total - creditApplied`
- Deduct from user balance after payment success

### 5. Create Pending Invoice
```ts
await prisma.invoice.create({
  data: {
    invoiceNumber: `INV-${year}-${padded6digits}`,
    userId,
    amount: total,
    status: 'UNPAID',
    dueDate: new Date(Date.now() + 7 * 86400000),
    items: { create: [{ description: `${plan.name} — ${billingCycle}`, amount: total, quantity: 1 }] }
  }
})
```

### 6. Create Pending Service
```ts
await prisma.service.create({
  data: {
    userId, planId, status: 'PENDING', billingCycle, location, os,
    nextDueDate: calculateNextDueDate(billingCycle),
    invoices: { connect: { id: invoiceId } }
  }
})
```

### 7. Process Payment
Based on `paymentMethod`:

**Stripe:**
- Create PaymentIntent via Stripe SDK
- Return `clientSecret` to frontend for Stripe Elements confirmation
- Listen for `payment_intent.succeeded` webhook
- On success → proceed to Step 8

**PayPal:**
- Create Order via PayPal SDK
- Return `approvalUrl` for redirect
- On capture success → proceed to Step 8

**Coinbase Commerce:**
- Create Charge via Coinbase SDK
- Return `hostedUrl` for redirect
- On `charge:confirmed` webhook → proceed to Step 8

**Account Credit (balance covers full amount):**
- Deduct immediately → proceed to Step 8

### 8. Mark Invoice Paid
```ts
await prisma.invoice.update({
  where: { id: invoiceId },
  data: { status: 'PAID', paidAt: new Date(), paymentMethod }
})
```

### 9. Provision VPS
- Call `tools/provision_vps.js <serviceId>`
- This sets `status: ACTIVE`, generates IP, hostname, password
- Sends order confirmation email with credentials

### 10. Calculate Affiliate Commission
- Check if user was referred: `prisma.affiliateReferral.findUnique({ where: { referredId: userId } })`
- If found, call `tools/calculate_affiliate_commission.js <amount> <userId>`

### 11. Send Payment Received Email
- Call `tools/send_email.js` with template `payment_received`

## Error Handling
| Error | Status | Action |
|-------|--------|--------|
| Plan not available | 400 | Return error to user |
| Invalid coupon | 400 | Return error |
| Payment failed | 402 | Return error, keep invoice UNPAID |
| Provisioning failed | 500 | Mark service PENDING, alert admin, retry in 5min |

## Edge Cases
- Webhook received twice for same payment: check `invoice.status === 'PAID'` before processing (idempotency)
- Stripe webhook: always verify signature with `stripe.webhooks.constructEvent()`
- If credit applied but payment fails: refund credit to user balance
