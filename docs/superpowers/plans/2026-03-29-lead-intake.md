# Lead Intake & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-create customers from WordPress forms and Facebook Lead Ads, send in-app + Zalo OA notifications, and add Zalo quick-link buttons on customer cards.

**Architecture:** A shared `lib/leadIntake.js` handles duplicate detection, customer creation, and notification. Two public API routes call this logic — one for generic webhooks (WordPress), one for Facebook Lead Ads. The existing `Notification` model and `NotificationBell` component are reused unchanged. A new `IntegrationTab` settings component stores API keys and tokens.

**Tech Stack:** Next.js 16 App Router, Prisma 6 (`SystemSetting`, `Customer`, `Notification`, `TrackingLog`), `withAuth` from `@/lib/apiHandler`, `generateCode` from `@/lib/generateCode`, Node.js `crypto` for HMAC + API key generation, Zalo OA API v3, Facebook Graph API v19.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `facebookUrl`, `facebookLeadId` to `Customer` |
| `lib/settingsHelper.js` | Create | `getSetting(key)` / `setSetting(key, value)` from `SystemSetting` |
| `lib/zaloNotify.js` | Create | Fire-and-forget Zalo OA push notification |
| `lib/leadIntake.js` | Create | Duplicate check, create customer, create notification, call Zalo |
| `app/api/leads/intake/route.js` | Create | `POST` — generic webhook (WordPress, manual) |
| `app/api/leads/facebook/route.js` | Create | `GET` verify + `POST` FB Lead Ads webhook |
| `components/settings/IntegrationTab.js` | Create | Settings UI: API key, FB tokens, Zalo token |
| `app/admin/settings/page.js` | Modify | Add `🔌 Tích hợp` tab, import `IntegrationTab` |
| `app/customers/page.js` | Modify | Add 💬 Zalo + FB icon links on kanban cards and table rows |

---

### Task 1: Schema — add `facebookUrl` + `facebookLeadId` to Customer

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Find Customer model and add 2 fields**

  Open `prisma/schema.prisma`. Find `model Customer {`. Find the `notes` field and add two fields after it:

  ```prisma
  notes           String      @default("") @db.Text
  facebookUrl     String      @default("")
  facebookLeadId  String      @default("")
  ```

- [ ] **Step 2: Push schema**

  ```bash
  cd d:/Codeapp/motnha
  ./node_modules/.bin/prisma db push
  ```

  Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate client**

  ```bash
  npm run db:generate
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add prisma/schema.prisma
  git commit -m "feat(schema): add facebookUrl + facebookLeadId to Customer"
  ```

---

### Task 2: `lib/settingsHelper.js`

**Files:**
- Create: `lib/settingsHelper.js`

- [ ] **Step 1: Create the file**

  ```javascript
  import prisma from '@/lib/prisma';

  export async function getSetting(key) {
      const row = await prisma.systemSetting.findUnique({ where: { key } });
      return row?.value ?? null;
  }

  export async function setSetting(key, value) {
      await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
      });
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add lib/settingsHelper.js
  git commit -m "feat(lib): settingsHelper — getSetting/setSetting for SystemSetting"
  ```

---

### Task 3: `lib/zaloNotify.js`

**Files:**
- Create: `lib/zaloNotify.js`

- [ ] **Step 1: Create the file**

  ```javascript
  import { getSetting } from '@/lib/settingsHelper';

  export async function sendZaloLeadNotification({ name, phone, source }) {
      try {
          const token = await getSetting('zaloOaToken');
          const recipientsRaw = await getSetting('zaloRecipients');
          if (!token || !recipientsRaw) return;

          const recipients = recipientsRaw.split(',').map(s => s.trim()).filter(Boolean);

          await Promise.all(recipients.map(userId =>
              fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
                  method: 'POST',
                  headers: {
                      'access_token': token,
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      recipient: { user_id: userId },
                      message: {
                          text: `🔔 Lead mới [${source}]\n👤 ${name}\n📞 ${phone}`,
                      },
                  }),
              }).catch(e => console.error('[ZaloNotify]', e.message))
          ));
      } catch (e) {
          console.error('[ZaloNotify]', e.message);
      }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add lib/zaloNotify.js
  git commit -m "feat(lib): zaloNotify — fire-and-forget Zalo OA lead notification"
  ```

---

### Task 4: `lib/leadIntake.js`

**Files:**
- Create: `lib/leadIntake.js`

