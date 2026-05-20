import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
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
}
