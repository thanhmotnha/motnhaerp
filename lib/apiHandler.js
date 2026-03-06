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
 * Wraps an API route handler with auth check, role authorization, error handling, and rate limiting.
 * @param {Function} handler - async (request, context, session) => NextResponse
 * @param {Object} options
 * @param {boolean} options.public - skip auth check
 * @param {string[]} options.roles - allowed roles (e.g., ['giam_doc', 'pho_gd']). If not set, all authenticated users are allowed.
 */
export function withAuth(handler, options = {}) {
    return async (request, context) => {
        try {
            // Auth check — try NextAuth session first, then Bearer token (mobile)
            let session = null;
            if (!options.public) {
                session = await getServerSession(authOptions);
                if (!session) {
                    session = await verifyMobileToken(request);
                }
                if (!session) {
                    return NextResponse.json(
                        { error: 'Unauthorized' },
                        { status: 401 }
                    );
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
                    return NextResponse.json(
                        { error: 'Too many requests' },
                        { status: 429 }
                    );
                }
            }

            return await handler(request, context, session);
        } catch (error) {
            console.error(`API Error [${request.method} ${request.url}]:`, error);

            // Sentry capture (non-blocking)
            try {
                const { captureError } = await import('@/lib/sentry');
                captureError(error, { method: request.method, url: request.url, user: 'unknown' });
            } catch { }

            // Prisma known error
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: 'Bản ghi đã tồn tại (trùng mã)' },
                    { status: 409 }
                );
            }
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: 'Không tìm thấy bản ghi' },
                    { status: 404 }
                );
            }

            // Zod validation error
            if (error.name === 'ZodError') {
                return NextResponse.json(
                    { error: 'Dữ liệu không hợp lệ', details: error.errors },
                    { status: 400 }
                );
            }

            // Generic error - do NOT leak internal details
            return NextResponse.json(
                { error: 'Lỗi hệ thống' },
                { status: 500 }
            );
        }
    };
}

/**
 * Enhanced wrapper: withAuth + auto activity logging for mutations (POST/PUT/PATCH/DELETE).
 * @param {Function} handler - async (request, context, session) => NextResponse
 * @param {Object} options - same as withAuth + { entityType: 'Project' }
 */
export function withAuthAndLog(handler, options = {}) {
    return withAuth(async (request, context, session) => {
        const method = request.method;
        const response = await handler(request, context, session);

        // Auto-log mutations (non-blocking)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && response.status < 400 && options.entityType) {
            try {
                const { logActivity } = await import('@/lib/activityLogger');
                const actionMap = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
                const cloned = response.clone();
                const body = await cloned.json().catch(() => ({}));
                const entity = body.data || body;

                await logActivity({
                    action: actionMap[method] || method.toLowerCase(),
                    entityType: options.entityType,
                    entityId: entity?.id || context?.params?.id || '',
                    entityLabel: entity?.code ? `${entity.code} ${entity.name || ''}`.trim() : (entity?.name || entity?.title || ''),
                    actor: session?.user?.name || 'Unknown',
                    actorId: session?.user?.id || '',
                });
            } catch (e) {
                console.error('[AutoLog] Failed:', e.message);
            }
        }

        return response;
    }, options);
}
