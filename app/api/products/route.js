import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { productCreateSchema } from '@/lib/validations/product';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const category = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const cursor = searchParams.get('cursor'); // for infinite scroll
    const brand = searchParams.get('brand');
    const status = searchParams.get('status');
    const supplyType = searchParams.get('supplyType');
    const stockFilter = searchParams.get('stockFilter'); // low, out
    const sort = searchParams.get('sort') || 'newest';

    const orderByMap = {
        name_asc: { name: 'asc' },
        name_desc: { name: 'desc' },
        price_asc: { salePrice: 'asc' },
        price_desc: { salePrice: 'desc' },
        category_asc: { category: 'asc' },
        newest: { createdAt: 'desc' },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    const where = { deletedAt: null };
    if (category) where.category = category;
    if (categoryId) {
        try {
            const descendants = await getDescendantIds(categoryId);
            where.categoryId = { in: [categoryId, ...descendants] };
        } catch {
            where.categoryId = categoryId;
        }
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (supplyType) where.supplyType = supplyType;
    const supplierFilter = searchParams.get('supplier');
    if (supplierFilter) where.supplier = { contains: supplierFilter, mode: 'insensitive' };
    if (stockFilter === 'out') where.stock = 0;

    // Cursor-based pagination for infinite scroll
    if (cursor) {
        const products = await prisma.product.findMany({
            where, take: limit, skip: 1, cursor: { id: cursor },
            orderBy: { createdAt: 'desc' },
            include: { categoryRef: { select: { id: true, name: true } } },
        });
        return NextResponse.json({
            data: products,
            nextCursor: products.length === limit ? products[products.length - 1].id : null,
        });
    }

    const [data, total] = await Promise.all([
        prisma.product.findMany({
            where, skip, take: limit,
            orderBy,
            include: { categoryRef: { select: { id: true, name: true } } },
        }),
        prisma.product.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

// Helper: get all descendant category IDs recursively
async function getDescendantIds(parentId) {
    const children = await prisma.productCategory.findMany({
        where: { parentId },
        select: { id: true },
    });
    const ids = children.map(c => c.id);
    for (const child of children) {
        const grandchildren = await getDescendantIds(child.id);
        ids.push(...grandchildren);
    }
    return ids;
}

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = productCreateSchema.parse(body);
    const code = await generateCode('product', 'SP');

    // Sync category text ↔ categoryId
    if (data.categoryId) {
        // categoryId provided → sync category text from ProductCategory name
        const cat = await prisma.productCategory.findUnique({ where: { id: data.categoryId }, select: { name: true } });
        if (cat) data.category = cat.name;
    } else if (data.category) {
        // Only category text provided → auto-link categoryId
        const cat = await prisma.productCategory.findFirst({ where: { name: data.category } });
        if (cat) data.categoryId = cat.id;
    }

    const product = await prisma.product.create({
        data: { code, ...data },
    });
    return NextResponse.json(product, { status: 201 });
});

// PATCH: bulk operations
export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    const { action } = body;

    // Legacy: rename category
    if (body.oldCategory && body.newCategory) {
        const result = await prisma.product.updateMany({
            where: { category: body.oldCategory },
            data: { category: body.newCategory.trim() },
        });
        // Also rename ProductCategory if exists
        await prisma.productCategory.updateMany({
            where: { name: body.oldCategory },
            data: { name: body.newCategory.trim() },
        });
        return NextResponse.json({ updated: result.count });
    }

    // Bulk price update
    if (action === 'bulkPrice') {
        const { ids, mode, value } = body; // mode: 'percent' | 'fixed', value: number
        if (!ids?.length || !value) return NextResponse.json({ error: 'ids and value required' }, { status: 400 });

        if (mode === 'percent') {
            // Update sale price by percentage
            const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, salePrice: true } });
            const results = await prisma.$transaction(
                products.map(p => prisma.product.update({
                    where: { id: p.id },
                    data: { salePrice: Math.round(p.salePrice * (1 + value / 100)) },
                }))
            );
            return NextResponse.json({ updated: results.length });
        } else {
            // Set fixed price
            const result = await prisma.product.updateMany({
                where: { id: { in: ids } },
                data: { salePrice: Number(value) },
            });
            return NextResponse.json({ updated: result.count });
        }
    }

    // Bulk status update
    if (action === 'bulkStatus') {
        const { ids, status } = body;
        if (!ids?.length || !status) return NextResponse.json({ error: 'ids and status required' }, { status: 400 });
        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { status },
        });
        return NextResponse.json({ updated: result.count });
    }

    // Bulk category assign (auto-sync category text)
    if (action === 'bulkCategory') {
        const { ids, categoryId, category } = body;
        if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
        const data = {};
        if (categoryId) {
            data.categoryId = categoryId;
            const cat = await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { name: true } });
            if (cat) data.category = cat.name;
        }
        if (category && !data.category) data.category = category;
        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data,
        });
        return NextResponse.json({ updated: result.count });
    }

    // Bulk delete (soft-delete)
    if (action === 'bulkDelete') {
        const { ids } = body;
        if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
        await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { deletedAt: new Date(), status: 'Ngừng kinh doanh' },
        });
        return NextResponse.json({ deleted: ids.length });
    }

    // Duplicate product
    if (action === 'duplicate') {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const src = await prisma.product.findUnique({ where: { id } });
        if (!src) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        const newCode = await generateCode('product', 'SP');
        // Explicit fields only — no relations/computed
        const dup = await prisma.product.create({
            data: {
                code: newCode,
                name: `${src.name} (Bản sao)`,
                category: src.category,
                unit: src.unit,
                importPrice: src.importPrice,
                salePrice: src.salePrice,
                stock: 0,
                minStock: src.minStock,
                supplier: src.supplier,
                description: src.description,
                dimensions: src.dimensions,
                weight: src.weight,
                color: src.color,
                material: src.material,
                origin: src.origin,
                warranty: src.warranty,
                brand: src.brand,
                status: src.status,
                supplyType: src.supplyType,
                leadTimeDays: src.leadTimeDays,
                location: src.location,
                image: src.image,
                coreBoard: src.coreBoard,
                surfaceCode: src.surfaceCode,
                categoryId: src.categoryId,
            },
        });
        return NextResponse.json(dup, { status: 201 });
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 });
});

