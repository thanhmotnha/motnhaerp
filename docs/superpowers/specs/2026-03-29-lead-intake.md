# Spec: Lead Intake & Notifications (Sub-project A)

**Ngày:** 2026-03-29
**Trạng thái:** Approved
**Phạm vi:** `prisma/schema.prisma`, `app/api/leads/`, `app/api/notifications/`, `components/settings/IntegrationTab.js`, `app/admin/settings/page.js`, `components/Header.js`, `components/ui/NotificationBell.js`, `app/customers/page.js`

---

## Bối cảnh

Leads từ website WordPress và Facebook Lead Ads hiện phải nhập tay vào ERP. Mục tiêu: tự động tạo khách hàng khi có lead mới, phát hiện trùng SĐT, thông báo ngay cho nhân viên qua in-app bell và Zalo OA.

---

## Schema thay đổi

### `Customer` model — thêm 2 field

```prisma
facebookUrl    String  @default("")   // staff tự điền FB profile URL nếu cần
facebookLeadId String  @default("")   // lưu FB leadgen_id để tránh duplicate
```

### Model mới: `Notification`

```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   // 'new_lead' | 'follow_up'
  title     String
  body      String
  entityId  String   @default("")   // customerId
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## API Endpoints

### `POST /api/leads/intake`

**Auth:** Header `x-api-key` so sánh với `leadApiKey` trong Settings. Public route — dùng `withAuth(handler, { public: true })` nhưng tự validate API key.

**Body:**
```json
{
  "name": "Nguyễn Văn A",
  "phone": "0987654321",
  "email": "a@example.com",
  "source": "Website",
  "notes": "Quan tâm nội thất phòng khách",
  "utmCampaign": "spring2026"
}
```

**Logic:**
1. Validate: `name` và `phone` bắt buộc
2. Check trùng SĐT: `prisma.customer.findFirst({ where: { phone, deletedAt: null } })`
   - Nếu trùng → thêm TrackingLog `"Lead trùng từ [source]: [notes]"`, bỏ qua tạo mới
   - Nếu có `facebookLeadId` trùng → bỏ qua hoàn toàn (duplicate webhook)
3. Tạo Customer: `pipelineStage='Lead'`, `source=source`, `salesPerson=''`
4. Tạo Notification: `type='new_lead'`, `title='Lead mới từ [source]'`, `body='[name] - [phone]'`, `entityId=customer.id`
5. Gửi Zalo OA notification (fire-and-forget, không block response)
6. Return `{ customerId, created: true/false }`

---

### `GET /api/leads/facebook`

**Auth:** Public. Facebook webhook verification.

**Query params:** `hub.mode`, `hub.verify_token`, `hub.challenge`

**Logic:**
- Nếu `hub.mode === 'subscribe'` và `hub.verify_token` khớp với `facebookVerifyToken` trong Settings → trả `hub.challenge` với status 200
- Ngược lại → 403

---

### `POST /api/leads/facebook`

**Auth:** Public. Xác thực bằng FB signature header `x-hub-signature-256`.

**Logic:**
1. Verify HMAC signature dùng `facebookAppSecret`
2. Parse body: lấy `leadgen_id` từ `entry[0].changes[0].value`
3. Gọi Graph API: `GET https://graph.facebook.com/v19.0/{leadgen_id}?fields=id,field_data&access_token={facebookPageToken}`
4. Parse `field_data` → extract `full_name`, `phone_number`, `email`
5. Gọi internal intake logic (tương tự `/api/leads/intake`) với `source='Facebook Lead Ads'`, `facebookLeadId=leadgen_id`
6. Return 200 OK (Facebook yêu cầu response nhanh < 20s)

---

### `GET /api/notifications`

**Auth:** `withAuth`

**Response:**
```json
{
  "notifications": [...],
  "unreadCount": 3
}
```

Trả 20 notification mới nhất, sắp xếp `createdAt desc`.

---

### `PATCH /api/notifications/read`

**Auth:** `withAuth`

**Body:** `{}` (mark all read) hoặc `{ ids: ["id1", "id2"] }`

**Logic:** `prisma.notification.updateMany({ where: { read: false }, data: { read: true } })`

---

## Zalo OA Integration

**Endpoint Zalo:** `POST https://openapi.zalo.me/v3.0/oa/message/cs`

