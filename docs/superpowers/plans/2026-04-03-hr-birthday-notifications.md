# HR Birthday Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily automatic birthday notifications for employees — in-app notification + Lark webhook. Triggered by cron or manual call.

**Architecture:** Cron-safe API route at `/api/cron/birthday`. Uses CRON_SECRET env var for auth (not withAuth — external trigger). Creates `Notification` records. Sends to Lark webhook if configured.

**Tech Stack:** Next.js App Router, Prisma, Lark Webhook (LARK_WEBHOOK_URL env var)

---

### Task 1: Create birthday cron API route

**Files:**
- Create: `app/api/cron/birthday/route.js`

- [ ] **Step 1: Create route**

```javascript
// app/api/cron/birthday/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function sendLarkMessage(text) {
    const webhookUrl = process.env.LARK_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_type: 'text', content: { text } }),
        });
    } catch { /* silent fail */ }
}

export async function GET(request) {
    // Validate cron secret
    const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    // Find employees with birthday today (match month and day)
    const employees = await prisma.employee.findMany({
        where: {
            dateOfBirth: { not: null },
            status: 'Đang làm',
        },
        select: { id: true, name: true, dateOfBirth: true, position: true },
    });

    const birthdayEmployees = employees.filter(emp => {
        if (!emp.dateOfBirth) return false;
        const dob = new Date(emp.dateOfBirth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    if (birthdayEmployees.length === 0) {
        return NextResponse.json({ message: 'No birthdays today', count: 0 });
    }

    const names = birthdayEmployees.map(e => e.name).join(', ');
    const title = `🎂 Sinh nhật hôm nay: ${names}`;
    const message = `Chúc mừng sinh nhật ${names}! Chúc bạn một ngày tuyệt vời và năm mới nhiều sức khỏe, hạnh phúc!`;

    // Create in-app notification
    await prisma.notification.create({
        data: {
            type: 'info',
            icon: '🎂',
            title,
            message,
            link: '/hr',
            source: 'birthday-cron',
            expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // expires in 24h
        },
    });

    // Send Lark notification
    const larkText = `🎂 Sinh nhật hôm nay!\n${birthdayEmployees.map(e => `• ${e.name}${e.position ? ` (${e.position})` : ''}`).join('\n')}\n\nChúc mừng sinh nhật các bạn! 🎉`;
    await sendLarkMessage(larkText);

    return NextResponse.json({ message: 'Birthday notifications sent', count: birthdayEmployees.length, employees: birthdayEmployees.map(e => e.name) });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/birthday/route.js
git commit -m "feat(hr): add birthday cron endpoint with in-app + Lark notifications"
```

---

### Task 2: Add birthday test button to HR page

**Files:**
- Modify: `app/hr/page.js`

This adds a "Test" button visible only to giam_doc/pho_gd so they can manually trigger birthday check.

- [ ] **Step 1: Find the HR page header or settings area**

Read `app/hr/page.js` and find a suitable place to add a manual trigger button (e.g., near existing admin buttons or in a settings section).

- [ ] **Step 2: Add test button using useRole hook**

In the component, import `useRole` and add:

```javascript
const { role } = useRole();
```

Add a button visible only to managers in the page header or footer:

```javascript
{['giam_doc', 'pho_gd'].includes(role) && (
    <button
        className="btn btn-ghost btn-sm"
        title="Kiểm tra sinh nhật hôm nay và gửi thông báo"
        onClick={async () => {
            const res = await fetch('/api/cron/birthday');
            const d = await res.json();
            alert(d.count > 0 ? `Đã gửi: ${d.employees?.join(', ')}` : 'Hôm nay không có sinh nhật');
        }}
    >
        🎂 Test sinh nhật
    </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/hr/page.js
git commit -m "feat(hr): add manual birthday notification test button for managers"
```

---

### Task 3: Document cron setup instructions

**Files:**
- Create: `docs/cron-setup.md`

- [ ] **Step 1: Create setup doc**

```markdown
# Cron Job Setup

## Birthday Notifications

Endpoint: `GET /api/cron/birthday`

Set env var `CRON_SECRET=<random-string>` in production.

### Linux/Docker cron (server):
```
# Run daily at 8:00 AM
0 8 * * * curl -s "https://erp.motnha.vn/api/cron/birthday?secret=YOUR_CRON_SECRET" >> /var/log/cron.log 2>&1
```

### Lark notifications:
Set `LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/...` in .env

### Zalo OA (future):
When Zalo OA ZNS is configured, add `ZALO_OA_ACCESS_TOKEN` and `ZALO_OA_TEMPLATE_ID` to trigger ZNS messages.
```

- [ ] **Step 2: Commit**

```bash
git add docs/cron-setup.md
git commit -m "docs: add cron job setup instructions for birthday notifications"
```
