import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { Documento } from '.prisma/client';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(
    private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  async procesarCarga(file: Express.Multer.File, data: UploadDocumentoDto) {
    // 1. Validar colisiones en la BD
    const colision = await this.prisma.client.documento.findFirst({
      where: {
        titulo: data.titulo,
        eliminado: false,
      },
    });

    if (colision) {
      throw new ConflictException('Ya existe un documento registrado con este Título.');
    }

    // 2. Subir el archivo original a Google Cloud Storage
    const cloudUrl = await this.storage.uploadDocument(file);

    // 3. Guardar el registro en base de datos
    const nuevoDoc: Documento = await this.prisma.client.documento.create({
      data: {
        titulo: data.titulo,
        archivoOriginalUrl: cloudUrl,
        estado: 'Pendiente de Revisión',
        soloLecturaImagen: data.soloLecturaImagen ?? false,
        nombreBreve: data.nombreBreve,
        temaPrincipal: data.temaPrincipal,
        categorias: data.categorias ?? [],
        etiquetas: data.etiquetas ?? [],
        tipoNorma: data.tipoNorma,
        enteEmisor: data.enteEmisor,
        fechaPublicacion: data.fechaPublicacion,
        numeroGaceta: data.numeroGaceta,
        esReforma: data.esReforma ?? false,
        reformaAId: data.reformaAId,
        matrizAElementos: data.matrizAElementos ?? [],
        matrizBElementos: data.matrizBElementos ?? [],
        resumen: data.resumen,
        palabrasClave: data.palabrasClave ?? [],
      },
    });

    return { message: 'Carga exitosa', documento: nuevoDoc };
  }

  async findAll() {
    return this.prisma.client.documento.findMany({
      where: { eliminado: false },
      orderBy: { ultimaActualizacion: 'desc' },
    });
  }

  async findOne(id: string) {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id, eliminado: false },
      include: {
        reformaA: true,
        reformas: true,
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado o fue eliminado.`);
    }

    return documento;
  }

  async update(id: string, updateData: UpdateDocumentoDto, file?: Express.Multer.File) {
    const documento = await this.findOne(id);

    let cloudUrl = documento.archivoOriginalUrl;
    if (file) {
      // Optional: replace file in storage
      cloudUrl = await this.storage.uploadDocument(file);
    }

    const updatedDoc = await this.prisma.client.documento.update({
      where: { id },
      data: {
        titulo: updateData.titulo !== undefined ? updateData.titulo : undefined,
        archivoOriginalUrl: cloudUrl,
        soloLecturaImagen:
          updateData.soloLecturaImagen !== undefined ? updateData.soloLecturaImagen : undefined,
        nombreBreve: updateData.nombreBreve !== undefined ? updateData.nombreBreve : undefined,
        temaPrincipal:
          updateData.temaPrincipal !== undefined ? updateData.temaPrincipal : undefined,
        categorias: updateData.categorias !== undefined ? updateData.categorias : undefined,
        etiquetas: updateData.etiquetas !== undefined ? updateData.etiquetas : undefined,
        tipoNorma: updateData.tipoNorma !== undefined ? updateData.tipoNorma : undefined,
        enteEmisor: updateData.enteEmisor !== undefined ? updateData.enteEmisor : undefined,
        fechaPublicacion:
          updateData.fechaPublicacion !== undefined ? updateData.fechaPublicacion : undefined,
        numeroGaceta: updateData.numeroGaceta !== undefined ? updateData.numeroGaceta : undefined,
        esReforma: updateData.esReforma !== undefined ? updateData.esReforma : undefined,
        reformaAId: updateData.reformaAId !== undefined ? updateData.reformaAId : undefined,
        matrizAElementos:
          updateData.matrizAElementos !== undefined ? updateData.matrizAElementos : undefined,
        matrizBElementos:
          updateData.matrizBElementos !== undefined ? updateData.matrizBElementos : undefined,
        resumen: updateData.resumen !== undefined ? updateData.resumen : undefined,
        palabrasClave:
          updateData.palabrasClave !== undefined ? updateData.palabrasClave : undefined,
      },
    });

    return { message: 'Actualización exitosa', documento: updatedDoc };
  }

  async softDelete(id: string) {
    const documento = await this.findOne(id);
    await this.prisma.client.documento.update({
      where: { id: documento.id },
      data: {
        eliminado: true,
        fechaEliminacion: new Date(),
      },
    });

    return { message: 'Documento eliminado de forma pasiva exitosamente' };
  }
}
