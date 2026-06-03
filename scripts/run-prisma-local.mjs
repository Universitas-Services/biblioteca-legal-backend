/**
 * Ejecuta comandos Prisma contra la base local de Docker Compose.
 * Ignora DATABASE_URL del .env (p. ej. Render producción).
 */
import { execSync } from 'node:child_process';

const LOCAL_DATABASE_URL =
  process.env.PRISMA_LOCAL_DATABASE_URL ??
  'postgresql://admin:rootpassword@localhost:5434/universitas';

const prismaArgs = process.argv.slice(2).join(' ');

if (!prismaArgs) {
  console.error('Uso: node scripts/run-prisma-local.mjs <comando prisma>');
  console.error('Ejemplo: node scripts/run-prisma-local.mjs migrate deploy');
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: LOCAL_DATABASE_URL,
};

console.log(`[prisma:local] DATABASE_URL → localhost:5434/universitas`);
console.log(`[prisma:local] npx prisma ${prismaArgs}\n`);

try {
  execSync(`npx prisma ${prismaArgs}`, {
    stdio: 'inherit',
    env,
    shell: true,
  });
} catch (error) {
  const exitCode = typeof error.status === 'number' ? error.status : 1;
  process.exit(exitCode);
}
