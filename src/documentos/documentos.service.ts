import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoDocumento, Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { PublicQueryDto } from './dto/public-query.dto';
import { ValidarDuplicidadService } from './services/validar-duplicidad.service';
import { AsignacionRevisorService } from './services/asignacion-revisor.service';
import { CategoriasService } from '../categorias/categorias.service';
import {
  DOCUMENTO_ESTADO_CAMBIADO,
  DocumentoEstadoCambiadoEvent,
} from '../common/events/documento-estado.event';
import { EspecialidadService } from '../common/especialidad/especialidad.service';

@Injectable()
export class DocumentosService {
  constructor(
    private storage: StorageService,
    private prisma: PrismaService,
    private validarDuplicidad: ValidarDuplicidadService,
    private asignacionRevisor: AsignacionRevisorService,
    private categoriasService: CategoriasService,
    private eventEmitter: EventEmitter2,
    private especialidad: EspecialidadService,
  ) {}

  private emitEstadoCambio(documentoId: string, anterior: EstadoDocumento, nuevo: EstadoDocumento) {
    if (anterior !== nuevo) {
      this.eventEmitter.emit(
        DOCUMENTO_ESTADO_CAMBIADO,
        new DocumentoEstadoCambiadoEvent(documentoId, anterior, nuevo),
      );
    }
  }

  async procesarCarga(file: Express.Multer.File, data: UploadDocumentoDto, curadorId: string) {
    await this.validarDuplicidad.validar(
      data.tituloIntegro,
      data.enteEmisor,
      data.fechaPublicacion,
    );
    await this.categoriasService.validarIdsAprobadas(data.categoriaIds);
    await this.especialidad.assertCuradorPuedeSubirTema(curadorId, data.temaPrincipal);

    const cloudUrl = await this.storage.uploadDocument(file);
    const revisorAsignadoId = await this.asignacionRevisor.asignarPorTema(data.temaPrincipal);

    const nuevoDoc = await this.prisma.client.documento.create({
      data: {
        titulo: data.titulo,
        tituloIntegro: data.tituloIntegro,
        archivoOriginalUrl: cloudUrl,
        estado: EstadoDocumento.PENDIENTE_REVISION,
        soloLecturaImagen: data.soloLecturaImagen ?? false,
        nombreBreve: data.nombreBreve,
        temaPrincipal: data.temaPrincipal,
        etiquetas: data.etiquetas ?? [],
        tipoNorma: data.tipoNorma,
        enteEmisor: data.enteEmisor,
        fechaPublicacion: data.fechaPublicacion,
        numeroGaceta: data.numeroGaceta,
        resumen: data.resumen,
        palabrasClave: data.palabrasClave ?? [],
        curadorId,
        revisorAsignadoId,
        categorias: { connect: data.categoriaIds.map(id => ({ id })) },
      },
      include: { categorias: true, revisorAsignado: true },
    });

    return { message: 'Carga exitosa', documentoId: nuevoDoc.id, documento: nuevoDoc };
  }

  async procesarReforma(
    file: Express.Multer.File,
    data: UploadDocumentoDto,
    leyViejaId: string,
    curadorId: string,
  ) {
    const leyVieja = await this.findOne(leyViejaId);
    const resultado = await this.procesarCarga(file, data, curadorId);

    const estadoAnterior = leyVieja.estado;
    await this.prisma.client.documento.update({
      where: { id: leyViejaId },
      data: { estado: EstadoDocumento.REFORMADA },
    });
    this.emitEstadoCambio(leyViejaId, estadoAnterior, EstadoDocumento.REFORMADA);

    const documentoNuevo = await this.prisma.client.documento.update({
      where: { id: resultado.documento.id },
      data: {
        esReforma: true,
        reformaAId: leyViejaId,
      },
      include: { reformaA: true, categorias: true },
    });

    return {
      message: 'Reforma registrada exitosamente',
      documentoId: documentoNuevo.id,
      documento: documentoNuevo,
    };
  }

