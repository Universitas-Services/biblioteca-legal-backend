import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { EstadoDocumento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayloadUser;
      params?: { id?: string };
      method?: string;
    }>();

    const userId = request.user?.sub;
    const documentoId = request.params?.id;
    const method = request.method;

    return next.handle().pipe(
      tap(() => {
        void this.registrarAudit(userId, documentoId, method);
      }),
    );
  }

  private async registrarAudit(
    userId: string | undefined,
    documentoId: string | undefined,
    method: string | undefined,
  ) {
    if (!userId || !documentoId) return;

    const documento = await this.prisma.client.documento.findUnique({
      where: { id: documentoId },
    });

    if (!documento || documento.estado !== EstadoDocumento.PUBLICADO) return;

    await this.prisma.client.auditLog.create({
      data: {
        userId,
        documentoId,
        accion: `${method} documento publicado`,
        detalle: `Actualización de metadatos en documento vigente ${documentoId}`,
      },
    });
  }
}
