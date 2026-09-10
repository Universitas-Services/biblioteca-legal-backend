import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

function loadEnvFile(path = '.env') {
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnvFile();
const prisma = new PrismaClient();

try {
  const users = await prisma.$queryRawUnsafe('select count(*)::int as c from "User"');
  const docs = await prisma.$queryRawUnsafe('select count(*)::int as c from "Documento"');
  console.log(`CONNECT_OK users=${users[0].c} documentos=${docs[0].c}`);
} catch (e) {
  console.error(`CONNECT_FAIL ${e.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
