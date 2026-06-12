import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CarpetaInterna, Prisma, SubcarpetaNorma, TemaPrincipal } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TEMA_ESPECIALIDAD_GENERAL_SLUG } from '../common/constants/tema-especialidad.constants';
import { formatStorageSlug } from './utils/format-storage-slug.util';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { UpdateSubcarpetaDto } from './dto/update-subcarpeta.dto';

const MAX_NIVEL_CARPETA_INTERNA = 10;

@Injectable()
export class StorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {
    const projectId = process.env.GCP_PROJECT_ID;
    const keyFilePath = process.env.GCP_KEY_FILE_PATH;
    const bucketName = process.env.GCP_STORAGE_BUCKET_NAME;

    if (!projectId || !keyFilePath || !bucketName) {
      throw new Error(
        'Las variables de entorno GCP_PROJECT_ID, GCP_KEY_FILE_PATH y GCP_STORAGE_BUCKET_NAME son obligatorias.',
      );
    }

    this.bucketName = bucketName;

    this.storage = new Storage({
      projectId,
      keyFilename: keyFilePath,
    });
  }

  /**
   * Sube un documento directamente desde la memoria (buffer) a Google Cloud Storage.
   * No escribe archivos temporales en disco, priorizando el rendimiento.
   *
   * @param file - Archivo recibido por Multer (en memoria).
   * @param folder - Carpeta destino dentro del bucket (por defecto: 'documentos').
   * @returns La URI nativa de GCS en formato `gs://bucket/ruta`.
   */
  async uploadDocument(file: Express.Multer.File, folder: string = 'documentos'): Promise<string> {
    const extension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${extension}`;
    const filePath = `${folder}/${uniqueFileName}`;

    const bucket = this.storage.bucket(this.bucketName);
    const blob = bucket.file(filePath);

    return new Promise<string>((resolve, reject) => {
      const stream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
        metadata: {
          metadata: {
            originalName: file.originalname,
          },
        },
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`Error al subir archivo a GCS: ${error.message}`, error.stack);
        reject(
          new InternalServerErrorException(
            `Error al subir el archivo a Google Cloud Storage: ${error.message}`,
          ),
        );
      });

      stream.on('finish', () => {
        const gcsUri = `gs://${this.bucketName}/${filePath}`;
        this.logger.log(`Archivo subido exitosamente: ${gcsUri}`);
        resolve(gcsUri);
      });

      stream.end(file.buffer);
    });
  }

  /**
   * Genera una URL firmada (Signed URL) con permiso de lectura a partir de una URI `gs://`.
   * La URL es válida por 15 minutos.
   *
   * @param gcsUri - URI nativa de GCS (ej: `gs://bucket/ruta/archivo.pdf`).
   * @returns URL firmada con acceso temporal de lectura.
   */
  async getSignedUrl(gcsUri: string): Promise<string> {
    try {
      const prefix = `gs://${this.bucketName}/`;

      if (!gcsUri.startsWith(prefix)) {
        throw new Error(
          `La URI proporcionada no pertenece al bucket configurado. Se esperaba prefijo: ${prefix}`,
        );
      }

      const filePath = gcsUri.slice(prefix.length);
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutos
        responseDisposition: 'inline', // Obliga al navegador a previsualizar en lugar de descargar
      });

      this.logger.log(`URL firmada generada para: ${filePath}`);
      return signedUrl;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al generar URL firmada: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(`Error al generar la URL firmada: ${message}`);
    }
  }

  /**
   * Mueve un archivo dentro de Google Cloud Storage de una ubicación a otra.
   * Útil para publicar borradores (mover de 'borradores/' a la carpeta final).
   *
   * @param sourceGcsUri - URI nativa original (ej: `gs://bucket/borradores/archivo.pdf`).
   * @param destinationFolder - Carpeta destino en GCS (ej: `documentos`).
   * @returns La nueva URI nativa de GCS en formato `gs://bucket/ruta`.
   */
  async moveFile(sourceGcsUri: string, destinationFolder: string): Promise<string> {
    try {
      const prefix = `gs://${this.bucketName}/`;

      if (!sourceGcsUri.startsWith(prefix)) {
        throw new Error(
          `La URI proporcionada no pertenece al bucket configurado. Se esperaba prefijo: ${prefix}`,
        );
      }

      const sourcePath = sourceGcsUri.slice(prefix.length);
      const fileName = path.basename(sourcePath);
      const destinationPath = `${destinationFolder}/${fileName}`;

      const bucket = this.storage.bucket(this.bucketName);
      const sourceFile = bucket.file(sourcePath);
      const destinationFile = bucket.file(destinationPath);

      // Usar el método move de GCS
      await sourceFile.move(destinationFile);

      const newGcsUri = `gs://${this.bucketName}/${destinationPath}`;
      this.logger.log(`Archivo movido en GCS: de ${sourcePath} a ${destinationPath}`);
      return newGcsUri;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al mover archivo en GCS: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Error al mover el archivo en Google Cloud Storage: ${message}`,
      );
    }
  }

  /**
   * Crea una carpeta simulada en Google Cloud Storage.
   *
   * En GCS no existen carpetas reales; se simula la jerarquía creando un objeto
   * vacío (0 bytes) cuyo nombre termina en `/`.
   *
   * Flujo:
   * 1. Se asegura de que la ruta termine en `/` (requisito de convención).
   * 2. Obtiene una referencia al archivo (objeto) en el bucket.
   * 3. Verifica si el objeto ya existe con `file.exists()`.
   *    - Si existe → lanza ConflictException para evitar duplicados.
   * 4. Guarda un string vacío (`file.save('')`) para crear el objeto de 0 bytes.
   * 5. Retorna la URI nativa de GCS en formato `gs://bucket-name/ruta/`.
   *
   * @param folderPath - Ruta de la carpeta a crear. Debe terminar en `/`.
   *                     Ejemplo: `tema-principal/derecho-civil/ley/`
   * @returns La URI nativa de GCS (`gs://bucket-name/ruta/`).
   * @throws ConflictException si la carpeta ya existe en el bucket.
   * @throws InternalServerErrorException si ocurre un error inesperado de GCS.
   */
  async createFolder(folderPath: string): Promise<string> {
    try {
      // Garantizar que la ruta siempre termine en `/` para respetar la convención de carpetas
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      // Obtener referencia al bucket y al archivo (objeto) que representará la carpeta
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(normalizedPath);

      // Verificar si la carpeta ya existe para evitar duplicados
      const [exists] = await file.exists();
      if (exists) {
        this.logger.warn(`La carpeta ya existe en GCS: ${normalizedPath}`);
        throw new ConflictException(
          `La carpeta '${normalizedPath}' ya existe en el bucket de Google Cloud Storage.`,
        );
      }

      // Crear el objeto vacío (0 bytes) que simula la carpeta en GCS
      await file.save('', {
        contentType: 'application/x-directory', // Tipo MIME convencional para carpetas simuladas
      });

      // Construir la URI nativa de GCS para retornarla al cliente
      const gcsUri = `gs://${this.bucketName}/${normalizedPath}`;
      this.logger.log(`Carpeta creada exitosamente en GCS: ${gcsUri}`);

      return gcsUri;
    } catch (error: unknown) {
      // Si el error ya es una excepción HTTP de NestJS (ej: ConflictException), re-lanzarla directamente
      if (error instanceof ConflictException) {
        throw error;
      }

      // Para cualquier otro error inesperado, envolver en InternalServerErrorException
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al crear carpeta en GCS: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Error al crear la carpeta en Google Cloud Storage: ${message}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE TEMAS PRINCIPALES
  // ─────────────────────────────────────────────────────────────────────────────

  private temaWhereActivo(incluirEliminados = false): Prisma.TemaPrincipalWhereInput {
    return incluirEliminados ? {} : { eliminado: false };
  }

  private subcarpetaWhereActivo(incluirEliminados = false): Prisma.SubcarpetaNormaWhereInput {
    return incluirEliminados ? {} : { eliminado: false };
  }

  private mapTema(tema: TemaPrincipal & { subcarpetas?: SubcarpetaNorma[] }) {
    return {
      id: tema.id,
      nombre: tema.nombre,
      slug: tema.slug,
      descripcion: tema.descripcion,
      gcsUri: tema.gcsUri,
      path: `tema-principal/${tema.slug}/`,
      eliminado: tema.eliminado,
      fechaEliminacion: tema.fechaEliminacion,
      createdAt: tema.createdAt,
      updatedAt: tema.updatedAt,
      ...(tema.subcarpetas
        ? { subcarpetas: tema.subcarpetas.map(s => this.mapSubcarpeta(s)) }
        : {}),
    };
  }

  private mapSubcarpeta(subcarpeta: SubcarpetaNorma & { temaPrincipal?: TemaPrincipal }) {
    const temaSlug = subcarpeta.temaPrincipal?.slug;
    return {
      id: subcarpeta.id,
      tipoNorma: subcarpeta.nombre,
      nombre: subcarpeta.nombre,
      slug: subcarpeta.slug,
      descripcion: subcarpeta.descripcion,
      temaPrincipalId: subcarpeta.temaPrincipalId,
      gcsUri: subcarpeta.gcsUri,
      path: temaSlug ? `tema-principal/${temaSlug}/${subcarpeta.slug}/` : undefined,
      eliminado: subcarpeta.eliminado,
      fechaEliminacion: subcarpeta.fechaEliminacion,
      createdAt: subcarpeta.createdAt,
      updatedAt: subcarpeta.updatedAt,
      ...(subcarpeta.temaPrincipal
        ? {
            temaPrincipal: {
              id: subcarpeta.temaPrincipal.id,
              nombre: subcarpeta.temaPrincipal.nombre,
              slug: subcarpeta.temaPrincipal.slug,
            },
          }
        : {}),
    };
  }

  async createTema(nombre: string, slug: string, descripcion?: string) {
    const existente = await this.prisma.client.temaPrincipal.findUnique({
      where: { slug },
    });

    if (existente && !existente.eliminado) {
      throw new ConflictException(
        `La carpeta '${slug}' ya existe en el bucket de Google Cloud Storage.`,
      );
    }

    const folderPath = `tema-principal/${slug}/`;
    const gcsUri = await this.createFolder(folderPath);

    const tema = await this.prisma.client.temaPrincipal.create({
      data: { nombre, slug, gcsUri, descripcion },
    });

    this.logger.log(`Tema persistido en BD: id=${tema.id}, slug="${tema.slug}"`);
    return this.mapTema(tema);
  }

  async findAllTemas(incluirEliminados = false) {
    const temas = await this.prisma.client.temaPrincipal.findMany({
      where: this.temaWhereActivo(incluirEliminados),
      orderBy: { nombre: 'asc' },
      include: {
        subcarpetas: {
          where: this.subcarpetaWhereActivo(incluirEliminados),
          orderBy: { nombre: 'asc' },
        },
      },
    });

    return temas.map(tema => this.mapTema(tema));
  }

  async findTemaById(id: string, incluirEliminados = false) {
    const tema = await this.prisma.client.temaPrincipal.findFirst({
      where: { id, ...this.temaWhereActivo(incluirEliminados) },
      include: {
        subcarpetas: {
          where: this.subcarpetaWhereActivo(incluirEliminados),
          orderBy: { nombre: 'asc' },
        },
      },
    });

    if (!tema) {
      throw new NotFoundException(`El tema con ID ${id} no existe o fue eliminado.`);
    }

    return this.mapTema(tema);
  }

  async updateTema(id: string, dto: UpdateTemaDto) {
    const tema = await this.getTemaActivoOrThrow(id);

    const data: Prisma.TemaPrincipalUpdateInput = {};

    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion;
    }

    if (dto.nombreTema && dto.nombreTema !== tema.nombre) {
      const nuevoSlug = formatStorageSlug(dto.nombreTema);
      const slugEnUso = await this.prisma.client.temaPrincipal.findFirst({
        where: {
          slug: nuevoSlug,
          id: { not: id },
          eliminado: false,
        },
      });

      if (slugEnUso) {
        throw new ConflictException(`Ya existe un tema activo con el slug '${nuevoSlug}'.`);
      }

      data.nombre = dto.nombreTema;
      data.slug = nuevoSlug;
    }

    const updated = await this.prisma.client.temaPrincipal.update({
      where: { id },
      data,
      include: {
        subcarpetas: {
          where: this.subcarpetaWhereActivo(false),
          orderBy: { nombre: 'asc' },
        },
      },
    });

    return this.mapTema(updated);
  }

  async softDeleteTema(id: string) {
    const tema = await this.getTemaActivoOrThrow(id);

    if (tema.slug === TEMA_ESPECIALIDAD_GENERAL_SLUG) {
      throw new BadRequestException('No se puede eliminar el tema "General" del sistema.');
    }

    const fechaEliminacion = new Date();

    await this.prisma.client.$transaction([
      this.prisma.client.carpetaInterna.updateMany({
        where: { subcarpetaNorma: { temaPrincipalId: id }, eliminado: false },
        data: { eliminado: true, fechaEliminacion },
      }),
      this.prisma.client.subcarpetaNorma.updateMany({
        where: { temaPrincipalId: id, eliminado: false },
        data: { eliminado: true, fechaEliminacion },
      }),
      this.prisma.client.temaPrincipal.update({
        where: { id },
        data: { eliminado: true, fechaEliminacion },
      }),
    ]);

    return {
      message: 'Tema eliminado de forma pasiva exitosamente',
      id,
      fechaEliminacion,
    };
  }

  private async getTemaActivoOrThrow(id: string) {
    const tema = await this.prisma.client.temaPrincipal.findFirst({
      where: { id, eliminado: false },
    });

    if (!tema) {
      throw new NotFoundException(`El tema con ID ${id} no existe o fue eliminado.`);
    }

    return tema;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE SUBCARPETAS (TIPO DE NORMA)
  // ─────────────────────────────────────────────────────────────────────────────

  async createSubcarpeta(
    temaPrincipalId: string,
    tipoNorma: string,
    slug: string,
    descripcion?: string,
  ) {
    const tema = await this.getTemaActivoOrThrow(temaPrincipalId);

    const existente = await this.prisma.client.subcarpetaNorma.findUnique({
      where: {
        temaPrincipalId_slug: { temaPrincipalId, slug },
      },
    });

    if (existente && !existente.eliminado) {
      throw new ConflictException(
        `La carpeta '${tema.slug}/${slug}' ya existe en el bucket de Google Cloud Storage.`,
      );
    }

    const folderPath = `tema-principal/${tema.slug}/${slug}/`;
    const gcsUri = await this.createFolder(folderPath);

    const subcarpeta = await this.prisma.client.subcarpetaNorma.create({
      data: {
        nombre: tipoNorma,
        slug,
        gcsUri,
        descripcion,
        temaPrincipalId,
      },
      include: { temaPrincipal: true },
    });

    this.logger.log(
      `Subcarpeta persistida en BD: id=${subcarpeta.id}, tema=${tema.slug}, slug="${subcarpeta.slug}"`,
    );
    return this.mapSubcarpeta(subcarpeta);
  }

  async findSubcarpetasByTema(temaPrincipalId: string, incluirEliminados = false) {
    await this.getTemaActivoOrThrow(temaPrincipalId);

    const subcarpetas = await this.prisma.client.subcarpetaNorma.findMany({
      where: { temaPrincipalId, ...this.subcarpetaWhereActivo(incluirEliminados) },
      orderBy: { nombre: 'asc' },
      include: { temaPrincipal: true },
    });

    return subcarpetas.map(s => this.mapSubcarpeta(s));
  }

  async findSubcarpetaById(id: string, incluirEliminados = false) {
    const subcarpeta = await this.prisma.client.subcarpetaNorma.findFirst({
      where: { id, ...this.subcarpetaWhereActivo(incluirEliminados) },
      include: { temaPrincipal: true },
    });

    if (!subcarpeta) {
      throw new NotFoundException(`La subcarpeta con ID ${id} no existe o fue eliminada.`);
    }

    return this.mapSubcarpeta(subcarpeta);
  }

  async updateSubcarpeta(id: string, dto: UpdateSubcarpetaDto) {
    const subcarpeta = await this.getSubcarpetaActivaOrThrow(id);
    const data: Prisma.SubcarpetaNormaUpdateInput = {};

    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion;
    }

    if (dto.tipoNorma && dto.tipoNorma !== subcarpeta.nombre) {
      const nuevoSlug = formatStorageSlug(dto.tipoNorma);
      const slugEnUso = await this.prisma.client.subcarpetaNorma.findFirst({
        where: {
          temaPrincipalId: subcarpeta.temaPrincipalId,
          slug: nuevoSlug,
          id: { not: id },
          eliminado: false,
        },
      });

      if (slugEnUso) {
        throw new ConflictException(
          `Ya existe una subcarpeta activa con el slug '${nuevoSlug}' en este tema.`,
        );
      }

      data.nombre = dto.tipoNorma;
      data.slug = nuevoSlug;
    }

    const updated = await this.prisma.client.subcarpetaNorma.update({
      where: { id },
      data,
      include: { temaPrincipal: true },
    });

    return this.mapSubcarpeta(updated);
  }

  async softDeleteSubcarpeta(id: string) {
    await this.getSubcarpetaActivaOrThrow(id);

    const fechaEliminacion = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.carpetaInterna.updateMany({
        where: { subcarpetaNormaId: id, eliminado: false },
        data: { eliminado: true, fechaEliminacion },
      }),
      this.prisma.client.subcarpetaNorma.update({
        where: { id },
        data: { eliminado: true, fechaEliminacion },
      }),
    ]);

    return {
      message: 'Subcarpeta eliminada de forma pasiva exitosamente',
      id,
      fechaEliminacion,
    };
  }

  private async getSubcarpetaActivaOrThrow(id: string) {
    const subcarpeta = await this.prisma.client.subcarpetaNorma.findFirst({
      where: { id, eliminado: false },
    });

    if (!subcarpeta) {
      throw new NotFoundException(`La subcarpeta con ID ${id} no existe o fue eliminada.`);
    }

    return subcarpeta;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE CARPETAS INTERNAS (ANIDADAS)
  // ─────────────────────────────────────────────────────────────────────────────

  private carpetaInternaWhereActivo(incluirEliminados = false): Prisma.CarpetaInternaWhereInput {
    return incluirEliminados ? {} : { eliminado: false };
  }

  private buildCarpetaInternaFolderPath(
    temaSlug: string,
    subcarpetaSlug: string,
    carpetaSlugs: string[],
  ): string {
    const segmentos = ['tema-principal', temaSlug, subcarpetaSlug, ...carpetaSlugs];
    return `${segmentos.join('/')}/`;
  }

  private mapCarpetaInterna(
    carpeta: CarpetaInterna & {
      subcarpetaNorma?: SubcarpetaNorma & { temaPrincipal?: TemaPrincipal };
    },
    pathSlugs?: string[],
  ) {
    const temaSlug = carpeta.subcarpetaNorma?.temaPrincipal?.slug;
    const subcarpetaSlug = carpeta.subcarpetaNorma?.slug;
    const slugs = pathSlugs ?? [carpeta.slug];
    const path =
      temaSlug && subcarpetaSlug
        ? this.buildCarpetaInternaFolderPath(temaSlug, subcarpetaSlug, slugs)
        : undefined;

    return {
      id: carpeta.id,
      nombre: carpeta.nombre,
      slug: carpeta.slug,
      descripcion: carpeta.descripcion,
      nivel: carpeta.nivel,
      parentId: carpeta.parentId,
      subcarpetaNormaId: carpeta.subcarpetaNormaId,
      gcsUri: carpeta.gcsUri,
      path,
      eliminado: carpeta.eliminado,
      fechaEliminacion: carpeta.fechaEliminacion,
      createdAt: carpeta.createdAt,
      updatedAt: carpeta.updatedAt,
    };
  }

  async getCarpetaSlugsChain(carpetaId: string): Promise<string[]> {
    const slugs: string[] = [];
    let currentId: string | null = carpetaId;

    while (currentId) {
      const carpeta: { slug: string; parentId: string | null } | null =
        await this.prisma.client.carpetaInterna.findUnique({
          where: { id: currentId },
          select: { slug: true, parentId: true },
        });

      if (!carpeta) break;
      slugs.unshift(carpeta.slug);
      currentId = carpeta.parentId;
    }

    return slugs;
  }

  private async assertSlugRaizDisponible(subcarpetaNormaId: string, slug: string) {
    const existente = await this.prisma.client.carpetaInterna.findFirst({
      where: {
        subcarpetaNormaId,
        parentId: null,
        slug,
        eliminado: false,
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una carpeta interna raíz con el slug '${slug}' en esta subcarpeta.`,
      );
    }
  }

  private async assertSlugHijoDisponible(parentId: string, slug: string) {
    const existente = await this.prisma.client.carpetaInterna.findFirst({
      where: {
        parentId,
        slug,
        eliminado: false,
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una carpeta interna hija con el slug '${slug}' bajo el mismo padre.`,
      );
    }
  }

  async createCarpetaInternaRaiz(
    subcarpetaNormaId: string,
    nombre: string,
    slug: string,
    descripcion?: string,
  ) {
    const subcarpeta = await this.prisma.client.subcarpetaNorma.findFirst({
      where: { id: subcarpetaNormaId, eliminado: false },
      include: { temaPrincipal: true },
    });

    if (!subcarpeta?.temaPrincipal) {
      throw new NotFoundException(
        `La subcarpeta con ID ${subcarpetaNormaId} no existe o fue eliminada.`,
      );
    }

    await this.assertSlugRaizDisponible(subcarpetaNormaId, slug);

    const folderPath = this.buildCarpetaInternaFolderPath(
      subcarpeta.temaPrincipal.slug,
      subcarpeta.slug,
      [slug],
    );
    const gcsUri = await this.createFolder(folderPath);

    const carpeta = await this.prisma.client.carpetaInterna.create({
      data: {
        nombre,
        slug,
        gcsUri,
        descripcion,
        nivel: 1,
        subcarpetaNormaId,
        parentId: null,
      },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    this.logger.log(
      `Carpeta interna raíz creada: id=${carpeta.id}, subcarpeta=${subcarpeta.slug}, slug="${slug}"`,
    );
    return this.mapCarpetaInterna(carpeta, [slug]);
  }

  async createCarpetaInternaHija(
    parentId: string,
    nombre: string,
    slug: string,
    descripcion?: string,
  ) {
    const padre = await this.prisma.client.carpetaInterna.findFirst({
      where: { id: parentId, eliminado: false },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    if (!padre?.subcarpetaNorma?.temaPrincipal) {
      throw new NotFoundException(
        `La carpeta interna padre con ID ${parentId} no existe o fue eliminada.`,
      );
    }

    if (padre.nivel >= MAX_NIVEL_CARPETA_INTERNA) {
      throw new BadRequestException(
        `No se pueden crear más de ${MAX_NIVEL_CARPETA_INTERNA} niveles de carpetas internas.`,
      );
    }

    await this.assertSlugHijoDisponible(parentId, slug);

    const slugsPadre = await this.getCarpetaSlugsChain(parentId);
    const slugsCompletos = [...slugsPadre, slug];
    const folderPath = this.buildCarpetaInternaFolderPath(
      padre.subcarpetaNorma.temaPrincipal.slug,
      padre.subcarpetaNorma.slug,
      slugsCompletos,
    );
    const gcsUri = await this.createFolder(folderPath);

    const carpeta = await this.prisma.client.carpetaInterna.create({
      data: {
        nombre,
        slug,
        gcsUri,
        descripcion,
        nivel: padre.nivel + 1,
        subcarpetaNormaId: padre.subcarpetaNormaId,
        parentId,
      },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    this.logger.log(
      `Carpeta interna hija creada: id=${carpeta.id}, padre=${parentId}, nivel=${carpeta.nivel}`,
    );
    return this.mapCarpetaInterna(carpeta, slugsCompletos);
  }

  async findCarpetasInternasRaiz(subcarpetaNormaId: string, incluirEliminados = false) {
    await this.getSubcarpetaActivaOrThrow(subcarpetaNormaId);

    const carpetas = await this.prisma.client.carpetaInterna.findMany({
      where: {
        subcarpetaNormaId,
        parentId: null,
        ...this.carpetaInternaWhereActivo(incluirEliminados),
      },
      orderBy: { nombre: 'asc' },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    return carpetas.map(c => this.mapCarpetaInterna(c, [c.slug]));
  }

  async findCarpetasInternasHijas(parentId: string, incluirEliminados = false) {
    await this.getCarpetaInternaActivaOrThrow(parentId);

    const padre = await this.prisma.client.carpetaInterna.findFirst({
      where: { id: parentId },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    if (!padre) {
      throw new NotFoundException(`La carpeta interna con ID ${parentId} no existe.`);
    }

    const slugsPadre = await this.getCarpetaSlugsChain(parentId);

    const hijos = await this.prisma.client.carpetaInterna.findMany({
      where: {
        parentId,
        ...this.carpetaInternaWhereActivo(incluirEliminados),
      },
      orderBy: { nombre: 'asc' },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    return hijos.map(h => this.mapCarpetaInterna(h, [...slugsPadre, h.slug]));
  }

  async findCarpetaInternaById(id: string, incluirEliminados = false) {
    const carpeta = await this.prisma.client.carpetaInterna.findFirst({
      where: { id, ...this.carpetaInternaWhereActivo(incluirEliminados) },
      include: {
        subcarpetaNorma: { include: { temaPrincipal: true } },
      },
    });

    if (!carpeta) {
      throw new NotFoundException(`La carpeta interna con ID ${id} no existe o fue eliminada.`);
    }

    const slugs = carpeta.parentId
      ? [...(await this.getCarpetaSlugsChain(carpeta.parentId)), carpeta.slug]
      : [carpeta.slug];

    return this.mapCarpetaInterna(carpeta, slugs);
  }

  async softDeleteCarpetaInterna(id: string) {
    await this.getCarpetaInternaActivaOrThrow(id);

    const idsToDelete = await this.collectDescendantCarpetaIds(id);
    const fechaEliminacion = new Date();

    await this.prisma.client.carpetaInterna.updateMany({
      where: { id: { in: idsToDelete }, eliminado: false },
      data: { eliminado: true, fechaEliminacion },
    });

    return {
      message: 'Carpeta interna eliminada de forma pasiva exitosamente',
      id,
      idsEliminados: idsToDelete,
      fechaEliminacion,
    };
  }

  private async collectDescendantCarpetaIds(rootId: string): Promise<string[]> {
    const ids: string[] = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const hijos = await this.prisma.client.carpetaInterna.findMany({
        where: { parentId: { in: frontier }, eliminado: false },
        select: { id: true },
      });

      const childIds = hijos.map(h => h.id);
      ids.push(...childIds);
      frontier = childIds;
    }

    return ids;
  }

  private async getCarpetaInternaActivaOrThrow(id: string) {
    const carpeta = await this.prisma.client.carpetaInterna.findFirst({
      where: { id, eliminado: false },
    });

    if (!carpeta) {
      throw new NotFoundException(`La carpeta interna con ID ${id} no existe o fue eliminada.`);
    }

    return carpeta;
  }
}
