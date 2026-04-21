import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();

const users = [
    { email: 'test.nvkd@motnha.vn', username: 'test.nvkd', name: 'Test NVKD', role: 'kinh_doanh' },
    { email: 'test.gd@motnha.vn', username: 'test.gd', name: 'Test GD', role: 'giam_doc' },
];
const plainPw = 'Test@1234';
const hash = bcrypt.hashSync(plainPw, 10);

for (const u of users) {
    const existing = await p.user.findUnique({ where: { email: u.email } });
    if (existing) {
        await p.user.update({
            where: { id: existing.id },
            data: { role: u.role, active: true, password: hash, name: u.name, username: u.username },
        });
        console.log(`↻ Updated ${u.email} (id=${existing.id}, role=${u.role})`);
    } else {
        const created = await p.user.create({
            data: { ...u, password: hash, active: true },
        });
        console.log(`✓ Created ${created.email} (id=${created.id})`);
    }
}
console.log(`\nMật khẩu chung: ${plainPw}`);
await p.$disconnect();
