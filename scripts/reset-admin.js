const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const hash = bcrypt.hashSync('123z123z', 10);
        console.log('Hash:', hash);
        
        const user = await prisma.user.upsert({
            where: { email: 'admin@motnha.vn' },
            create: {
                username: 'admin',
                email: 'admin@motnha.vn',
                name: 'Admin',
                password: hash,
                role: 'giam_doc',
                active: true,
            },
            update: {
                password: hash,
                username: 'admin',
                active: true,
            },
        });
        console.log('Done:', user.email, user.username, user.id);
    } catch (e) {
        console.error('Full error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
