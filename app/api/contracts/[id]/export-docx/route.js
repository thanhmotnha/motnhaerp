import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { fillVariables } from '@/lib/contractVariables';
import HTMLtoDOCX from 'html-to-docx';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
        where: { id, deletedAt: null },
        include: {
            customer: true,
            project: true,
            quotation: {
                include: {
                    categories: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
                },
            },
            payments: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fill variables to get final HTML
    let selectedItemIds = null;
    try { selectedItemIds = JSON.parse(contract.selectedItems || '[]'); } catch { }

    const filledHtml = fillVariables(contract.contractBody || '', {
        contract,
        customer: contract.customer,
        project: contract.project,
        quotation: contract.quotation,
        payments: contract.payments,
        selectedItemIds: selectedItemIds?.length > 0 ? selectedItemIds : null,
    });

    // Wrap in proper HTML doc with Times New Roman styling
    const htmlDoc = `
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.8; color: #000; }
                h1 { font-size: 18pt; font-weight: bold; text-align: center; margin: 12pt 0 8pt; }
                h2 { font-size: 15pt; font-weight: bold; margin: 10pt 0 6pt; }
                h3 { font-size: 13pt; font-weight: bold; margin: 8pt 0 4pt; }
                table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
                td, th { border: 1px solid #999; padding: 4pt 8pt; vertical-align: top; font-size: 12pt; }
                th { background-color: #f0f0f0; font-weight: bold; }
                p { margin: 4pt 0; }
                ul, ol { padding-left: 20pt; margin: 4pt 0; }
            </style>
        </head>
        <body>${filledHtml}</body>
        </html>
    `;

    // Convert to DOCX
    const docxBuffer = await HTMLtoDOCX(htmlDoc, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: 'Times New Roman',
        fontSize: 26, // half-points: 26 = 13pt
        margins: {
            top: 1440,    // 1 inch in twips (1440 twips = 1 inch)
            bottom: 1440,
            left: 1440,
            right: 1080,  // 0.75 inch
        },
    });

    const filename = `HD-${contract.code || contract.id}.docx`;

    return new NextResponse(docxBuffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
    });
});
