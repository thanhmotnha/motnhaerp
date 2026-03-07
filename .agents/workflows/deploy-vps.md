---
description: Deploy and manage motnha ERP on production VPS
---

# VPS Production Server Info

- **Host**: `192.168.3.80`
- **Port**: `22`
- **User**: `jason`
- **Password**: `123z123z`
- **Hostname**: `jason-HP-EliteDesk-800-G3-DM-35W`

## Paths on VPS

- **App directory**: `/home/jason/actions-runner/_work/motnha/motnha/`
- **Alt app dir**: `/home/jason/motnha/`
- **Env file**: `/home/jason/actions-runner/_work/motnha/motnha/.env`
- **Docker compose**: `docker-compose.prod.yml`
- **Docker project name**: `motnha`

## SSH Command Pattern

```bash
# Run a command on VPS (will prompt for password: 123z123z)
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "COMMAND_HERE"
```

## Common Operations

// turbo-all

### Restart app container
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "cd /home/jason/actions-runner/_work/motnha/motnha && docker compose -p motnha -f docker-compose.prod.yml up -d app"
```

### Check container status
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "docker ps --filter name=motnha --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### View app logs
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "docker logs motnha-app --tail 50"
```

### Add env variable
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "echo 'KEY=VALUE' >> /home/jason/actions-runner/_work/motnha/motnha/.env"
```

### Rebuild and restart (after code changes)
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "cd /home/jason/actions-runner/_work/motnha/motnha && docker compose -p motnha -f docker-compose.prod.yml build app && docker compose -p motnha -f docker-compose.prod.yml up -d app"
```

### Prisma DB push
```bash
ssh -o StrictHostKeyChecking=no jason@192.168.3.80 "cd /home/jason/actions-runner/_work/motnha/motnha && DATABASE_URL='postgresql://postgres:PASS@localhost:5432/motnhaerp?schema=public' npx prisma db push"
```

## CI/CD
- GitHub Actions self-hosted runner on this VPS
- Push to `main` → auto triggers `.github/workflows/deploy.yml`
- Secrets managed via GitHub repo settings: https://github.com/sherlock-126/motnha/settings/secrets/actions

## Domain
- Production URL: `https://admin.tiktak.vn`
