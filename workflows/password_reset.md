# Workflow: Password Reset

## Objective
Allow users to securely reset their password via a time-limited email link.

## Token Expiry
**1 hour** from generation time.

---

## Sub-workflow: Request Reset

**Trigger:** `POST /api/v1/auth/forgot-password`

**Required Inputs:**
- `email` (string)

**Steps:**
1. Validate email format
2. Look up user by email (normalize to lowercase)
3. **If user not found:** Return success anyway (prevent email enumeration)
4. Generate secure token: `crypto.randomBytes(32).toString('hex')`
5. Store in `PasswordReset` table:
```ts
await prisma.passwordReset.create({
  data: {
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
    used: false,
  }
})
```
6. Build reset URL: `${WEB_URL}/reset-password/${token}`
7. Send email via `tools/send_email.js` template `password_reset`:
   - Data: `{ firstName: user.firstName, resetUrl }`
8. Return: `{ success: true, data: { message: "Reset email sent if account exists" } }`

**Rate Limit:** Max 3 reset requests per email per hour

---

## Sub-workflow: Verify and Reset

**Trigger:** `POST /api/v1/auth/reset-password`

**Required Inputs:**
- `token` (string)
- `password` (string, min 8 chars)

**Steps:**
1. Validate password strength (min 8 chars)
2. Find `PasswordReset` record:
```ts
const record = await prisma.passwordReset.findUnique({
  where: { token },
  include: { user: true }
})
```
3. **Validation checks:**
   - Record exists → 400 `{ error: "Invalid or expired token" }`
   - `record.used === true` → 400 `{ error: "Token already used" }`
   - `record.expiresAt < new Date()` → 400 `{ error: "Token expired" }`
4. Hash new password: `bcrypt.hash(password, 12)`
5. Update user password + invalidate token in transaction:
```ts
await prisma.$transaction([
  prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  prisma.passwordReset.update({ where: { token }, data: { used: true } }),
  prisma.session.deleteMany({ where: { userId: record.userId } }) // invalidate all sessions
])
```
6. Clear all Redis session keys for this user
7. Return: `{ success: true, data: { message: "Password updated" } }`

---

## Cleanup (via tools/cleanup_expired_sessions.js)
- Run nightly: delete all `PasswordReset` records where `used: true` OR `expiresAt < now`
- Keeps the table lean and prevents stale token reuse attempts

---

## Edge Cases
- Token reuse: `used: true` check prevents replay attacks
- Expired token: always check `expiresAt` before allowing reset
- Multiple reset requests: all previously issued tokens for a user are still valid until used/expired (simplest UX); could tighten by invalidating old tokens on new request if security policy requires it
- Log all reset requests to Winston with userId and IP for audit trail
