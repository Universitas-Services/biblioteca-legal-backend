import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

if (fs.existsSync(path.resolve(process.cwd(), 'env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'env') });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} else {
  dotenv.config();
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  try {
    // 1. Total documentos
    const totalDocs = await prisma.documento.count();
    console.log(`\n=== DOCUMENTOS TOTALES: ${totalDocs} ===\n`);

    // 2. Documentos con subcarpetaNormaId
    const docsConSubcarpeta = await prisma.documento.findMany({
      where: { subcarpetaNormaId: { not: null } },
      select: {
        id: true,
        titulo: true,
        tituloIntegro: true,
        temaPrincipal: true,
        tipoNorma: true,
        estado: true,
        eliminado: true,
        archivoOriginalUrl: true,
        subcarpetaNormaId: true,
        carpetaInternaId: true,
        subcarpetaNorma: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            eliminado: true,
            temaPrincipal: {
              select: { id: true, nombre: true, slug: true, eliminado: true }
            }
          }
        },
        carpetaInterna: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            nivel: true,
            eliminado: true,
          }
        }
      }
    });

    console.log(`Documentos con subcarpetaNormaId: ${docsConSubcarpeta.length}`);
    docsConSubcarpeta.forEach(doc => {
      console.log(`\n  [Doc] "${doc.titulo}"`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Estado: ${doc.estado} | Eliminado: ${doc.eliminado}`);
      console.log(`    temaPrincipal (texto): ${doc.temaPrincipal}`);
      console.log(`    tipoNorma (texto): ${doc.tipoNorma}`);
      console.log(`    archivoOriginalUrl: ${doc.archivoOriginalUrl}`);
      console.log(`    → Subcarpeta: ${doc.subcarpetaNorma?.nombre} (${doc.subcarpetaNorma?.slug}) [tema: ${doc.subcarpetaNorma?.temaPrincipal?.nombre}]`);
      if (doc.carpetaInterna) {
        console.log(`    → CarpetaInterna: ${doc.carpetaInterna.nombre} (${doc.carpetaInterna.slug}, nivel ${doc.carpetaInterna.nivel})`);
      }
    });

    // 3. Documentos SIN subcarpetaNormaId (sin carpeta asignada)
    const docsSinSubcarpeta = await prisma.documento.findMany({
      where: { subcarpetaNormaId: null },
      select: {
        id: true,
        titulo: true,
        temaPrincipal: true,
        tipoNorma: true,
        estado: true,
        eliminado: true,
        archivoOriginalUrl: true,
      }
    });

    console.log(`\n\nDocumentos SIN subcarpetaNormaId: ${docsSinSubcarpeta.length}`);
    docsSinSubcarpeta.forEach(doc => {
      console.log(`\n  [Doc] "${doc.titulo}"`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Estado: ${doc.estado} | Eliminado: ${doc.eliminado}`);
      console.log(`    temaPrincipal (texto): ${doc.temaPrincipal}`);
      console.log(`    tipoNorma (texto): ${doc.tipoNorma}`);
      console.log(`    archivoOriginalUrl: ${doc.archivoOriginalUrl}`);
    });

    // 4. Resumen de carpetas existentes con conteo de documentos
    console.log(`\n\n=== RESUMEN CARPETAS CON DOCUMENTOS ===\n`);
    const subcarpetas = await prisma.subcarpetaNorma.findMany({
      include: {
        temaPrincipal: true,
        _count: { select: { documentos: true } },
      }
    });

    subcarpetas.forEach(s => {
      console.log(`[Subcarpeta] ${s.temaPrincipal.nombre} → ${s.nombre} (${s.slug}) | Docs: ${s._count.documentos} | Eliminado: ${s.eliminado}`);
    });

    const carpetasInternas = await prisma.carpetaInterna.findMany({
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
        _count: { select: { documentos: true } },
      }
    });

    console.log('');
    carpetasInternas.forEach(ci => {
      if (ci._count.documentos > 0) {
        console.log(`[CarpetaInterna] ${ci.subcarpetaNorma.temaPrincipal.nombre} → ${ci.subcarpetaNorma.nombre} → ${ci.nombre} | Docs: ${ci._count.documentos} | Eliminado: ${ci.eliminado}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
