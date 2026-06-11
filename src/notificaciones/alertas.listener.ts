import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstadoLegal, TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DOCUMENTO_ESTADO_LEGAL_CAMBIADO,
  DocumentoEstadoLegalCambiadoEvent,
} from '../common/events/documento-estado-legal.event';

@Injectable()
export class AlertasListener {
  constructor(private prisma: PrismaService) {}

  @OnEvent(DOCUMENTO_ESTADO_LEGAL_CAMBIADO)
  async handleEstadoLegalCambiado(event: DocumentoEstadoLegalCambiadoEvent) {
    const estadosAlerta: EstadoLegal[] = [EstadoLegal.REFORMADA, EstadoLegal.DEROGADA];

    if (!estadosAlerta.includes(event.estadoNuevo)) {
      return;
    }

    const tipo =
      event.estadoNuevo === EstadoLegal.REFORMADA
        ? TipoNotificacion.REFORMADA
        : TipoNotificacion.DEROGADA;

    const favoritos = await this.prisma.client.favorito.findMany({
      where: { documentoId: event.documentoId },
    });

    const documento = await this.prisma.client.documento.findUnique({
      where: { id: event.documentoId },
      select: { titulo: true },
    });

    const mensaje = `El documento "${documento?.titulo ?? event.documentoId}" cambió a estado legal ${event.estadoNuevo}`;

    await Promise.all(
      favoritos.map(f =>
        this.prisma.client.notificacion.create({
          data: {
            userId: f.userId,
            documentoId: event.documentoId,
            tipo,
            mensaje,
          },
        }),
      ),
    );
  }
}
