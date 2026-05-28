import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Sube una imagen a Cloudinary directamente desde memoria usando streams.
   * @param file Archivo capturado por Multer
   * @param folder Carpeta destino en Cloudinary (ej: 'usuarios', 'logos')
   * @returns La respuesta completa de Cloudinary incluyendo la secure_url
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Error de Cloudinary: ${error.message}`, error);
            return reject(
              new InternalServerErrorException('No se pudo procesar la subida de la imagen'),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Elimina un archivo de Cloudinary usando su Public ID.
   * @param publicId ID único de la imagen en Cloudinary
   */
  async deleteImage(publicId: string): Promise<unknown> {
    try {
      const result: unknown = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Imagen eliminada de Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al borrar en Cloudinary: ${message}`, error);
      throw new InternalServerErrorException('Error al eliminar la imagen en la nube');
    }
  }
}
