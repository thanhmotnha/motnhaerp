/**
 * API response time middleware — logs slow requests.
 * Usage: import '@/lib/perfMonitor' at app startup (optional).
 */

const SLOW_THRESHOLD = 2000; // 2 seconds

/**
 * Wrap a fetch call with performance monitoring.
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<Response>}
 */
export async function monitoredFetch(url, options = {}) {
    const start = performance.now();
    const response = await fetch(url, options);
    const duration = Math.round(performance.now() - start);

    if (duration > SLOW_THRESHOLD) {
        console.warn(`[SLOW API] ${options.method || 'GET'} ${url} took ${duration}ms`);
    }

    return response;
}

/**
 * Log client-side performance metrics.
 */
export function reportWebVitals() {
    if (typeof window === 'undefined') return;

    // Report core web vitals
    try {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > SLOW_THRESHOLD) {
                        console.warn(`[PERF] ${entry.name}: ${Math.round(entry.duration)}ms`);
                    }
                }
            });
            observer.observe({ entryTypes: ['navigation', 'resource'] });
        }
    } catch { }
}
