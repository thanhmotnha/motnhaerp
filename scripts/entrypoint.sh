#!/bin/sh
set -e

echo "==> Syncing static assets to volume..."
if [ -d "/app/public-seed/uploads" ]; then
    # Use cp without -n (Alpine busybox doesn't support it)
    # Copy all seed files, overwrite is fine for product images
    cp -r /app/public-seed/uploads/* /app/public/uploads/ 2>/dev/null || true
    COUNT=$(ls /app/public/uploads/products/ 2>/dev/null | wc -l)
    echo "==> Synced $COUNT product images"
fi

echo "==> Starting application..."
exec node server.js
