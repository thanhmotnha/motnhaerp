import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const test = await p.product.findFirst({ where: { name: { contains: 'MS 01012 T' } }, select: { id: true, name: true } });
if (test) {
    await p.productAttributeOption.deleteMany({ where: { attribute: { productId: test.id } } });
    await p.productAttribute.deleteMany({ where: { productId: test.id } });
    await p.product.delete({ where: { id: test.id } });
    console.log('Deleted test product:', test.name);
} else {
    console.log('No test product found');
}
await p.$disconnect();
