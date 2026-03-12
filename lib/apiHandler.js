import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Verify Bearer token from mobile app
 */
function verifyMobileToken(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        return {
            user: {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
            },
        };
    } catch (err) {
        console.error('Mobile token verify failed:', err.message);
        return null;
    }
}

/**
 * Infer entityType from URL path.
 * /api/suppliers/123 → 'Supplier'
 * /api/work-orders/123 → 'WorkOrder'
 * /api/schedule-tasks/123/contractors → 'ScheduleTask'
 */
function inferEntityType(url) {
    try {
        const path = new URL(url).pathname; // /api/suppliers/123
        const parts = path.split('/').filter(Boolean); // ['api', 'suppliers', '123']
        if (parts.length < 2 || parts[0] !== 'api') return null;

        const slug = parts[1]; // 'suppliers', 'work-orders', etc.
        // kebab-case → PascalCase, strip trailing 's'
        return slug
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('')
            .replace(/s$/, ''); // 'Suppliers' → 'Supplier', 'WorkOrders' → 'WorkOrder'
    } catch {
        return null;
    }
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACTION_MAP = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

/**
 * Wraps an API route handler with auth, role check, rate limiting, error handling,
 * and auto activity logging for mutations.
 *
 * @param {Function} handler - async (request, context, session) => NextResponse
 * @param {Object} options
 * @param {boolean}  options.public      - skip auth check
 * @param {string[]} options.roles       - allowed roles
 * @param {string}   options.entityType  - explicit entityType override (auto-inferred from URL if omitted)
 * @param {boolean}  options.skipLog     - set true to suppress auto-logging for this handler
 */
export function withAuth(handler, options = {}) {
    return async (request, context) => {
        try {
            // --- Auth ---
            let session = null;
            if (!options.public) {
                session = await getServerSession(authOptions);
                if (!session) session = verifyMobileToken(request);
                if (!session) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }

                // Role authorization
                if (options.roles && !options.roles.includes(session.user.role)) {
                    return NextResponse.json(
                        { error: 'Bạn không có quyền thực hiện thao tác này' },
                        { status: 403 }
                    );
                }

                // Rate limiting per user
                const rl = rateLimit(session.user.id);
                if (!rl.success) {
                    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
                }
            }

            const response = await handler(request, context, session);

            // --- Auto-log mutations (non-blocking) ---
            const method = request.method;
            if (
                !options.skipLog &&
                !options.public &&
                session &&
                MUTATION_METHODS.has(method) &&
                response.status < 400
            ) {
                const entityType = options.entityType || inferEntityType(request.url);
                if (entityType) {
                    logMutation(response, method, entityType, context, session).catch(e =>
                        console.error('[AutoLog] Failed:', e.message)
                    );
                }
            }

            return response;
        } catch (error) {
            console.error(`API Error [${request.method} ${request.url}]:`, error);

            // Sentry capture (non-blocking)
            try {
                const { captureError } = await import('@/lib/sentry');
                captureError(error, { method: request.method, url: request.url, user: 'unknown' });
            } catch { }

            // Prisma known errors
            if (error.code === 'P2002') {
                return NextResponse.json({ error: 'Bản ghi đã tồn tại (trùng mã)' }, { status: 409 });
            }
            if (error.code === 'P2025') {
                return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
            }

            // Zod validation error
            if (error.name === 'ZodError') {
                return NextResponse.json(
                    { error: 'Dữ liệu không hợp lệ', details: error.errors },
                    { status: 400 }
                );
            }

            return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
        }
    };
}



// --- Internal helpers ---

async function logMutation(response, method, entityType, context, session) {
    const { logActivity } = await import('@/lib/activityLogger');
    const cloned = response.clone();
    const body = await cloned.json().catch(() => ({}));
    const entity = body.data || body;

    await logActivity({
        action: ACTION_MAP[method] || method.toLowerCase(),
        entityType,
        entityId: entity?.id || context?.params?.id || '',
        entityLabel: entity?.code
            ? `${entity.code} ${entity.name || ''}`.trim()
            : (entity?.name || entity?.title || ''),
        actor: session?.user?.name || 'Unknown',
        actorId: session?.user?.id || '',
    });
}
