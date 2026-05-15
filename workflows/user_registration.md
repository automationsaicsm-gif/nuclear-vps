# Workflow: User Registration

## Objective
Register a new user, generate their affiliate code, and send a welcome email.

## Trigger
`POST /api/v1/auth/register`

## Required Inputs
- `firstName` (string, required)
- `lastName` (string, required)
- `email` (string, required, unique)
- `password` (string, min 8 chars)
- `country` (string, ISO code)
- `phone` (string, optional)
- `company` (string, optional)

## Steps

### 1. Validate Input
- Use Zod schema validation middleware
- Return 400 with field-level errors if validation fails
- Normalize email to lowercase

### 2. Check Email Uniqueness
- Query `User` table for existing email
- Return 409 `{ error: "Email already registered" }` if found

### 3. Hash Password
- Use `bcrypt.hash(password, 12)`

### 4. Generate Affiliate Code
- Generate 6-char alphanumeric string: `crypto.randomBytes(3).toString('hex').toUpperCase()`
- Verify uniqueness in DB; regenerate if collision (rare)

### 5. Create User Record
```ts
await prisma.user.create({
  data: { firstName, lastName, email, passwordHash, country, phone, company, affiliateCode, role: 'CLIENT' }
})
```

### 6. Create JWT
- Sign with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (default 7d)
- Payload: `{ userId, role }`

### 7. Set Auth Cookie
- HTTP-only cookie: `nuclear_token`
- SameSite: Strict, Secure in production

### 8. Send Welcome Email
- Call `tools/send_email.js` with template `welcome`
- Data: `{ firstName, dashboardUrl }`
- Non-blocking: log failure but don't fail registration

### 9. Return Response
```json
{
  "success": true,
  "data": { "user": { "id", "firstName", "lastName", "email", "role", "affiliateCode" } }
}
```

## Error Handling
| Error | Status | Response |
|-------|--------|----------|
| Validation failed | 400 | `{ error, details: [] }` |
| Email taken | 409 | `{ error: "Email already registered" }` |
| DB error | 500 | `{ error: "Registration failed" }` |

## Edge Cases
- If affiliate code generation collides 3 times, use UUID fallback
- If email sending fails, log to Winston but don't block registration
- Rate limit: 5 registrations per IP per 15 minutes
