import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoDocumento, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosService } from '../documentos/documentos.service';
import { EspecialidadService } from '../common/especialidad/especialidad.service';
import { NotasInternasService } from '../notas-internas/notas-internas.service';
import { StorageService } from '../storage/storage.service';
import { PublicarDocumentoDto } from './dto/publicar-documento.dto';
import { RechazarDocumentoDto } from './dto/rechazar-documento.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private documentosService: DocumentosService,
    private especialidad: EspecialidadService,
    private notasInternasService: NotasInternasService,
    private storageService: StorageService,
  ) {}

  async getBandeja(revisorId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: revisorId },
      select: { role: true },
    });

    const esAdmin = user?.role === Role.ADMIN;
    const accesoGeneral = esAdmin || (await this.especialidad.revisorTieneAccesoGeneral(revisorId));

    const where: Prisma.DocumentoWhereInput = {
      estado: EstadoDocumento.PENDIENTE_REVISION,
      eliminado: false,
      ...(accesoGeneral ? {} : { revisorAsignadoId: revisorId }),
    };

    return this.prisma.client.documento.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        categorias: true,
        curador: true,
        matrizA: true,
        matrizB: true,
      },
    });
  }

  async publicar(documentoId: string, revisorId: string, dto?: PublicarDocumentoDto) {
    await this.especialidad.assertRevisorPuedeGestionarDocumento(revisorId, documentoId);

    const documento = await this.documentosService.findOne(documentoId);

    if (documento.estado !== EstadoDocumento.PENDIENTE_REVISION) {
      throw new NotFoundException('El documento no está pendiente de revisión');
    }

    // Cascada de prioridad: override del revisor > selección del curador
    const matrizAId: string | null =
      dto?.matrizAId !== undefined ? (dto.matrizAId ?? null) : (documento.matrizAId ?? null);

    const matrizBIds: string[] =
      dto?.matrizBIds !== undefined ? dto.matrizBIds : (documento.matrizB?.map(m => m.id) ?? []);

    if (documento.subcarpetaNormaId) {
      const destino = await this.resolverRutaFinalDocumento(
        documento.subcarpetaNormaId,
        documento.carpetaInternaId,
      );
      const nuevaUrl = await this.storageService.moveFile(documento.archivoOriginalUrl, destino);
      await this.prisma.client.documento.update({
        where: { id: documentoId },
        data: { archivoOriginalUrl: nuevaUrl },
      });
    }

    await this.documentosService.cambiarEstado(documentoId, EstadoDocumento.PUBLICADO);

    const updated = await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        ...(matrizAId ? { matrizAId } : { matrizAId: null }),
        matrizB: matrizBIds.length ? { set: matrizBIds.map(id => ({ id })) } : { set: [] },
      },
      include: {
        matrizA: true,
        matrizB: true,
        categorias: true,
        curador: true,
        revisorAsignado: true,
      },
    });

    return {
      message: 'Documento publicado exitosamente',
      documento: updated,
    };
  }

  async rechazar(documentoId: string, revisorId: string, dto: RechazarDocumentoDto) {
    await this.especialidad.assertRevisorPuedeGestionarDocumento(revisorId, documentoId);

    const documento = await this.documentosService.findOne(documentoId);

    if (documento.estado !== EstadoDocumento.PENDIENTE_REVISION) {
      // Usamos NotFound o BadRequest, en este caso NotFound es consistente con otras
      throw new NotFoundException('Solo se pueden rechazar documentos pendientes de revisión');
    }

    // Cambiar estado a RECHAZADO
    await this.documentosService.cambiarEstado(documentoId, EstadoDocumento.RECHAZADO);

    // Crear nota interna con el motivo (esto notificará automáticamente al curador si existe)
    await this.notasInternasService.create(revisorId, {
      documentoId,
      texto: dto.motivo,
    });

    return {
      message: 'Documento rechazado y devuelto al curador con correcciones',
    };
  }

  private async resolverRutaFinalDocumento(
    subcarpetaNormaId: string,
    carpetaInternaId: string | null,
  ): Promise<string> {
    const subcarpeta = await this.prisma.client.subcarpetaNorma.findFirst({
      where: { id: subcarpetaNormaId },
      include: { temaPrincipal: true },
    });

    if (!subcarpeta || !subcarpeta.temaPrincipal) {
      throw new NotFoundException('Subcarpeta o tema principal no encontrados');
    }

    let ruta = `tema-principal/${subcarpeta.temaPrincipal.slug}/${subcarpeta.slug}`;

    if (carpetaInternaId) {
      const slugs = await this.storageService.getCarpetaSlugsChain(carpetaInternaId);
      ruta += `/${slugs.join('/')}`;
    }

    return ruta;
  }
}
