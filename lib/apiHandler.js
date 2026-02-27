import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Wraps an API route handler with auth check, error handling, and rate limiting.
 * @param {Function} handler - async (request, context, session) => NextResponse
 * @param {Object} options
 * @param {boolean} options.public - skip auth check
 */
export function withAuth(handler, options = {}) {
    return async (request, context) => {
        try {
            // Auth check
            let session = null;
            if (!options.public) {
                session = await getServerSession(authOptions);
                if (!session) {
                    return NextResponse.json(
                        { error: 'Unauthorized' },
                        { status: 401 }
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
