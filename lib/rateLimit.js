const rateLimitMap = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;
const CLEANUP_EVERY = 100; // lazy cleanup every N calls

let callCount = 0;

function maybeCleanup() {
    if (++callCount % CLEANUP_EVERY !== 0) return;
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
        if (now - entry.windowStart > WINDOW_MS * 2) {
            rateLimitMap.delete(key);
        }
    }
}

export function rateLimit(identifier) {
    maybeCleanup();

    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
        rateLimitMap.set(identifier, { windowStart: now, count: 1 });
        return { success: true, remaining: MAX_REQUESTS - 1 };
    }

    entry.count++;
    if (entry.count > MAX_REQUESTS) {
        return { success: false, remaining: 0 };
    }

    return { success: true, remaining: MAX_REQUESTS - entry.count };
}

// Export for testing
export function _resetForTest() {
    rateLimitMap.clear();
    callCount = 0;
}
