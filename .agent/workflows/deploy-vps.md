---
description: Deploy and manage motnha ERP on production VPS
---

# /deploy-vps — Deploy MỘT NHÀ ERP lên VPS

// turbo-all

## Pre-flight Checks

### 1. Kiểm tra git status
```bash
cd d:/Codeapp/motnha && git status --short
```
Không deploy nếu có uncommitted changes.

### 2. Chạy tests
```bash
cd d:/Codeapp/motnha && npm test -- --passWithNoTests
```

### 3. Build local test
```bash
cd d:/Codeapp/motnha && npm run build
```
Đảm bảo build pass trước khi push lên VPS.

## Deploy Steps

### 4. Push code lên VPS
```bash
cd d:/Codeapp/motnha && git push origin main
```

### 5. SSH vào VPS và deploy
```bash
ssh jason@192.168.3.80 "cd /opt/motnha && git pull origin main && docker compose -f docker-compose.prod.yml build --no-cache app && docker compose -f docker-compose.prod.yml up -d"
```

### 6. Chạy Prisma migrate trên VPS
```bash
ssh jason@192.168.3.80 "cd /opt/motnha && docker exec motnha-app npx prisma migrate deploy"
```

### 7. Health check
```bash
ssh jason@192.168.3.80 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
```
Kỳ vọng: 200 hoặc 307 (redirect to login).

### 8. Kiểm tra logs
```bash
ssh jason@192.168.3.80 "docker logs motnha-app --tail 20"
```

## Rollback

### Nếu deploy lỗi:
```bash
ssh root@100.111.242.16 "cd /opt/motnha && git log --oneline -5"
```
Chọn commit hash cũ:
```bash
ssh root@100.111.242.16 "cd /opt/motnha && git checkout <commit-hash> && docker compose -f docker-compose.prod.yml up -d --build app"
```

## Lưu ý
- VPS LAN IP: `192.168.3.80` (SSH user: `jason`, password: `123z123z`)
- VPS Tailscale IP: `100.111.242.16`
- Ưu tiên dùng LAN IP khi cùng mạng
- NEXTAUTH_URL: `http://100.111.242.16:3000`
- DB: PostgreSQL 16 Alpine trong Docker (container: `motnha-postgres`, user: `postgres`, db: `motnhaerp`)
- App container: `motnha-app`
- Storage: Cloudflare R2
- Next.js standalone output + entrypoint.sh
