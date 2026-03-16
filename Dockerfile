# ============================================
# Stage 1: Build
# ============================================
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# Note: ignore lifecycle scripts here because repo postinstall references files copied later.
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma client + optional TinyMCE copy after source is present
RUN npx prisma generate && node scripts/copy-tinymce.js || true

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl \
    libreoffice \
    font-noto font-noto-cjk font-noto-extra \
    ttf-dejavu ttf-liberation ttf-freefont \
    && rm -rf /var/cache/apk/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Seed copy: product images that need to survive volume mount
COPY --from=builder /app/public/uploads ./public-seed/uploads

# Copy entrypoint
COPY scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Fix permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache
RUN mkdir -p public/uploads && chown -R nextjs:nodejs public/uploads
RUN chown -R nextjs:nodejs public-seed

RUN mkdir -p /tmp && chmod 1777 /tmp
RUN mkdir -p /home/nextjs/.config && chown -R nextjs:nodejs /home/nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
