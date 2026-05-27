import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AsignacionRevisorService {
  constructor(private prisma: PrismaService) {}

  async asignarPorTema(temaPrincipal: string): Promise<string | null> {
    const revisor = await this.prisma.client.user.findFirst({
      where: {
        role: Role.REVISOR,
        temasAsignados: { some: { nombre: temaPrincipal } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return revisor?.id ?? null;
  }
}
