/**
 * Sentry Error Tracking Setup
 * 
 * SETUP INSTRUCTIONS:
 * 1. npm install @sentry/nextjs
 * 2. Thêm SENTRY_DSN vào .env:
 *    SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 * 3. Import file này vào app/layout.js
 * 
 * Hiện tại dùng fallback console-based tracking
 * khi chưa install @sentry/nextjs
 */

const SENTRY_DSN = process.env.SENTRY_DSN;

let Sentry = null;

// Try to import Sentry if installed
try {
    if (SENTRY_DSN) {
        Sentry = require(/* webpackIgnore: true */ '@sentry/nextjs');
        Sentry.init({
            dsn: SENTRY_DSN,
            tracesSampleRate: 0.1,
            environment: process.env.NODE_ENV || 'development',
            beforeSend(event) {
                // Filter sensitive data
                if (event.request?.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                return event;
            },
        });
        console.log('✅ Sentry initialized');
    }
} catch (e) {
    // @sentry/nextjs not installed yet
}

/**
 * Report error to Sentry (or console fallback)
 */
export function captureError(error, context = {}) {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        ...context,
        timestamp: new Date().toISOString(),
    };

    if (Sentry) {
        Sentry.captureException(error, { extra: context });
    } else {
        console.error('🔴 [Error Track]', errorInfo);
    }

    return errorInfo;
}

/**
 * Report message to Sentry
 */
export function captureMessage(message, level = 'info', context = {}) {
    if (Sentry) {
        Sentry.captureMessage(message, { level, extra: context });
    } else {
        console.log(`📋 [${level.toUpperCase()}]`, message, context);
    }
}

/**
 * Set user context for error tracking
 */
export function setUser(user) {
    if (Sentry) {
        Sentry.setUser({ id: user.id, email: user.email, username: user.name });
    }
}

export default { captureError, captureMessage, setUser };
