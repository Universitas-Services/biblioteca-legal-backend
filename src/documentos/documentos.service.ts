import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoDocumento, EstadoLegal, Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { ReformaDocumentoDto } from './dto/reforma-documento.dto';
import { PublicQueryDto } from './dto/public-query.dto';
import { AdminDocumentosQueryDto } from './dto/admin-documentos-query.dto';
import {
  CuradorDocumentosQueryDto,
  CuradorFiltroEstado,
  CuradorFiltroTiempo,
} from './dto/curador-documentos-query.dto';
import { UploadBorradorDto } from './dto/upload-borrador.dto';
import { PublicarBorradorDto } from './dto/publicar-borrador.dto';
import { ValidarDuplicidadService } from './services/validar-duplicidad.service';
import { AsignacionRevisorService } from './services/asignacion-revisor.service';
import { CategoriasService } from '../categorias/categorias.service';
import {
  DOCUMENTO_ESTADO_CAMBIADO,
  DocumentoEstadoCambiadoEvent,
} from '../common/events/documento-estado.event';
import {
  DOCUMENTO_ESTADO_LEGAL_CAMBIADO,
  DocumentoEstadoLegalCambiadoEvent,
} from '../common/events/documento-estado-legal.event';
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

  private emitEstadoLegalCambio(
    documentoId: string,
    anterior: EstadoLegal | null,
    nuevo: EstadoLegal,
  ) {
    if (anterior !== nuevo) {
      this.eventEmitter.emit(
        DOCUMENTO_ESTADO_LEGAL_CAMBIADO,
        new DocumentoEstadoLegalCambiadoEvent(documentoId, anterior, nuevo),
      );
    }
  }

  private mapDocumentoResponse(doc: any) {
    if (!doc) return doc;
    const metadatosObj = typeof doc.metadatos === 'object' && doc.metadatos !== null ? doc.metadatos : {};
    return {
      ...doc,
      estado: metadatosObj.estado ?? doc.estado, // si el frontend necesita el estado regional y colisiona con estado de revision, el frontend deberia usar estadoRegional o el json, pero segun requerimientos 'Estado' y 'Municipio' vienen de metadatos. OJO: hay un campo 'estado' (EstadoDocumento).
      estadoRegional: metadatosObj.estado,
      municipio: metadatosObj.municipio,
      gaceta: doc.gacetaPdfUrl || doc.numeroGaceta || null,
    };
  }

  private async resolverCarpetaDestino(subcarpetaNormaId: string, carpetaInternaId?: string) {
    const subcarpeta = await this.prisma.client.subcarpetaNorma.findFirst({
      where: { id: subcarpetaNormaId, eliminado: false },
      include: { temaPrincipal: { select: { slug: true, nombre: true, eliminado: true } } },
    });

    if (!subcarpeta || subcarpeta.temaPrincipal.eliminado) {
      throw new NotFoundException(
        `La subcarpeta con ID ${subcarpetaNormaId} no existe o su tema fue eliminado.`,
      );
    }

    let gcsPath = `tema-principal/${subcarpeta.temaPrincipal.slug}/${subcarpeta.slug}`;
    let carpetaInternaIdFinal: string | null = null;

    if (carpetaInternaId) {
      const carpeta = await this.prisma.client.carpetaInterna.findFirst({
        where: { id: carpetaInternaId, eliminado: false },
      });

      if (!carpeta) {
        throw new NotFoundException(
          `La carpeta interna con ID ${carpetaInternaId} no existe o fue eliminada.`,
        );
      }

      const slugsChain = await this.storage.getCarpetaSlugsChain(carpetaInternaId);
      gcsPath = `tema-principal/${subcarpeta.temaPrincipal.slug}/${subcarpeta.slug}/${slugsChain.join('/')}`;
      carpetaInternaIdFinal = carpeta.id;
    }

    return {
      gcsPath,
      subcarpetaNormaId: subcarpeta.id,
      carpetaInternaId: carpetaInternaIdFinal,
      temaPrincipal: subcarpeta.temaPrincipal.nombre,
      tipoNorma: subcarpeta.nombre,
    };
  }

  async procesarCarga(
    file: Express.Multer.File | undefined,
    gacetaFile: Express.Multer.File | undefined,
    data: UploadDocumentoDto,
    curadorId: string,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo principal (file) es requerido');
    }
    await this.validarDuplicidad.validar(
      data.tituloIntegro,
      data.enteEmisor,
      data.fechaPublicacion,
    );
    await this.categoriasService.validarIdsAprobadas(data.categoriaIds);

    const destino = await this.resolverCarpetaDestino(
      data.subcarpetaNormaId,
      data.carpetaInternaId,
    );
    await this.especialidad.assertCuradorPuedeSubirTema(curadorId, destino.temaPrincipal);

    const cloudUrl = await this.storage.uploadDocument(file, 'pendientes');
    let gacetaCloudUrl: string | null = null;
    if (gacetaFile) {
      gacetaCloudUrl = await this.storage.uploadDocument(gacetaFile, 'pendientes');
    }
    const revisorAsignadoId = await this.asignacionRevisor.asignarPorTema(destino.temaPrincipal);

    const nuevoDoc = await this.prisma.client.documento.create({
      data: {
        titulo: data.titulo,
        tituloIntegro: data.tituloIntegro,
        archivoOriginalUrl: cloudUrl,
        gacetaPdfUrl: gacetaCloudUrl,
        estado: EstadoDocumento.PENDIENTE_REVISION,
        soloLecturaImagen: data.soloLecturaImagen ?? false,
        ocrHabilitado: data.ocrHabilitado ?? false,
        nombreBreve: data.nombreBreve,
        temaPrincipal: destino.temaPrincipal,
        etiquetas: data.etiquetas ?? [],
        tipoNorma: destino.tipoNorma,
        subcarpetaNormaId: destino.subcarpetaNormaId,
        carpetaInternaId: destino.carpetaInternaId,
        enteEmisor: data.enteEmisor,
        fechaPublicacion: data.fechaPublicacion,
        numeroGaceta: data.numeroGaceta,
        resumen: data.resumen,
        palabrasClave: data.palabrasClave ?? [],
        pais: data.pais,
        metadatos: (data.metadatos as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        jerarquiaSuperiorId: data.jerarquiaSuperiorId,
        documentoRelacionadoId: data.documentoRelacionadoId,
        curadorId,
        revisorAsignadoId,
        categorias: { connect: data.categoriaIds.map(id => ({ id })) },
        ...(data.matrizAId ? { matrizAId: data.matrizAId } : {}),
        ...(data.matrizBIds?.length
          ? { matrizB: { connect: data.matrizBIds.map(id => ({ id })) } }
          : {}),
      },
      include: { categorias: true, revisorAsignado: true },
    });

    return { message: 'Carga exitosa', documentoId: nuevoDoc.id, documento: nuevoDoc };
  }

  async procesarReforma(
    file: Express.Multer.File | undefined,
    gacetaFile: Express.Multer.File | undefined,
    data: Omit<ReformaDocumentoDto, 'leyViejaId'>,
    leyViejaId: string,
    curadorId: string,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo principal (file) es requerido');
    }
    const leyVieja = await this.findOne(leyViejaId);

    const destino = await this.resolverCarpetaDestino(
      data.subcarpetaNormaId,
      data.carpetaInternaId,
    );

    const cloudUrl = await this.storage.uploadDocument(file, 'pendientes');
    let gacetaCloudUrl: string | null = null;
    if (gacetaFile) {
      gacetaCloudUrl = await this.storage.uploadDocument(gacetaFile, 'pendientes');
    }

    const nuevaLey = await this.prisma.client.documento.create({
      data: {
        titulo: data.titulo,
        tituloIntegro: data.tituloIntegro,
        archivoOriginalUrl: cloudUrl,
        gacetaPdfUrl: gacetaCloudUrl,
        estado: EstadoDocumento.PENDIENTE_REVISION,
        soloLecturaImagen: data.soloLecturaImagen ?? false,
        ocrHabilitado: data.ocrHabilitado ?? false,
        nombreBreve: data.nombreBreve,
        temaPrincipal: destino.temaPrincipal,
        tipoNorma: destino.tipoNorma,
        subcarpetaNormaId: destino.subcarpetaNormaId,
        carpetaInternaId: destino.carpetaInternaId,
        enteEmisor: data.enteEmisor,
        fechaPublicacion: data.fechaPublicacion,
        numeroGaceta: data.numeroGaceta,
        resumen: data.resumen,
        palabrasClave: data.palabrasClave ?? [],
        pais: data.pais,
        metadatos: (data.metadatos as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        jerarquiaSuperiorId: data.jerarquiaSuperiorId,
        documentoRelacionadoId: data.documentoRelacionadoId,
        esReforma: true,
        reformaAId: leyViejaId,
        curadorId,
        revisorAsignadoId: leyVieja.revisorAsignadoId,
        categorias: {
          connect: data.categoriaIds?.length
            ? data.categoriaIds.map(id => ({ id }))
            : leyVieja.categorias.map(c => ({ id: c.id })),
        },
        matrizAId: data.matrizAId ?? leyVieja.matrizAId,
      },
    });

    const estadoAnterior = leyVieja.estadoLegal;
    await this.prisma.client.documento.update({
      where: { id: leyViejaId },
      data: { estadoLegal: EstadoLegal.REFORMADA },
    });
    this.emitEstadoLegalCambio(leyViejaId, estadoAnterior, EstadoLegal.REFORMADA);

    return {
      message: 'Reforma registrada exitosamente',
      documentoId: nuevaLey.id,
      documento: nuevaLey,
    };
  }

  async procesarCargaBorrador(
    file: Express.Multer.File | undefined,
    gacetaFile: Express.Multer.File | undefined,
    data: UploadBorradorDto,
    curadorId: string,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo principal (file) es requerido');
    }

    if (data.enteEmisor && data.fechaPublicacion) {
      await this.validarDuplicidad.validar(
        data.tituloIntegro,
        data.enteEmisor,
        data.fechaPublicacion,
      );
    }

    if (data.categoriaIds?.length) {
      await this.categoriasService.validarIdsAprobadas(data.categoriaIds);
    }

    let temaNombre: string | null = null;
    let normaNombre: string | null = null;

    if (data.subcarpetaNormaId) {
      const destino = await this.resolverCarpetaDestino(
        data.subcarpetaNormaId,
        data.carpetaInternaId,
      );
      temaNombre = destino.temaPrincipal;
      normaNombre = destino.tipoNorma;
    }

    if (temaNombre) {
      await this.especialidad.assertCuradorPuedeSubirTema(curadorId, temaNombre);
    }

    const cloudUrl = await this.storage.uploadDocument(file, 'borradores');
    let gacetaCloudUrl: string | null = null;
    if (gacetaFile) {
      gacetaCloudUrl = await this.storage.uploadDocument(gacetaFile, 'borradores');
    }

    const nuevoDoc = await this.prisma.client.documento.create({
      data: {
        titulo: data.titulo,
        tituloIntegro: data.tituloIntegro,
        archivoOriginalUrl: cloudUrl,
        gacetaPdfUrl: gacetaCloudUrl,
        estado: EstadoDocumento.BORRADOR,
        soloLecturaImagen: data.soloLecturaImagen ?? false,
        ocrHabilitado: data.ocrHabilitado ?? false,
        nombreBreve: data.nombreBreve,
        temaPrincipal: temaNombre,
        tipoNorma: normaNombre,
        subcarpetaNormaId: data.subcarpetaNormaId ?? null,
        carpetaInternaId: data.carpetaInternaId ?? null,
        enteEmisor: data.enteEmisor,
        fechaPublicacion: data.fechaPublicacion,
        numeroGaceta: data.numeroGaceta,
        resumen: data.resumen,
        etiquetas: data.etiquetas ?? [],
        palabrasClave: data.palabrasClave ?? [],
        pais: data.pais,
        metadatos: (data.metadatos as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        jerarquiaSuperiorId: data.jerarquiaSuperiorId,
        documentoRelacionadoId: data.documentoRelacionadoId,
        curadorId,
        ...(data.categoriaIds?.length
          ? { categorias: { connect: data.categoriaIds.map(id => ({ id })) } }
          : {}),
        ...(data.matrizAId ? { matrizAId: data.matrizAId } : {}),
        ...(data.matrizBIds?.length
          ? { matrizB: { connect: data.matrizBIds.map(id => ({ id })) } }
          : {}),
      },
    });

    return {
      message: 'Borrador guardado exitosamente',
      documentoId: nuevoDoc.id,
      documento: nuevoDoc,
    };
  }

  async publicarBorrador(documentoId: string, data: PublicarBorradorDto, curadorId: string) {
    const documento = await this.findOne(documentoId);

    if (documento.curadorId !== curadorId) {
      throw new Error('No tienes permisos para publicar este borrador');
    }
    if (documento.estado !== EstadoDocumento.BORRADOR) {
      throw new Error('El documento no está en estado BORRADOR');
    }

    await this.categoriasService.validarIdsAprobadas(data.categoriaIds);

    const destino = await this.resolverCarpetaDestino(
      data.subcarpetaNormaId,
      data.carpetaInternaId,
    );
    await this.especialidad.assertCuradorPuedeSubirTema(curadorId, destino.temaPrincipal);

    // Mover de la carpeta 'borradores' a la carpeta 'pendientes'
    const newCloudUrl = await this.storage.moveFile(documento.archivoOriginalUrl, 'pendientes');
    let newGacetaUrl = documento.gacetaPdfUrl;
    if (documento.gacetaPdfUrl) {
      newGacetaUrl = await this.storage.moveFile(documento.gacetaPdfUrl, 'pendientes');
    }

    const revisorAsignadoId = await this.asignacionRevisor.asignarPorTema(destino.temaPrincipal);

    const updatedDoc = await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        estado: EstadoDocumento.PENDIENTE_REVISION,
        temaPrincipal: destino.temaPrincipal,
        tipoNorma: destino.tipoNorma,
        subcarpetaNormaId: destino.subcarpetaNormaId,
        carpetaInternaId: destino.carpetaInternaId,
        archivoOriginalUrl: newCloudUrl,
        gacetaPdfUrl: newGacetaUrl,
        revisorAsignadoId,
        categorias: { connect: data.categoriaIds.map(id => ({ id })) },
      },
      include: { categorias: true, revisorAsignado: true },
    });

    this.emitEstadoCambio(
      documentoId,
      EstadoDocumento.BORRADOR,
      EstadoDocumento.PENDIENTE_REVISION,
    );

    return {
      message: 'Borrador publicado exitosamente',
      documentoId: updatedDoc.id,
      documento: updatedDoc,
    };
  }

  async findAll() {
    const docs = await this.prisma.client.documento.findMany({
      where: { eliminado: false },
      orderBy: { ultimaActualizacion: 'desc' },
      include: { categorias: true, revisorAsignado: true, metadata: true },
    });
    return docs.map(doc => this.mapDocumentoResponse(doc));
  }

  async findAdminList(query: AdminDocumentosQueryDto) {
    const where: Prisma.DocumentoWhereInput = {
      eliminado: false,
    };

    if (query.curadorId) {
      where.curadorId = query.curadorId;
    }

    if (query.conNotas) {
      where.notasInternas = { some: {} };
    }

    const docs = await this.prisma.client.documento.findMany({
      where,
      orderBy: { ultimaActualizacion: 'desc' },
      include: {
        curador: { select: { id: true, email: true, nombre: true, apellido: true } },
        _count: { select: { notasInternas: true } },
        notasInternas: {
          orderBy: { fecha: 'desc' },
          take: 1, // Only return the latest note as a preview
          include: { autor: { select: { id: true, nombre: true, role: true } } },
        },
        metadata: true,
      },
    });
    return docs.map(doc => this.mapDocumentoResponse(doc));
  }

  async findCuradorConNotas(curadorId: string) {
    const docs = await this.prisma.client.documento.findMany({
      where: {
        eliminado: false,
        curadorId,
        notasInternas: { some: {} },
      },
      orderBy: { ultimaActualizacion: 'desc' },
      include: {
        _count: { select: { notasInternas: true } },
        notasInternas: {
          orderBy: { fecha: 'desc' },
          include: { autor: { select: { id: true, nombre: true, role: true } } },
        },
        metadata: true,
      },
    });
    return docs.map(doc => this.mapDocumentoResponse(doc));
  }

  async findCuradorList(curadorId: string, query: CuradorDocumentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentoWhereInput = {
      eliminado: false,
      curadorId,
    };

    if (query.busqueda) {
      where.titulo = { contains: query.busqueda, mode: 'insensitive' };
    }

    if (query.estado) {
      switch (query.estado) {
        case CuradorFiltroEstado.PUBLICADOS:
          where.estado = EstadoDocumento.PUBLICADO;
          break;
        case CuradorFiltroEstado.EN_REVISION:
          where.estado = EstadoDocumento.PENDIENTE_REVISION;
          break;
        case CuradorFiltroEstado.BORRADORES:
          where.estado = EstadoDocumento.BORRADOR;
          break;
        case CuradorFiltroEstado.RECHAZADOS:
          where.estado = EstadoDocumento.RECHAZADO;
          break;
        case CuradorFiltroEstado.TODOS:
        default:
          break;
      }
    }

    if (query.tiempo) {
      const dateLimit = new Date();
      if (query.tiempo === CuradorFiltroTiempo.SIETE_DIAS) {
        dateLimit.setDate(dateLimit.getDate() - 7);
      } else if (query.tiempo === CuradorFiltroTiempo.TREINTA_DIAS) {
        dateLimit.setDate(dateLimit.getDate() - 30);
      } else if (query.tiempo === CuradorFiltroTiempo.TRES_MESES) {
        dateLimit.setMonth(dateLimit.getMonth() - 3);
      }
      where.createdAt = { gte: dateLimit };
    }

    const [items, total] = await Promise.all([
      this.prisma.client.documento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ultimaActualizacion: 'desc' },
        include: {
          categorias: { select: { id: true, nombre: true } },
          revisorAsignado: { select: { id: true, nombre: true, apellido: true } },
          metadata: true,
        },
      }),
      this.prisma.client.documento.count({ where }),
    ]);

    return { items: items.map(doc => this.mapDocumentoResponse(doc)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPublic(query: PublicQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentoWhereInput = {
      eliminado: false,
      estado: EstadoDocumento.PUBLICADO,
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
        include: { categorias: true, metadata: true },
      }),
      this.prisma.client.documento.count({ where }),
    ]);

    return { items: items.map(doc => this.mapDocumentoResponse(doc)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSeoByNombreBreve(nombreBreve: string) {
    const documento = await this.prisma.client.documento.findFirst({
      where: {
        nombreBreve,
        eliminado: false,
        estado: EstadoDocumento.PUBLICADO,
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
        metadata: true,
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado o fue eliminado.`);
    }

    return this.mapDocumentoResponse(documento);
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

  async update(
    id: string,
    updateData: UpdateDocumentoDto,
    file?: Express.Multer.File,
    gacetaFile?: Express.Multer.File,
  ) {
    const documento = await this.findOne(id);

    let cloudUrl = documento.archivoOriginalUrl;
    let gacetaCloudUrl = documento.gacetaPdfUrl;

    if (file) {
      cloudUrl = await this.storage.uploadDocument(
        file,
        documento.estado === EstadoDocumento.BORRADOR ? 'borradores' : 'pendientes',
      );
    }

    if (gacetaFile) {
      gacetaCloudUrl = await this.storage.uploadDocument(
        gacetaFile,
        documento.estado === EstadoDocumento.BORRADOR ? 'borradores' : 'pendientes',
      );
    }

    const {
      categoriaIds,
      matrizAId,
      matrizBIds,
      subcarpetaNormaId,
      carpetaInternaId,
      metadatos,
      ...simpleData
    } = updateData;

    const data: Prisma.DocumentoUpdateInput = {
      ...simpleData,
      archivoOriginalUrl: cloudUrl,
      gacetaPdfUrl: gacetaCloudUrl,
    };

    if (metadatos !== undefined) {
      data.metadatos = metadatos === null ? Prisma.JsonNull : (metadatos as Prisma.InputJsonValue);
    }

    if (subcarpetaNormaId) {
      const destino = await this.resolverCarpetaDestino(subcarpetaNormaId, carpetaInternaId);
      data.temaPrincipal = destino.temaPrincipal;
      data.tipoNorma = destino.tipoNorma;
      data.subcarpetaNorma = destino.subcarpetaNormaId
        ? { connect: { id: destino.subcarpetaNormaId } }
        : { disconnect: true };
      data.carpetaInterna = destino.carpetaInternaId
        ? { connect: { id: destino.carpetaInternaId } }
        : { disconnect: true };
    }

    if (updateData.estadoLegal !== undefined) {
      data.estadoLegal = updateData.estadoLegal;
    }

    // MatrizA: connect si se envía ID, disconnect si se envía null/string vacío
    if (matrizAId !== undefined) {
      data.matrizA = matrizAId ? { connect: { id: matrizAId } } : { disconnect: true };
    }

    if (categoriaIds?.length) {
      await this.categoriasService.validarIdsAprobadas(categoriaIds);
      data.categorias = { set: categoriaIds.map(cid => ({ id: cid })) };
    }

    // MatrizB: set reemplaza todas las relaciones actuales
    if (matrizBIds !== undefined) {
      data.matrizB = { set: matrizBIds.map(id => ({ id })) };
    }

    const updatedDoc = await this.prisma.client.documento.update({
      where: { id },
      data,
      include: { categorias: true, matrizA: true, matrizB: true },
    });

    if (documento.estado === EstadoDocumento.RECHAZADO) {
      await this.cambiarEstado(id, EstadoDocumento.PENDIENTE_REVISION);
      updatedDoc.estado = EstadoDocumento.PENDIENTE_REVISION;
    }

    if (updateData.estadoLegal !== undefined && documento.estadoLegal !== updateData.estadoLegal) {
      this.emitEstadoLegalCambio(id, documento.estadoLegal, updateData.estadoLegal);
    }

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

  async hardDelete(id: string) {
    const documento = await this.prisma.client.documento.findUnique({
      where: { id },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado.`);
    }

    if (documento.archivoOriginalUrl) {
      await this.storage.deleteFile(documento.archivoOriginalUrl);
    }

    if (documento.gacetaPdfUrl) {
      await this.storage.deleteFile(documento.gacetaPdfUrl);
    }

    await this.prisma.client.$transaction([
      this.prisma.client.auditLog.updateMany({
        where: { documentoId: id },
        data: { documentoId: null },
      }),
      this.prisma.client.documento.updateMany({
        where: { reformaAId: id },
        data: { reformaAId: null },
      }),
      this.prisma.client.documento.updateMany({
        where: { jerarquiaSuperiorId: id },
        data: { jerarquiaSuperiorId: null },
      }),
      this.prisma.client.documento.updateMany({
        where: { documentoRelacionadoId: id },
        data: { documentoRelacionadoId: null },
      }),
      this.prisma.client.documento.delete({
        where: { id },
      }),
    ]);

    return { message: 'Documento eliminado físicamente (hard delete) exitosamente' };
  }

  async cambiarEstado(id: string, nuevoEstado: EstadoDocumento) {
    const documento = await this.findOne(id);

    // Si se pasa a pendiente revisión y el original estaba en borrador, mover archivos
    if (
      nuevoEstado === EstadoDocumento.PENDIENTE_REVISION &&
      documento.estado === EstadoDocumento.BORRADOR
    ) {
      const newCloudUrl = await this.storage.moveFile(documento.archivoOriginalUrl, 'pendientes');
      let newGacetaUrl: string | null = documento.gacetaPdfUrl;
      if (documento.gacetaPdfUrl) {
        newGacetaUrl = await this.storage.moveFile(documento.gacetaPdfUrl, 'pendientes');
      }

      await this.prisma.client.documento.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          archivoOriginalUrl: newCloudUrl,
          gacetaPdfUrl: newGacetaUrl,
        },
      });
      this.emitEstadoCambio(id, documento.estado, nuevoEstado);
      return;
    }

    const updated = await this.prisma.client.documento.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
    this.emitEstadoCambio(id, documento.estado, nuevoEstado);
    return updated;
  }
}
