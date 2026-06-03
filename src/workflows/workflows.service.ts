import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoDocumento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerService } from '../matrices/matchmaker.service';
import { DocumentosService } from '../documentos/documentos.service';
import { EspecialidadService } from '../common/especialidad/especialidad.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private matchmaker: MatchmakerService,
    private documentosService: DocumentosService,
    private especialidad: EspecialidadService,
  ) {}

  async getBandeja(revisorId: string) {
    const accesoGeneral = await this.especialidad.revisorTieneAccesoGeneral(revisorId);

    const where: Prisma.DocumentoWhereInput = {
      estado: EstadoDocumento.PENDIENTE_REVISION,
      eliminado: false,
      ...(accesoGeneral ? {} : { revisorAsignadoId: revisorId }),
    };

    return this.prisma.client.documento.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { categorias: true, curador: true },
    });
  }

  async publicar(documentoId: string, revisorId: string) {
    await this.especialidad.assertRevisorPuedeGestionarDocumento(revisorId, documentoId);

    const documento = await this.documentosService.findOne(documentoId);

    if (documento.estado !== EstadoDocumento.PENDIENTE_REVISION) {
      throw new NotFoundException('El documento no está pendiente de revisión');
    }

    const match = await this.matchmaker.match(documento.palabrasClave ?? []);

    await this.documentosService.cambiarEstado(documentoId, EstadoDocumento.VIGENTE);

    const updated = await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        matrizAId: match.matrizA?.id ?? null,
        matrizB: match.matrizB.length ? { set: match.matrizB.map(m => ({ id: m.id })) } : undefined,
      },
      include: { matrizA: true, matrizB: true, categorias: true },
    });

    return {
      message: 'Documento publicado exitosamente',
      documento: updated,
      recomendaciones: match,
    };
  }
}
