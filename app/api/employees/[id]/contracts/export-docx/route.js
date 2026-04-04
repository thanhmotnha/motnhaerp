import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { fillEmployeeVariables } from '@/lib/contractVariables';
import HTMLtoDOCX from 'html-to-docx';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');
    const templateId = searchParams.get('templateId');

    if (!contractId) return NextResponse.json({ error: 'contractId required' }, { status: 400 });

    const [contract, employee, template] = await Promise.all([
        prisma.employeeContract.findUnique({ where: { id: contractId, employeeId: id } }),
        prisma.employee.findUnique({ where: { id } }),
        templateId
            ? prisma.contractTemplate.findUnique({ where: { id: templateId } })
            : prisma.contractTemplate.findFirst({
                where: {
                    type: 'Lao động',
                    OR: [
                        { name: { contains: 'thử việc', mode: 'insensitive' } },
                        { name: { not: { contains: 'thử việc' } } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            }),
    ]);

    if (!contract) return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    if (!employee) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    if (!template) return NextResponse.json({ error: 'Không tìm thấy mẫu hợp đồng' }, { status: 404 });

    const html = fillEmployeeVariables(template.body, { contract, employee });

    const htmlDoc = `<html><head><meta charset="utf-8"><style>
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8; color: #000; }
        h1 { font-size: 18pt; font-weight: bold; text-align: center; margin: 12pt 0 8pt; }
        h2 { font-size: 15pt; font-weight: bold; margin: 10pt 0 6pt; }
        h3 { font-size: 13pt; font-weight: bold; margin: 8pt 0 4pt; }
        table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
        td, th { border: 1px solid #999; padding: 4pt 8pt; vertical-align: top; font-size: 12pt; }
        p { margin: 4pt 0; }
    </style></head><body>${html}</body></html>`;

    const docxBuffer = await HTMLtoDOCX(htmlDoc, null, {
        orientation: 'portrait',
        margins: { top: 720, right: 720, bottom: 720, left: 1080 },
    });

    const filename = `${contract.code || contractId}-${employee.name}.docx`;

    return new NextResponse(docxBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
    });
});
