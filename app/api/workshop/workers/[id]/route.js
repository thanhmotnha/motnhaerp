import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const WORKSHOP_WRITE_ROLES = ['giam_doc', 'ke_toan', 'kho'];

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { name, skill, phone, hourlyRate, notes, status, workerType } = body;

    const worker = await prisma.workshopWorker.update({
        where: { id },
        data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(workerType !== undefined && { workerType }),
            ...(skill !== undefined && { skill: skill.trim() }),
            ...(phone !== undefined && { phone: phone.trim() }),
            ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) || 0 }),
            ...(notes !== undefined && { notes: notes.trim() }),
            ...(status !== undefined && { status }),
        },
    });
    return NextResponse.json(worker);
}, { roles: WORKSHOP_WRITE_ROLES });

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.workshopWorker.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: WORKSHOP_WRITE_ROLES });
