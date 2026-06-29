import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

if (fs.existsSync(path.resolve(process.cwd(), 'env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'env') });
} else {
  dotenv.config();
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  try {
    // Doc en Contrataciones Públicas → Prueba Pu → PruebaNorma
    const doc = await prisma.documento.findMany({
      where: {
        subcarpetaNorma: {
          temaPrincipal: { slug: 'contrataciones-publicas' }
        }
      },
      select: {
        id: true,
        titulo: true,
        tituloIntegro: true,
        temaPrincipal: true,
        tipoNorma: true,
        estado: true,
        eliminado: true,
        archivoOriginalUrl: true,
        enteEmisor: true,
        fechaPublicacion: true,
        carpetaInterna: { select: { nombre: true, slug: true } },
        subcarpetaNorma: { select: { nombre: true, slug: true } },
      }
    });

    console.log('=== Documentos en Contrataciones Públicas ===');
    doc.forEach(d => {
      console.log(JSON.stringify(d, null, 2));
    });

    // Docs sin subcarpeta 
    const sinSub = await prisma.documento.findMany({
      where: { subcarpetaNormaId: null },
      select: {
        id: true,
        titulo: true,
        tituloIntegro: true,
        temaPrincipal: true,
        tipoNorma: true,
        estado: true,
        eliminado: true,
        archivoOriginalUrl: true,
        enteEmisor: true,
        fechaPublicacion: true,
      }
    });

    console.log('\n=== Documentos sin subcarpeta ===');
    sinSub.forEach(d => {
      console.log(JSON.stringify(d, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
