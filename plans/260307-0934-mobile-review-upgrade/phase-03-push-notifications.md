# Phase 03 — Push Notifications

**Ưu tiên:** HIGH | **Effort:** Medium | **Status:** Pending

---

## Hiện trạng

Mobile chưa có push notification. Server có `GET /api/notifications` nhưng chưa tích hợp push.

---

## Yêu cầu

- Nhận push khi: PO cần duyệt, expense cần duyệt, warranty ticket được assign
- Tap notification → navigate đến màn hình liên quan
- Permission request lần đầu login
- Lưu Expo Push Token lên server

---

## Tech

- `expo-notifications` (đã có trong Expo 54, không cần cài thêm)
- Server: cần endpoint `PUT /api/auth/mobile/push-token` để lưu token
- Trigger: khi tạo PO/expense/warranty → gọi Expo Push API

---

## Files cần tạo/sửa

**Mobile:**
- `mobile/lib/notifications.ts` — setup, permission request, token registration (MỚI)
- `mobile/app/_layout.tsx` — init notifications on mount, handle notification tap
- `mobile/hooks/usePushNotifications.ts` — hook quản lý (MỚI)

**Server:**
- `app/api/auth/mobile/push-token/route.js` — lưu pushToken vào User model (MỚI)
- `lib/push-notifications.js` — helper gửi push qua Expo API (MỚI)
- Trigger trong: `app/api/purchase-orders/route.js`, `app/api/warranty/route.js`

---

## Schema Change

```prisma
model User {
  // thêm field:
  pushToken String @default("")
}
```
Cần `prisma db push` sau khi thêm.

---

## Implementation Steps

1. Thêm `pushToken` vào User schema + migrate
2. Tạo `lib/push-notifications.js` — gọi `https://exp.host/--/api/v2/push/send`
3. Mobile: `notifications.ts` — request permission + get token + POST lên server
4. `_layout.tsx` — init khi app start, handle `addNotificationResponseReceivedListener`
5. Thêm trigger trong PO POST và Warranty POST để gửi push cho APPROVAL_ROLES

---

## Todo

- [ ] Prisma schema: thêm pushToken
- [ ] Server: push-token API + push helper
- [ ] Mobile: permission + token registration
- [ ] Deep link handler (tap notification → navigate)
- [ ] Trigger từ PO/warranty creation
- [ ] Test trên thiết bị thật (Expo Go không support production push)
