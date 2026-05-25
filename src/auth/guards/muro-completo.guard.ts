import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';

@Injectable()
export class MuroCompletoGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtPayloadUser }>();
    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user || user.nivelMuro < 2) {
      throw new ForbiddenException(
        'Debe completar el muro de datos (nivel 2) para acceder al visor de documentos.',
      );
    }

    return true;
  }
}
