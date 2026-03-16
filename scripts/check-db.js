const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRawUnsafe(`SELECT pg_is_in_recovery()::text as recovery, current_setting('archive_mode', true) as archive_mode, current_setting('wal_level', true) as wal_level`)
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => console.error('Error:', e.message))
  .finally(() => p.$disconnect());
