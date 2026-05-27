import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

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
    const uniqueFileName = `${(uuidv4 as () => string)()}${extension}`;
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

  /**
   * Crea un tema principal en la base de datos y su carpeta simulada en GCS.
   *
   * Flujo:
   * 1. Verifica si ya existe un tema con el mismo slug en la BD.
   *    - Si existe → ConflictException con mensaje referenciando el bucket.
   * 2. Crea la carpeta simulada en GCS usando `createFolder()`.
   * 3. Persiste el registro en la tabla `TemaPrincipal` con Prisma.
   * 4. Retorna el objeto completo con `id`, `nombre`, `slug` y `gcsUri`.
   *
   * @param nombre - Nombre original del tema (ej: "Contrataciones Públicas").
   * @param slug - Nombre formateado (ej: "contrataciones-publicas").
   * @returns El registro creado en la BD incluyendo el ID auto-incremental.
   * @throws ConflictException si el tema ya existe en la BD o en GCS.
   */
  async createTema(nombre: string, slug: string) {
    // Verificar si el slug ya existe en la base de datos antes de intentar crear en GCS
    const existente = await this.prisma.client.temaPrincipal.findUnique({
      where: { slug },
    });

    if (existente) {
      // Lanzar ConflictException con mensaje descriptivo que referencia el bucket
      throw new ConflictException(
        `La carpeta '${slug}' ya existe en el bucket de Google Cloud Storage.`,
      );
    }

    // Construir la ruta de la carpeta y crearla en GCS
    const folderPath = `tema-principal/${slug}/`;
    const gcsUri = await this.createFolder(folderPath);

    // Persistir el registro en la base de datos con el URI obtenido de GCS
    const tema = await this.prisma.client.temaPrincipal.create({
      data: { nombre, slug, gcsUri },
    });

    this.logger.log(`Tema persistido en BD: id=${tema.id}, slug="${tema.slug}"`);
    return tema;
  }

  /**
   * Retorna todos los temas principales registrados en la BD,
   * incluyendo sus subcarpetas de tipo de norma.
   *
   * @returns Array de temas con sus subcarpetas anidadas.
   */
  async findAllTemas() {
    return this.prisma.client.temaPrincipal.findMany({
      orderBy: { id: 'asc' },
      include: {
        // Incluir subcarpetas anidadas ordenadas por ID para facilitar la lectura
        subcarpetas: { orderBy: { id: 'asc' } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE SUBCARPETAS (TIPO DE NORMA)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea una subcarpeta de tipo de norma dentro de un tema principal.
   *
   * Flujo:
   * 1. Busca el tema padre por ID en la BD.
   *    - Si no existe → NotFoundException.
   * 2. Verifica si ya existe una subcarpeta con el mismo slug dentro de ese tema.
   *    - Si existe → ConflictException con mensaje referenciando el bucket.
   * 3. Crea la carpeta simulada en GCS usando el slug del tema padre.
   * 4. Persiste el registro en la tabla `SubcarpetaNorma`.
   * 5. Retorna el objeto completo con `id`, `nombre`, `slug`, `temaPrincipalId` y `gcsUri`.
   *
   * @param temaPrincipalId - ID del tema padre (entero auto-incremental).
   * @param nombre - Nombre original del tipo de norma (ej: "Ley Orgánica").
   * @param slug - Nombre formateado (ej: "ley-organica").
   * @returns El registro de subcarpeta creado en la BD.
   * @throws NotFoundException si el tema padre no existe.
   * @throws ConflictException si la subcarpeta ya existe dentro del tema.
   */
  async createSubcarpeta(temaPrincipalId: number, nombre: string, slug: string) {
    // Buscar el tema padre para obtener su slug (necesario para construir la ruta GCS)
    const tema = await this.prisma.client.temaPrincipal.findUnique({
      where: { id: temaPrincipalId },
    });

    if (!tema) {
      throw new NotFoundException(`El tema con ID ${temaPrincipalId} no existe.`);
    }

    // Verificar si ya existe una subcarpeta con el mismo slug dentro de este tema
    const existente = await this.prisma.client.subcarpetaNorma.findUnique({
      where: {
        temaPrincipalId_slug: { temaPrincipalId, slug },
      },
    });

    if (existente) {
      // Mensaje claro que referencia el bucket de GCS y la ruta exacta
      throw new ConflictException(
        `La carpeta '${tema.slug}/${slug}' ya existe en el bucket de Google Cloud Storage.`,
      );
    }

    // Construir la ruta completa usando el slug del tema padre y crear la carpeta en GCS
    const folderPath = `tema-principal/${tema.slug}/${slug}/`;
    const gcsUri = await this.createFolder(folderPath);

    // Persistir el registro de la subcarpeta en la base de datos
    const subcarpeta = await this.prisma.client.subcarpetaNorma.create({
      data: { nombre, slug, gcsUri, temaPrincipalId },
    });

    this.logger.log(
      `Subcarpeta persistida en BD: id=${subcarpeta.id}, tema=${tema.slug}, slug="${subcarpeta.slug}"`,
    );
    return subcarpeta;
  }

  /**
   * Retorna todas las subcarpetas de tipo de norma de un tema específico.
   *
   * @param temaPrincipalId - ID del tema padre.
   * @returns Array de subcarpetas del tema, ordenadas por ID.
   * @throws NotFoundException si el tema padre no existe.
   */
  async findSubcarpetasByTema(temaPrincipalId: number) {
    // Verificar que el tema exista antes de listar sus subcarpetas
    const tema = await this.prisma.client.temaPrincipal.findUnique({
      where: { id: temaPrincipalId },
    });

    if (!tema) {
      throw new NotFoundException(`El tema con ID ${temaPrincipalId} no existe.`);
    }

    return this.prisma.client.subcarpetaNorma.findMany({
      where: { temaPrincipalId },
      orderBy: { id: 'asc' },
    });
  }
}
