import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  BIBLIOTECAS_ESPECIALIZADAS,
  SUBCARPETAS,
  CARPETAS_INTERNAS,
} from './seed-estructura-data';
import { formatStorageSlug } from '../../src/storage/utils/format-storage-slug.util';

if (fs.existsSync(path.resolve(process.cwd(), 'env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'env') });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} else {
  dotenv.config();
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const projectId = process.env.GCP_PROJECT_ID;
  const keyFilePath = process.env.GCP_KEY_FILE_PATH;
  const bucketName = process.env.GCP_STORAGE_BUCKET_NAME;

  if (!projectId || !keyFilePath || !bucketName) {
    console.error('Faltan credenciales de GCP en el entorno.');
    process.exit(1);
  }

  const storage = new Storage({
    projectId,
    keyFilename: keyFilePath,
  });
  const bucket = storage.bucket(bucketName);

  console.log('Iniciando seed de estructura de la Biblioteca Legal...');

  try {
    let gcsEnabled = true;

    // ---------------------------------------------------------
    // FASE 0: ELIMINACIÓN FÍSICA EN GCS
    // ---------------------------------------------------------
    console.log('\n[Fase 0] Eliminando carpetas (objetos vacíos) de tema-principal/ en GCS...');
    try {
      const [files] = await bucket.getFiles({ prefix: 'tema-principal/' });
      const carpetasGcs = files.filter(file => file.name.endsWith('/'));
      
      let gcsEliminadas = 0;
      for (const file of carpetasGcs) {
        try {
          await file.delete();
          gcsEliminadas++;
        } catch (err: any) {
          console.warn(`No se pudo eliminar ${file.name} en GCS:`, err.message);
        }
      }
      console.log(`Carpetas eliminadas físicamente en GCS: ${gcsEliminadas} de ${carpetasGcs.length}`);
    } catch (error: any) {
      console.warn(`[ADVERTENCIA] Error al conectar a GCS (omitiendo Fase 0 y GCS): ${error.message}`);
      gcsEnabled = false;
    }

    // ---------------------------------------------------------
    // FASE 1: SOFT DELETE EN BD
    // ---------------------------------------------------------
    console.log('\n[Fase 1] Realizando soft delete en BD de la estructura anterior...');
    
    // Desvincular documento de prueba ("Prueba Pu")
    await prisma.documento.updateMany({
      where: { subcarpetaNorma: { slug: 'prueba-pu' } },
      data: { subcarpetaNormaId: null, carpetaInternaId: null },
    });

    const resCi = await prisma.carpetaInterna.updateMany({
      where: { eliminado: false },
      data: { eliminado: true, fechaEliminacion: new Date() },
    });
    console.log(`Carpetas Internas marcadas como eliminadas: ${resCi.count}`);

    const resSub = await prisma.subcarpetaNorma.updateMany({
      where: { eliminado: false },
      data: { eliminado: true, fechaEliminacion: new Date() },
    });
    console.log(`Subcarpetas marcadas como eliminadas: ${resSub.count}`);

    const resTema = await prisma.temaPrincipal.updateMany({
      where: { eliminado: false },
      data: { eliminado: true, fechaEliminacion: new Date() },
    });
    console.log(`Temas Principales marcados como eliminados: ${resTema.count}`);

    // ---------------------------------------------------------
    // FASE 2: CREACIÓN DE NUEVA ESTRUCTURA (BD + GCS)
    // ---------------------------------------------------------
    console.log('\n[Fase 2] Creando nueva estructura en BD y GCS...');

    // Helper para GCS (idempotente)
    async function createGcsFolder(uri: string) {
      if (!gcsEnabled) return;
      try {
        const gcsPath = uri.replace(`gs://${bucketName}/`, '');
        const file = bucket.file(gcsPath);
        const [exists] = await file.exists();
        if (!exists) {
          await file.save('');
        }
      } catch (error: any) {
        // Ignorar error de GCS para permitir que la BD se cree
      }
    }

    let countTemas = 0;
    let countSubcarpetas = 0;
    let countCarpetasInternas = 0;

    // 1. Crear Tema "General" (activo)
    const slugGeneral = 'general';
    const uriGeneral = `gs://${bucketName}/tema-principal/${slugGeneral}/`;
    await createGcsFolder(uriGeneral);
    
    let temaGeneral = await prisma.temaPrincipal.findUnique({ where: { slug: slugGeneral } });
    if (temaGeneral) {
      temaGeneral = await prisma.temaPrincipal.update({
        where: { slug: slugGeneral },
        data: { eliminado: false, fechaEliminacion: null, gcsUri: uriGeneral },
      });
    } else {
      temaGeneral = await prisma.temaPrincipal.create({
        data: {
          nombre: 'General',
          slug: slugGeneral,
          descripcion: 'Tema comodín de acceso',
          gcsUri: uriGeneral,
        },
      });
    }
    countTemas++;

    // 2. Crear Bibliotecas Especializadas
    for (const nombreTema of BIBLIOTECAS_ESPECIALIZADAS) {
      const slugTema = formatStorageSlug(nombreTema);
      const uriTema = `gs://${bucketName}/tema-principal/${slugTema}/`;
      await createGcsFolder(uriTema);

      let tema = await prisma.temaPrincipal.findUnique({ where: { slug: slugTema } });
      if (tema) {
        tema = await prisma.temaPrincipal.update({
          where: { slug: slugTema },
          data: { eliminado: false, fechaEliminacion: null, gcsUri: uriTema },
        });
      } else {
        tema = await prisma.temaPrincipal.create({
          data: {
            nombre: nombreTema,
            slug: slugTema,
            descripcion: nombreTema,
            gcsUri: uriTema,
          },
        });
      }
      countTemas++;

      // Crear Subcarpetas (Nivel 2)
      for (const nombreSub of SUBCARPETAS) {
        const slugSub = formatStorageSlug(nombreSub);
        const uriSub = `${uriTema}${slugSub}/`;
        await createGcsFolder(uriSub);

        let subcarpeta = await prisma.subcarpetaNorma.findUnique({
          where: { temaPrincipalId_slug: { temaPrincipalId: tema.id, slug: slugSub } }
        });
        if (subcarpeta) {
          subcarpeta = await prisma.subcarpetaNorma.update({
            where: { id: subcarpeta.id },
            data: { eliminado: false, fechaEliminacion: null, gcsUri: uriSub },
          });
        } else {
          subcarpeta = await prisma.subcarpetaNorma.create({
            data: {
              nombre: nombreSub,
              slug: slugSub,
              gcsUri: uriSub,
              temaPrincipalId: tema.id,
            }
          });
        }
        countSubcarpetas++;

        // Crear Carpetas Internas (Nivel 3 y 4)
        const defNivel3 = CARPETAS_INTERNAS[nombreSub];
        
        if (Array.isArray(defNivel3)) {
          // Son carpetas directamente en el nivel 3
          for (const nombreN3 of defNivel3) {
            const slugN3 = formatStorageSlug(nombreN3);
            const uriN3 = `${uriSub}${slugN3}/`;
            await createGcsFolder(uriN3);

            let ci = await prisma.carpetaInterna.findFirst({
              where: { subcarpetaNormaId: subcarpeta.id, slug: slugN3, nivel: 1 }
            });
            if (ci) {
              await prisma.carpetaInterna.update({
                where: { id: ci.id },
                data: { eliminado: false, fechaEliminacion: null, gcsUri: uriN3 }
              });
            } else {
              await prisma.carpetaInterna.create({
                data: {
                  nombre: nombreN3,
                  slug: slugN3,
                  nivel: 1,
                  gcsUri: uriN3,
                  subcarpetaNormaId: subcarpeta.id,
                }
              });
            }
            countCarpetasInternas++;
          }
        } else {
          // Es un objeto (ej: Legislación -> Nacional -> [Leyes])
          for (const [nombreN3, defNivel4] of Object.entries(defNivel3)) {
            const slugN3 = formatStorageSlug(nombreN3);
            const uriN3 = `${uriSub}${slugN3}/`;
            await createGcsFolder(uriN3);

            let parentCi = await prisma.carpetaInterna.findFirst({
              where: { subcarpetaNormaId: subcarpeta.id, slug: slugN3, nivel: 1 }
            });
            
            if (parentCi) {
              parentCi = await prisma.carpetaInterna.update({
                where: { id: parentCi.id },
                data: { eliminado: false, fechaEliminacion: null, gcsUri: uriN3 }
              });
            } else {
              parentCi = await prisma.carpetaInterna.create({
                data: {
                  nombre: nombreN3,
                  slug: slugN3,
                  nivel: 1,
                  gcsUri: uriN3,
                  subcarpetaNormaId: subcarpeta.id,
                }
              });
            }
            countCarpetasInternas++;

            // Nivel 4
            for (const nombreN4 of defNivel4) {
              const slugN4 = formatStorageSlug(nombreN4);
              const uriN4 = `${uriN3}${slugN4}/`;
              await createGcsFolder(uriN4);

              let ci4 = await prisma.carpetaInterna.findUnique({
                where: { parentId_slug: { parentId: parentCi.id, slug: slugN4 } }
              });
              if (ci4) {
                await prisma.carpetaInterna.update({
                  where: { id: ci4.id },
                  data: { eliminado: false, fechaEliminacion: null, gcsUri: uriN4 }
                });
              } else {
                await prisma.carpetaInterna.create({
                  data: {
                    nombre: nombreN4,
                    slug: slugN4,
                    nivel: 2,
                    gcsUri: uriN4,
                    subcarpetaNormaId: subcarpeta.id,
                    parentId: parentCi.id,
                  }
                });
              }
              countCarpetasInternas++;
            }
          }
        }
      }
    }

    console.log('\n[Estructura Creada]');
    console.log(`Temas Principales: ${countTemas}`);
    console.log(`Subcarpetas Norma: ${countSubcarpetas}`);
    console.log(`Carpetas Internas: ${countCarpetasInternas}`);
    console.log(`Objetos vacíos creados/validados en GCS: ${countTemas + countSubcarpetas + countCarpetasInternas}`);

    // ---------------------------------------------------------
    // FASE 3: REASIGNACIÓN DE DOCUMENTOS (16 docs de Derecho Urbanístico y 1 Ordenanza)
    // ---------------------------------------------------------
    console.log('\n[Fase 3] Reasignando documentos existentes...');
    
    // Obtener la subcarpeta de Legislación de Derecho Urbanístico
    const temaDU = await prisma.temaPrincipal.findUnique({ where: { slug: 'derecho-urbanistico' } });
    if (temaDU) {
      const subLegis = await prisma.subcarpetaNorma.findUnique({
        where: { temaPrincipalId_slug: { temaPrincipalId: temaDU.id, slug: 'legislacion' } }
      });
      
      if (subLegis) {
        // Encontrar carpeta Nacional y Municipal
        const capNacional = await prisma.carpetaInterna.findFirst({
          where: { subcarpetaNormaId: subLegis.id, slug: 'nacional', nivel: 1 }
        });
        const capMunicipal = await prisma.carpetaInterna.findFirst({
          where: { subcarpetaNormaId: subLegis.id, slug: 'municipal', nivel: 1 }
        });

        if (capNacional && capMunicipal) {
          // Reasignar ley-organica -> Nacional -> Ley Orgánica
          const capLeyOrg = await prisma.carpetaInterna.findUnique({
            where: { parentId_slug: { parentId: capNacional.id, slug: 'ley-organica' } }
          });
          if (capLeyOrg) {
            await prisma.documento.updateMany({
              where: { archivoOriginalUrl: { contains: '/ley-organica/' }, temaPrincipal: 'Derecho Urbanístico' },
              data: { subcarpetaNormaId: subLegis.id, carpetaInternaId: capLeyOrg.id }
            });
            console.log('Reasignados docs de Ley Orgánica');
          }

          // Reasignar ley-ordinaria -> Nacional -> Ley Ordinaria
          const capLeyOrd = await prisma.carpetaInterna.findUnique({
            where: { parentId_slug: { parentId: capNacional.id, slug: 'ley-ordinaria' } }
          });
          if (capLeyOrd) {
            await prisma.documento.updateMany({
              where: { archivoOriginalUrl: { contains: '/ley-ordinaria/' }, temaPrincipal: 'Derecho Urbanístico' },
              data: { subcarpetaNormaId: subLegis.id, carpetaInternaId: capLeyOrd.id }
            });
            console.log('Reasignados docs de Ley Ordinaria');
          }

          // Reasignar decreto-ley -> Nacional -> Decreto Ley
          const capDecLey = await prisma.carpetaInterna.findUnique({
            where: { parentId_slug: { parentId: capNacional.id, slug: 'decreto-ley' } }
          });
          if (capDecLey) {
            await prisma.documento.updateMany({
              where: { archivoOriginalUrl: { contains: '/decreto-ley/' }, temaPrincipal: 'Derecho Urbanístico' },
              data: { subcarpetaNormaId: subLegis.id, carpetaInternaId: capDecLey.id }
            });
            console.log('Reasignados docs de Decreto Ley');
          }

          // Reasignar Ordenanza Aricagua123
          const capOrdenanza = await prisma.carpetaInterna.findUnique({
            where: { parentId_slug: { parentId: capMunicipal.id, slug: 'ordenanza' } }
          });
          if (capOrdenanza) {
            const res = await prisma.documento.updateMany({
              where: { titulo: 'Ordenanza de aseo urbano Aricagua123' },
              data: { subcarpetaNormaId: subLegis.id, carpetaInternaId: capOrdenanza.id }
            });
            console.log(`Reasignados docs de Ordenanza (Count: ${res.count})`);
          }
        }
      }
    }

    console.log('\nSeed finalizado exitosamente.');

  } catch (error) {
    console.error('Error durante el seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
