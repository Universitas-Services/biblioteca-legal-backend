import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoDocumento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchmakerService } from '../matrices/matchmaker.service';
import { DocumentosService } from '../documentos/documentos.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private prisma: PrismaService,
    private matchmaker: MatchmakerService,
    private documentosService: DocumentosService,
  ) {}

  async getBandeja(revisorId: string) {
    return this.prisma.client.documento.findMany({
      where: {
        revisorAsignadoId: revisorId,
        estado: EstadoDocumento.PENDIENTE_REVISION,
        eliminado: false,
      },
      orderBy: { createdAt: 'asc' },
      include: { categorias: true, curador: true },
    });
  }

  async publicar(documentoId: string) {
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
