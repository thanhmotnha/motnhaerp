import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/customer/project — Lấy thông tin dự án cho khách hàng đã login
export const GET = withAuth(async (request) => {
    const user = request.user;

    // Tìm customer theo email user
    const customer = await prisma.customer.findFirst({
        where: {
            OR: [
                { email: user.email },
                { phone: user.phone || '_none_' },
            ],
            deletedAt: null,
        },
        select: { id: true, name: true },
    });

    if (!customer) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    // Lấy project mới nhất của customer
    const project = await prisma.project.findFirst({
        where: { customerId: customer.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            code: true,
            name: true,
            address: true,
            status: true,
            progress: true,
            startDate: true,
            endDate: true,
            contractValue: true,
            paidAmount: true,
            manager: true,
            designer: true,
            supervisor: true,
            phase: true,
        },
    });

    if (!project) {
        return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Milestones
    const milestones = await prisma.projectMilestone.findMany({
        where: { projectId: project.id },
        orderBy: { order: 'asc' },
        select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            progress: true,
        },
    });

    // Manager info — tìm employee matching manager name
    let managerInfo = null;
    if (project.manager) {
        const emp = await prisma.employee.findFirst({
            where: { name: project.manager, deletedAt: null },
            select: { name: true, phone: true, email: true },
        });
        managerInfo = emp || { name: project.manager, phone: null };
    }

    return NextResponse.json({
        project: {
            ...project,
            manager: managerInfo,
        },
        milestones,
    });
});
