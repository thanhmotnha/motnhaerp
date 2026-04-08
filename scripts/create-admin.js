const { PrismaClient } = require('@prisma/client');
const { hashSync } = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const pw = hashSync('admin123', 10);
  
  // Create admin user (upsert to avoid duplicate)
  const user = await p.user.upsert({
    where: { email: 'admin@motnha.vn' },
    update: { password: pw, username: 'admin', active: true },
    create: { email: 'admin@motnha.vn', username: 'admin', name: 'Admin', password: pw, role: 'giam_doc' },
  });
  console.log('Admin user ready:', user.email, '| username:', user.username);

  // Also create other users
  const others = [
    { email: 'ketoan@motnha.vn', username: 'ketoan', name: 'Kế toán', role: 'ke_toan' },
    { email: 'kinhdoanh@motnha.vn', username: 'kinhdoanh', name: 'Kinh doanh', role: 'kinh_doanh' },
    { email: 'kho@motnha.vn', username: 'kho', name: 'Kho', role: 'kho' },
    { email: 'kythuat@motnha.vn', username: 'kythuat', name: 'Kỹ thuật', role: 'ky_thuat' },
  ];
  for (const o of others) {
    const u = await p.user.upsert({
      where: { email: o.email },
      update: { password: pw, username: o.username, active: true },
      create: { ...o, password: pw },
    });
    console.log('User ready:', u.email, '| username:', u.username);
  }
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
