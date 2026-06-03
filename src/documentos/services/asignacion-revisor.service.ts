import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TEMA_ESPECIALIDAD_GENERAL_SLUG } from '../../common/constants/tema-especialidad.constants';

@Injectable()
export class AsignacionRevisorService {
  constructor(private prisma: PrismaService) {}

  /**
   * 1) Revisor con especialidad que coincide con el tema del documento.
   * 2) Revisor con especialidad "General" (cualquier tema).
   */
  async asignarPorTema(temaPrincipal: string): Promise<string | null> {
    const porTemaEspecifico = await this.prisma.client.user.findFirst({
      where: {
        role: Role.REVISOR,
        temasAsignados: {
          some: {
            nombre: temaPrincipal,
            slug: { not: TEMA_ESPECIALIDAD_GENERAL_SLUG },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (porTemaEspecifico) return porTemaEspecifico.id;

    const porGeneral = await this.prisma.client.user.findFirst({
      where: {
        role: Role.REVISOR,
        temasAsignados: { some: { slug: TEMA_ESPECIALIDAD_GENERAL_SLUG } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return porGeneral?.id ?? null;
  }
}
