/**
 * Wrapper around fetch with error handling, auto redirect on 401.
 */
export async function apiFetch(url, options = {}) {
    // Auto-stringify body if it's a plain object (not FormData, Blob, string, etc.)
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer)) {
        options = { ...options, body: JSON.stringify(options.body) };
    }
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });

    if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (res.status === 429) {
        throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
    }

    const data = await res.json();

    if (!res.ok) {
        const msg = data.error || data.message || 'Lỗi hệ thống';
        throw new Error(msg);
    }

    return data;
}

// Fetch data từ Nexus office3 (qua server-side proxy)
export async function fetchClaudeOffice3(options = {}) {
    return await apiFetch('/api/nexus/office3', options);
}
