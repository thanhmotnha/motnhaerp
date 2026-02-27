/**
 * Wrapper around fetch with error handling, auto redirect on 401.
 */
export async function apiFetch(url, options = {}) {
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
