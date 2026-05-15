# Workflow: Ticket Management

## Objective
Handle the full lifecycle of a support ticket from creation through resolution.

## Trigger
User action on `/dashboard/tickets` or admin action on `/admin/tickets`

## Ticket Lifecycle

```
OPEN → IN_PROGRESS → WAITING_CLIENT → RESOLVED → CLOSED
                   ↗ (admin replies)
```

---

## Sub-workflow: Create Ticket

**Trigger:** `POST /api/v1/tickets`

**Required Inputs:**
- `subject` (string, max 200 chars)
- `department` (GENERAL | BILLING | TECHNICAL | SALES)
- `priority` (LOW | MEDIUM | HIGH | URGENT)
- `message` (string, min 20 chars)
- `attachments` (files[], optional, max 3, 5MB each, jpg/png/pdf/txt/log)
- `userId` (from JWT)

**Steps:**
1. Validate input (Zod schema)
2. Generate ticket number: `TKT-${padded6digits}` (query max ticketNumber, increment)
3. Handle file uploads via Multer: save to `.tmp/uploads/`, store paths in `attachments[]`
4. Create Ticket + first TicketMessage in transaction:
```ts
await prisma.$transaction([
  prisma.ticket.create({ data: { userId, ticketNumber, subject, department, priority, status: 'OPEN' } }),
  prisma.ticketMessage.create({ data: { ticketId, authorId: userId, authorRole: 'CLIENT', message, attachments } })
])
```
5. Create Notification for all ADMIN/SUPPORT users
6. Return `{ success: true, data: { ticket } }`

---

## Sub-workflow: Reply to Ticket

**Trigger:** `POST /api/v1/tickets/:id/reply` (client) or `POST /api/v1/admin/tickets/:id/reply` (admin)

**Steps:**
1. Verify ticket belongs to user (client) or skip check (admin/support)
2. Check ticket is not CLOSED
3. Create TicketMessage:
```ts
await prisma.ticketMessage.create({
  data: { ticketId, authorId, authorRole: user.role, message, attachments }
})
```
4. Update ticket status:
   - If admin replied: set `IN_PROGRESS` → `WAITING_CLIENT`
   - If client replied: set `WAITING_CLIENT` → `IN_PROGRESS`
5. Send email notification:
   - Client reply → email all SUPPORT/ADMIN users
   - Admin reply → email ticket owner via `tools/send_email.js` template `ticket_reply`

---

## Sub-workflow: Close Ticket

**Trigger:** `PUT /api/v1/tickets/:id/close`

**Steps:**
1. Verify ownership or admin role
2. `await prisma.ticket.update({ where: { id }, data: { status: 'CLOSED' } })`
3. Return success

---

## Edge Cases
- Attachments: validate MIME type server-side (not just extension)
- File size limit: enforced by Multer `limits: { fileSize: 5 * 1024 * 1024 }`
- Max 3 attachments: check `req.files.length <= 3` before processing
- Closed tickets cannot receive replies: return 400 `{ error: "Ticket is closed" }`
- Deleted attachments: if user deletes account, retain ticket history but anonymize user fields
