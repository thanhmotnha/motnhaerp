#!/bin/sh
set -e

echo "==> Syncing static assets to volume..."
# Copy product images from Docker image into the persistent volume
# Uses -n (no-clobber) so existing user-uploaded files are preserved
if [ -d "/app/public-seed/uploads" ]; then
    cp -rn /app/public-seed/uploads/* /app/public/uploads/ 2>/dev/null || true
    echo "==> Static assets synced"
fi

echo "==> Starting application..."
exec node server.js
