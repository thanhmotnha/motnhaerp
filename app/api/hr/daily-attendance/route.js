import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/hr/daily-attendance?date=2025-03-15&employeeId=xxx
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // YYYY-MM format
    
    const where = {};
    
    if (employeeId) where.employeeId = employeeId;
    
    if (date) {
        where.date = new Date(date);
    } else if (month) {
        const [y, m] = month.split('-').map(Number);
        where.date = {
            gte: new Date(y, m - 1, 1),
            lt: new Date(y, m, 1),
        };
    }

    const records = await prisma.dailyAttendance.findMany({
        where,
        include: {
            employee: {
                select: { id: true, code: true, name: true, position: true, department: { select: { name: true } } },
            },
        },
        orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
    });

    return NextResponse.json({ data: records, count: records.length });
});

// POST /api/hr/daily-attendance — upsert chấm công ngày
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, overtimeHrs, notes } = body;

    if (!employeeId || !date) {
        return NextResponse.json({ error: 'employeeId và date là bắt buộc' }, { status: 400 });
    }

    const dateObj = new Date(date);
    
    const record = await prisma.dailyAttendance.upsert({
        where: { employeeId_date: { employeeId, date: dateObj } },
        update: {
            ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
            ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
            ...(status !== undefined && { status }),
            ...(overtimeHrs !== undefined && { overtimeHrs }),
            ...(notes !== undefined && { notes }),
        },
        create: {
            employeeId,
            date: dateObj,
            checkIn: checkIn ? new Date(checkIn) : null,
            checkOut: checkOut ? new Date(checkOut) : null,
            status: status || 'Đi làm',
            overtimeHrs: overtimeHrs || 0,
            notes: notes || '',
        },
    });

    return NextResponse.json(record);
});
