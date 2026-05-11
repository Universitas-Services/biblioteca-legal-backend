import { Injectable, ConflictException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { Documento } from '.prisma/client';

@Injectable()
export class DocumentosService {
  constructor(
    private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  async procesarCarga(file: Express.Multer.File, titulo: string) {
    // 1. Validar colisiones en la BD
    const colision = await this.prisma.client.documento.findFirst({
      where: {
        titulo: titulo,
      },
    });

    if (colision) {
      throw new ConflictException('Ya existe un documento registrado con este Título.');
    }

    // 2. Subir el archivo original a Google Cloud Storage
    const cloudUrl = await this.storage.uploadPdf(file.originalname, file.buffer);

    // 3. Guardar el registro en base de datos
    const nuevoDoc: Documento = await this.prisma.client.documento.create({
      data: {
        titulo: titulo,
        archivoOriginalUrl: cloudUrl,
        estado: 'Pendiente de Revisión',
      },
    });

    return { message: 'Carga exitosa', documento: nuevoDoc };
  }
}
