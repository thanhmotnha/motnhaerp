---
description: Deploy and manage motnha ERP on production VPS
---

# Deploy motnha ERP lên VPS

## Server Info
- **Host:** 192.168.3.80 (LAN)
- **User:** jason
- **Password:** 123z123z
- **Project path:** /home/jason/motnhaerp
- **PM2 path:** /home/jason/.npm-global/lib/node_modules/pm2/bin/pm2
- **Node:** /usr/bin/node
- **App name (pm2):** motnha

## Deploy Steps

// turbo-all

1. SSH vào VPS và pull code mới + install + build + restart:
```
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "cd /home/jason/motnhaerp && git pull && npm install && npm run build && /home/jason/.npm-global/lib/node_modules/pm2/bin/pm2 restart motnha"
```
Password khi hỏi: `123z123z`

2. Kiểm tra status:
```
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "/home/jason/.npm-global/lib/node_modules/pm2/bin/pm2 status"
```

3. Xem logs nếu lỗi:
```
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "/home/jason/.npm-global/lib/node_modules/pm2/bin/pm2 logs motnha --lines 50"
```
