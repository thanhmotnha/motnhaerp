import prisma from '@/lib/prisma';

export async function getSetting(key) {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
}

export async function setSetting(key, value) {
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
    });
}