- [ ] **Step 1: Create the file**

  ```javascript
  import prisma from '@/lib/prisma';
  import { withCodeRetry } from '@/lib/generateCode';
  import { sendZaloLeadNotification } from '@/lib/zaloNotify';

  /**
   * Core lead processing logic.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.phone
   * @param {string} [params.email]
   * @param {string} params.source  — e.g. 'Website', 'Facebook Lead Ads'
   * @param {string} [params.notes]
   * @param {string} [params.utmCampaign]
   * @param {string} [params.facebookLeadId]
   * @returns {Promise<{ customerId: string, created: boolean }>}
   */
  export async function processLead({
      name,
      phone,
      email = '',
      source,
      notes = '',
      utmCampaign = '',
      facebookLeadId = '',
  }) {
      // 1. Deduplicate by facebookLeadId (prevent duplicate FB webhooks)
      if (facebookLeadId) {
          const existing = await prisma.customer.findFirst({
              where: { facebookLeadId, deletedAt: null },
              select: { id: true },
          });
          if (existing) return { customerId: existing.id, created: false };
      }

      // 2. Deduplicate by phone
      const byPhone = await prisma.customer.findFirst({
          where: { phone, deletedAt: null },
          select: { id: true, code: true },
      });
      if (byPhone) {
          await prisma.trackingLog.create({
              data: {
                  customerId: byPhone.id,
                  content: `Lead trùng từ ${source}${notes ? ': ' + notes : ''}${utmCampaign ? ' [' + utmCampaign + ']' : ''}`,
                  type: 'Ghi chú',
                  createdBy: 'system',
              },
          });
          return { customerId: byPhone.id, created: false };
      }

      // 3. Create new customer
      const customer = await withCodeRetry('customer', 'KH-', async (code) => {
          return prisma.customer.create({
              data: {
                  code,
                  name,
                  phone,
                  email,
                  source,
                  notes: notes + (utmCampaign ? ` [${utmCampaign}]` : ''),
                  pipelineStage: 'Lead',
                  status: 'Lead',
                  facebookLeadId,
              },
          });
      });

      // 4. Create in-app notification (uses existing Notification model)
      await prisma.notification.create({
          data: {
              type: 'info',
              icon: '🔔',
              title: `Lead mới từ ${source}`,
              message: `${name} · ${phone}`,
              link: `/customers/${customer.code}`,
              source: 'lead_intake',
          },
      });

      // 5. Zalo OA — fire-and-forget, never blocks response
      sendZaloLeadNotification({ name, phone, source }).catch(() => {});

      return { customerId: customer.id, created: true };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add lib/leadIntake.js
  git commit -m "feat(lib): leadIntake — deduplicate, create customer, notify"
  ```

---

### Task 5: `app/api/leads/intake/route.js`

**Files:**
- Create: `app/api/leads/intake/route.js`

- [ ] **Step 1: Create the file**

  ```javascript
  import { withAuth } from '@/lib/apiHandler';
  import { NextResponse } from 'next/server';
  import { getSetting } from '@/lib/settingsHelper';
  import { processLead } from '@/lib/leadIntake';

  export const POST = withAuth(async (request) => {
      // Validate API key
      const apiKey = request.headers.get('x-api-key');
      const storedKey = await getSetting('leadApiKey');
      if (!storedKey || apiKey !== storedKey) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { name, phone, email, source = 'Website', notes, utmCampaign } = body;

      if (!name || !phone) {
          return NextResponse.json({ error: 'name và phone là bắt buộc' }, { status: 400 });
      }

      const result = await processLead({ name, phone, email, source, notes, utmCampaign });

      return NextResponse.json(result, { status: result.created ? 201 : 200 });
  }, { public: true });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/api/leads/
  git commit -m "feat(api): POST /api/leads/intake — WordPress + generic lead intake"
  ```

---

### Task 6: `app/api/leads/facebook/route.js`

**Files:**
- Create: `app/api/leads/facebook/route.js`

