import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
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
  console.log('--- CONTEXTO ACTUAL DE LA BASE DE DATOS ---');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    const temas = await prisma.temaPrincipal.findMany({
      include: {
        subcarpetas: {
          include: {
            carpetasInternas: true,
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    console.log(`\nTemas Principales encontrados: ${temas.length}`);
    temas.forEach(tema => {
      console.log(`- [Tema] ${tema.nombre} (Slug: ${tema.slug}, GCS: ${tema.gcsUri}) ${tema.eliminado ? '(ELIMINADO)' : ''}`);
      
      tema.subcarpetas.forEach(sub => {
        console.log(`  |- [Subcarpeta] ${sub.nombre} (Slug: ${sub.slug}, GCS: ${sub.gcsUri}) ${sub.eliminado ? '(ELIMINADO)' : ''}`);
        
        sub.carpetasInternas.forEach(ci => {
          console.log(`     |- [Carpeta Interna] ${ci.nombre} (Nivel: ${ci.nivel}, Slug: ${ci.slug}, GCS: ${ci.gcsUri}) ${ci.eliminado ? '(ELIMINADO)' : ''}`);
        });
      });
    });
  } catch (error) {
    console.error('Error al acceder a la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n--- CONTEXTO ACTUAL DEL BUCKET GCS ---');
  
  const projectId = process.env.GCP_PROJECT_ID;
  const keyFilePath = process.env.GCP_KEY_FILE_PATH;
  const bucketName = process.env.GCP_STORAGE_BUCKET_NAME;

  if (!projectId || !keyFilePath || !bucketName) {
    console.log('No se encontraron credenciales de GCP completas en el entorno');
    return;
  }

  console.log(`Conectando al bucket: ${bucketName}...`);
  const storage = new Storage({
    projectId,
    keyFilename: keyFilePath,
  });

  try {
    const bucket = storage.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: '' });
    
    const carpetasGcs = files
      .filter(file => file.name.endsWith('/'))
      .map(file => file.name);
      
    const archivosGcs = files
      .filter(file => !file.name.endsWith('/'))
      .map(file => file.name);

    console.log(`\nCarpetas (objetos vacíos simulados) en GCS (${carpetasGcs.length}):`);
    carpetasGcs.sort().forEach(c => console.log(`- gs://${bucketName}/${c}`));

    console.log(`\nArchivos en GCS (${archivosGcs.length}):`);
    archivosGcs.sort().slice(0, 30).forEach(a => console.log(`- gs://${bucketName}/${a}`));
    if (archivosGcs.length > 30) {
      console.log(`... y ${archivosGcs.length - 30} archivos más.`);
    }
  } catch (error) {
    console.error('Error al acceder a GCS:', error);
  }
}

main().catch(console.error);