  async findAll() {
    return this.prisma.client.documento.findMany({
      where: { eliminado: false },
      orderBy: { ultimaActualizacion: 'desc' },
      include: { categorias: true, revisorAsignado: true },
    });
  }

  async findPublic(query: PublicQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentoWhereInput = {
      eliminado: false,
      estado: { not: EstadoDocumento.PENDIENTE_REVISION },
    };

    if (query.categoriaId) {
      where.categorias = { some: { id: query.categoriaId } };
    }
    if (query.enteEmisor) {
      where.enteEmisor = { contains: query.enteEmisor, mode: 'insensitive' };
    }
    if (query.q) {
      where.OR = [
        { titulo: { contains: query.q, mode: 'insensitive' } },
        { resumen: { contains: query.q, mode: 'insensitive' } },
        { palabrasClave: { has: query.q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.client.documento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ultimaActualizacion: 'desc' },
        include: { categorias: true },
      }),
      this.prisma.client.documento.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSeoByNombreBreve(nombreBreve: string) {
    const documento = await this.prisma.client.documento.findFirst({
      where: {
        nombreBreve,
        eliminado: false,
        estado: { not: EstadoDocumento.PENDIENTE_REVISION },
      },
      select: {
        id: true,
        titulo: true,
        tituloIntegro: true,
        nombreBreve: true,
        temaPrincipal: true,
        enteEmisor: true,
        fechaPublicacion: true,
        tipoNorma: true,
        numeroGaceta: true,
        resumen: true,
        palabrasClave: true,
        etiquetas: true,
        estado: true,
        ultimaActualizacion: true,
        categorias: { select: { id: true, nombre: true } },
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento SEO '${nombreBreve}' no encontrado`);
    }

    return documento;
  }

  async findOne(id: string) {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id, eliminado: false },
      include: {
        reformaA: true,
        reformas: true,
        categorias: true,
        revisorAsignado: true,
        curador: true,
        matrizA: true,
        matrizB: true,
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado o fue eliminado.`);
    }

    return documento;
  }

  async registrarVisor(userId: string, documentoId: string) {
    const documento = await this.findOne(documentoId);

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { consultasRealizadas: { increment: 1 } },
      }),
      this.prisma.client.historialConsulta.create({
        data: { userId, documentoId },
      }),
    ]);

    const url = await this.storage.getSignedUrl(documento.archivoOriginalUrl);
    return { url, documentoId: documento.id };
  }

  async update(id: string, updateData: UpdateDocumentoDto, file?: Express.Multer.File) {
    const documento = await this.findOne(id);

    let cloudUrl = documento.archivoOriginalUrl;
    if (file) {
      cloudUrl = await this.storage.uploadDocument(file);
    }

    const data: Prisma.DocumentoUpdateInput = {
      titulo: updateData.titulo,
      tituloIntegro: updateData.tituloIntegro,
      archivoOriginalUrl: cloudUrl,
      soloLecturaImagen: updateData.soloLecturaImagen,
      nombreBreve: updateData.nombreBreve,
      temaPrincipal: updateData.temaPrincipal,
      etiquetas: updateData.etiquetas,
      tipoNorma: updateData.tipoNorma,
      enteEmisor: updateData.enteEmisor,
      fechaPublicacion: updateData.fechaPublicacion,
      numeroGaceta: updateData.numeroGaceta,
      resumen: updateData.resumen,
      palabrasClave: updateData.palabrasClave,
    };

    if (updateData.categoriaIds?.length) {
      await this.categoriasService.validarIdsAprobadas(updateData.categoriaIds);
      data.categorias = { set: updateData.categoriaIds.map(cid => ({ id: cid })) };
    }

    const updatedDoc = await this.prisma.client.documento.update({
      where: { id },
      data,
      include: { categorias: true },
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

  async cambiarEstado(id: string, nuevoEstado: EstadoDocumento) {
    const documento = await this.findOne(id);
    const updated = await this.prisma.client.documento.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
    this.emitEstadoCambio(id, documento.estado, nuevoEstado);
    return updated;
  }
}