- [ ] **Step 1: Create the file**

  ```javascript
  import { withAuth } from '@/lib/apiHandler';
  import { NextResponse } from 'next/server';
  import crypto from 'crypto';
  import { getSetting } from '@/lib/settingsHelper';
  import { processLead } from '@/lib/leadIntake';

  // GET — Facebook webhook verification challenge
  export const GET = withAuth(async (request) => {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('hub.mode');
      const token = searchParams.get('hub.verify_token');
      const challenge = searchParams.get('hub.challenge');

      const storedToken = await getSetting('facebookVerifyToken');
      if (mode === 'subscribe' && token === storedToken) {
          return new Response(challenge, { status: 200 });
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }, { public: true });

  // POST — Facebook Lead Ads webhook
  export const POST = withAuth(async (request) => {
      const appSecret = await getSetting('facebookAppSecret');
      const pageToken = await getSetting('facebookPageToken');

      // Verify HMAC signature
      const sig = request.headers.get('x-hub-signature-256');
      const rawBody = await request.text();

      if (appSecret && sig) {
          const expected = 'sha256=' + crypto
              .createHmac('sha256', appSecret)
              .update(rawBody)
              .digest('hex');
          if (sig !== expected) {
              return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
          }
      }

      const body = JSON.parse(rawBody);

      // Process each leadgen event (Facebook sends batches)
      const entries = body?.entry ?? [];
      for (const entry of entries) {
          for (const change of entry.changes ?? []) {
              if (change.field !== 'leadgen') continue;
              const leadgenId = change.value?.leadgen_id;
              if (!leadgenId || !pageToken) continue;

              // Fetch lead data from Graph API
              try {
                  const res = await fetch(
                      `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,field_data&access_token=${pageToken}`
                  );
                  const lead = await res.json();
                  if (lead.error) continue;

                  // Parse field_data array: [{ name: 'full_name', values: ['...'] }, ...]
                  const fields = {};
                  for (const f of lead.field_data ?? []) {
                      fields[f.name] = f.values?.[0] ?? '';
                  }

                  const name = fields['full_name'] || fields['name'] || 'Khách FB';
                  const phone = fields['phone_number'] || fields['phone'] || '';
                  const email = fields['email'] || '';

                  await processLead({
                      name,
                      phone,
                      email,
                      source: 'Facebook Lead Ads',
                      facebookLeadId: leadgenId,
                  });
              } catch (e) {
                  console.error('[FB Leads webhook]', e.message);
              }
          }
      }

      // Facebook requires 200 OK quickly
      return NextResponse.json({ received: true });
  }, { public: true });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/api/leads/
  git commit -m "feat(api): GET+POST /api/leads/facebook — FB Lead Ads webhook"
  ```

---

### Task 7: `components/settings/IntegrationTab.js` + wire into settings page

**Files:**
- Create: `components/settings/IntegrationTab.js`
- Modify: `app/admin/settings/page.js`

- [ ] **Step 1: Create `IntegrationTab.js`**

  ```javascript
  'use client';
  import { useState, useEffect } from 'react';
  import { apiFetch } from '@/lib/fetchClient';
  import { useToast } from '@/components/ui/Toast';

  const FIELDS = [
      { key: 'leadApiKey', label: 'Lead API Key', type: 'readonly', hint: 'Dùng trong WordPress webhook header: x-api-key' },
      { key: 'facebookPageToken', label: 'Facebook Page Access Token', type: 'password', hint: 'Lấy từ Facebook Developer → App → Page Access Token' },
      { key: 'facebookAppSecret', label: 'Facebook App Secret', type: 'password', hint: 'Dùng để xác thực chữ ký webhook' },
      { key: 'facebookVerifyToken', label: 'Facebook Verify Token', type: 'text', hint: 'Tự đặt chuỗi bất kỳ, nhập vào khi kết nối webhook trên Facebook' },
      { key: 'zaloOaToken', label: 'Zalo OA Access Token', type: 'password', hint: 'Lấy từ Zalo OA Manager → Cài đặt → API' },
      { key: 'zaloRecipients', label: 'Zalo UID nhận thông báo', type: 'textarea', hint: 'Mỗi UID một dòng hoặc cách nhau bằng dấu phẩy' },
  ];

  export default function IntegrationTab() {
      const [values, setValues] = useState({});
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState(false);
      const { showToast } = useToast();

      useEffect(() => {
          apiFetch('/api/admin/settings')
              .then(data => {
                  const init = {};
                  FIELDS.forEach(f => { init[f.key] = data[f.key] || ''; });
                  setValues(init);
              })
              .finally(() => setLoading(false));
      }, []);

      const handleSave = async () => {
          setSaving(true);
          try {
              await apiFetch('/api/admin/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(values),
              });
              showToast('Đã lưu cài đặt tích hợp', 'success');
          } catch (e) {
              showToast(e.message || 'Lỗi lưu', 'error');
          }
          setSaving(false);
      };

      const handleRegenerate = async () => {
          const newKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          setValues(prev => ({ ...prev, leadApiKey: newKey }));
      };

      const handleCopy = (text) => {
          navigator.clipboard.writeText(text);
          showToast('Đã copy!', 'success');
      };

      if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

      return (
          <div style={{ maxWidth: 640 }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
                  Cấu hình kết nối WordPress, Facebook Lead Ads và Zalo OA.
              </p>

              {FIELDS.map(f => (
                  <div key={f.key} className="form-group" style={{ marginBottom: 20 }}>
                      <label className="form-label">{f.label}</label>
                      {f.type === 'textarea' ? (
                          <textarea
                              className="form-input"
                              rows={3}
                              value={values[f.key] || ''}
                              onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                              style={{ resize: 'vertical' }}
                          />
                      ) : f.type === 'readonly' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                  className="form-input"
                                  readOnly
                                  value={values[f.key] || '(chưa tạo)'}
                                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                              />
                              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(values[f.key])}>Copy</button>
                              <button className="btn btn-secondary btn-sm" onClick={handleRegenerate}>Tạo mới</button>
                          </div>
                      ) : (
                          <input
                              className="form-input"
                              type={f.type}
                              value={values[f.key] || ''}
                              onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                          />
                      )}
                      {f.hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</div>}
                  </div>
              ))}

              <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      <strong>WordPress webhook URL:</strong>{' '}
                      <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/intake
                      </code>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                      <strong>Facebook webhook URL:</strong>{' '}
                      <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                          {typeof window !== 'undefined' ? window.location.origin : ''}/api/leads/facebook
                      </code>
                  </p>
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
              </button>
          </div>
      );
  }
  ```

