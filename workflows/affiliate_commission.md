# Workflow: Affiliate Commission

## Objective
Track referrals, record conversions, calculate 15% recurring commissions, and process withdrawals.

## Commission Rate
**15%** of every payment from referred users, recurring for the lifetime of the client.

---

## Sub-workflow: Track Referral Click

**Trigger:** User visits site with `?ref=CODE` query parameter

**Steps:**
1. Read `ref` param from URL
2. Look up `User` with `affiliateCode = ref`
3. Store referrer ID in localStorage: `nuclear_ref = { referrerId, code, timestamp }`
4. Cookie also set: `nuclear_ref` (30-day expiry) for cross-session tracking

---

## Sub-workflow: Record Conversion

**Trigger:** New user registers while referral cookie/localStorage exists

**Steps:**
1. After successful registration, check for `nuclear_ref` in request (cookie or body param)
2. Look up referrer by `affiliateCode`
3. Verify referrer ≠ new user (prevent self-referral)
4. Create `AffiliateReferral` record:
```ts
await prisma.affiliateReferral.create({
  data: {
    referrerId: referrer.id,
    referredId: newUser.id,
    commission: 0,
    status: 'pending',
  }
})
```
5. Clear the referral cookie

**Coupon-based tracking:**
- If user applies a coupon at checkout that belongs to an affiliate, create referral record the same way
- Coupon `affiliateId` links to the referrer

---

## Sub-workflow: Calculate and Credit Commission

**Trigger:** Payment marked as PAID (after webhook confirmation)

**Steps:**
1. Call `tools/calculate_affiliate_commission.js <paymentAmount> <referredUserId>`
2. Tool performs:
   - Find `AffiliateReferral` for this user
   - Calculate: `commission = paymentAmount * 0.15`
   - Update `AffiliateReferral.commission += commission`
   - Update `User.creditBalance += commission` (referrer's balance)
   - Send `affiliate_commission` email to referrer
3. Commission appears immediately in referrer's dashboard as "pending" until withdrawal is approved

---

## Sub-workflow: Withdrawal Request

**Trigger:** `POST /api/v1/affiliate/withdraw`

**Required Inputs:**
- `amount` (float, must be ≤ creditBalance, min $10)
- `paypalEmail` (string, validated)
- `userId` (from JWT)

**Steps:**
1. Validate amount: `amount >= 10 && amount <= user.creditBalance`
2. Create `AffiliateWithdrawal` record with `status: 'pending'`
3. Deduct amount from `user.creditBalance` immediately (holds funds)
4. Notify admin via notification record
5. Return: `{ success: true, data: { withdrawal } }`

---

## Sub-workflow: Admin Approves / Rejects Withdrawal

**Trigger:** Admin action on `/admin/affiliate`

**Approve:**
1. `PUT /api/v1/admin/affiliate/withdrawals/:id` with `{ status: 'approved' }`
2. Update `AffiliateWithdrawal.status = 'approved'`
3. Admin manually sends PayPal payment (out of system scope)

**Reject:**
1. Update `status = 'rejected'`
2. Refund amount back to `user.creditBalance`
3. Notify user via notification

---

## Edge Cases
- Self-referral: check `referrerId !== newUser.id` before creating referral
- Commission on refunded payments: if invoice is refunded, reverse the commission (deduct from referrer's balance)
- Minimum withdrawal: $10 to avoid micro-transactions
- If referral record missing at payment time: skip silently, log to Winston