**Logic trong `lib/zaloNotify.js`:**
```javascript
export async function sendZaloLeadNotification(customer) {
    const settings = await getSettings(); // fetch từ DB
    const token = settings.zaloOaToken;
    const recipientIds = (settings.zaloRecipients || '').split(',').map(s => s.trim()).filter(Boolean);

    for (const userId of recipientIds) {
        await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
            method: 'POST',
            headers: { 'access_token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { user_id: userId },
                message: { text: `🔔 Lead mới [${customer.source}]\n👤 ${customer.name}\n📞 ${customer.phone}` }
            })
        });
    }
}
```

Fire-and-forget — lỗi Zalo không làm fail response chính.

---

## Settings — Tab "🔌 Tích hợp"

**File:** `components/settings/IntegrationTab.js`

**Fields:**

| Key trong DB | Label | UI |
|---|---|---|
| `leadApiKey` | Lead API Key | Input readonly + nút Copy + nút Regenerate |
| `facebookPageToken` | Facebook Page Access Token | Input password |
| `facebookAppSecret` | Facebook App Secret (verify webhook signature) | Input password |
| `facebookVerifyToken` | Facebook Verify Token | Input text |
| `zaloOaToken` | Zalo OA Access Token | Input password |
| `zaloRecipients` | Zalo UID nhận thông báo | Textarea, mỗi UID 1 dòng hoặc cách nhau bằng dấu phẩy |

Thêm vào `MAIN_TABS` trong `app/admin/settings/page.js`:
```javascript
{ key: 'integration', label: '🔌 Tích hợp' }
```

Chỉ hiện với `giam_doc`.

Regenerate API Key: tạo random string 32 ký tự, lưu vào Settings DB.

---

## UI — Notification Bell

**File:** `components/ui/NotificationBell.js`

Component hiển thị trong `components/Header.js`:

```
🔔 [3]   ← badge đỏ khi unreadCount > 0
    ↓ click
┌─────────────────────────────────┐
│ Thông báo                [✓ Đọc tất cả] │
├─────────────────────────────────┤
│ 🟢 Lead mới (Facebook Lead Ads) │
│    Nguyễn Văn A · 0987 654 321  │
│    2 phút trước          [→ Xem] │
├─────────────────────────────────┤
│ 🟢 Lead mới (Website)           │
│    Trần Thị B · 0912 345 678    │
│    1 giờ trước           [→ Xem] │
└─────────────────────────────────┘
```

- Poll `GET /api/notifications` mỗi 30s khi user đang online
- Click "→ Xem" → navigate đến `/customers/{customer.code}`
- Click "✓ Đọc tất cả" → `PATCH /api/notifications/read` → badge biến mất
- Dropdown đóng khi click ngoài

---

## UI — Customer Card Zalo/FB Link

**File:** `app/customers/page.js` (kanban card + table row)

Thêm vào card/row:
```jsx
{customer.phone && (
  <a href={`https://zalo.me/${customer.phone.replace(/\s/g, '')}`}
     target="_blank" rel="noopener noreferrer"
     style={{ fontSize: 11, color: 'var(--text-accent)' }}>
    💬 Zalo
  </a>
)}
{customer.facebookUrl && (
  <a href={customer.facebookUrl} target="_blank" rel="noopener noreferrer"
     style={{ fontSize: 11, color: '#1877F2' }}>
    FB
  </a>
)}
```

---

## Không thay đổi

- Logic tạo Customer hiện tại — giữ nguyên
- Pipeline/kanban drag-drop — giữ nguyên
- `withAuth` pattern — giữ nguyên
- Các tab Settings hiện có — giữ nguyên

---

## Tiêu chí hoàn thành

- [ ] `Customer.facebookUrl` và `Customer.facebookLeadId` tồn tại trong DB
- [ ] `Notification` model tồn tại trong DB
- [ ] `POST /api/leads/intake` nhận data từ WordPress, tạo KH, phát hiện trùng SĐT
- [ ] `GET + POST /api/leads/facebook` xác thực + nhận Facebook Lead Ads
- [ ] Bell icon trong Header hiện unreadCount, dropdown hiện danh sách lead mới
- [ ] Mark as read hoạt động
- [ ] Tab "🔌 Tích hợp" trong Settings với đủ 5 fields
- [ ] Zalo link hiện trên customer card/row
- [ ] Zalo OA notification gửi khi có lead mới (fire-and-forget)
- [ ] Không lỗi console