- [ ] **Step 2: Wire into `app/admin/settings/page.js`**

  **2a.** Add import after `AccountingSetupTab` import:
  ```javascript
  import IntegrationTab from '@/components/settings/IntegrationTab';
  ```

  **2b.** Add to `MAIN_TABS` array at the end:
  ```javascript
  { key: 'integration', label: '🔌 Tích hợp' },
  ```

  **2c.** Add render block after `{tab === 'accounting' && <AccountingSetupTab />}`:
  ```javascript
  {tab === 'integration' && <IntegrationTab />}
  ```

  Note: `IntegrationTab` only needs `giam_doc` — it's already protected by the existing page guard.

- [ ] **Step 3: Commit**

  ```bash
  git add components/settings/IntegrationTab.js app/admin/settings/page.js
  git commit -m "feat(settings): IntegrationTab — API key, FB tokens, Zalo OA config"
  ```

---

### Task 8: Customer list — Zalo + FB links

**Files:**
- Modify: `app/customers/page.js`

- [ ] **Step 1: Read the file to find kanban card and table row structures**

  Read `app/customers/page.js`. Find:
  - The kanban card render section (look for where `p.phone` is displayed on a card)
  - The table row render section (look for `<td>` with phone number)

- [ ] **Step 2: Add Zalo link helper function**

  Near the top of the component (after imports), add:
  ```javascript
  const zaloLink = (phone) => `https://zalo.me/${phone.replace(/\s+/g, '').replace(/^0/, '84')}`;
  ```

  Wait — actually `https://zalo.me/0987654321` works fine with leading zero. Use simpler version:
  ```javascript
  const zaloLink = (phone) => `https://zalo.me/${phone.replace(/\s+/g, '')}`;
  ```

- [ ] **Step 3: Add link buttons to kanban card**

  In the kanban card, find where `p.phone` is rendered. After the phone display, add:
  ```jsx
  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      {p.phone && (
          <a href={zaloLink(p.phone)} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: '#0068FF', textDecoration: 'none', fontWeight: 500 }}>
              💬 Zalo
          </a>
      )}
      {p.facebookUrl && (
          <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: '#1877F2', textDecoration: 'none', fontWeight: 500 }}>
              FB
          </a>
      )}
  </div>
  ```

- [ ] **Step 4: Add link buttons to table row**

  In the table view, find the phone `<td>`. Change it to include the Zalo link:
  ```jsx
  <td>
      <div>{p.phone}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {p.phone && (
              <a href={zaloLink(p.phone)} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: '#0068FF', textDecoration: 'none' }}>
                  💬 Zalo
              </a>
          )}
          {p.facebookUrl && (
              <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: '#1877F2', textDecoration: 'none' }}>
                  FB
              </a>
          )}
      </div>
  </td>
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/customers/page.js
  git commit -m "feat(customers): Zalo + FB quick links on kanban cards and table rows"
  ```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `Customer.facebookUrl` + `Customer.facebookLeadId` | Task 1 |
| `POST /api/leads/intake` — API key auth, duplicate detect, create KH | Task 5 |
| `GET /api/leads/facebook` — FB webhook verify | Task 6 |
| `POST /api/leads/facebook` — FB Lead Ads, Graph API fetch, create KH | Task 6 |
| In-app notification bell (existing, reused) | Task 4 — creates `Notification` record |
| Zalo OA notification | Tasks 3 + 4 |
| Settings tab "🔌 Tích hợp" — 6 fields incl. API key regenerate | Task 7 |
| Zalo link on customer cards | Task 8 |
| FB URL optional link on customer cards | Task 8 |
| Duplicate SĐT detection | Task 4 (`lib/leadIntake.js`) |

**Notification model:** `Notification` model already exists — Task 4 reuses it directly via `prisma.notification.create`. No schema change needed for notifications.

**`NotificationBell`:** Already exists in `components/ui/NotificationBell.js` and already wired into `Header.js` — no changes needed.

**No placeholders found.** All code complete. Types consistent across tasks.
