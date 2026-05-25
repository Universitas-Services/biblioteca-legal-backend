import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ValidarDuplicidadService {
  constructor(private prisma: PrismaService) {}

  async validar(tituloIntegro: string, enteEmisor: string, fechaPublicacion: string) {
    const colision = await this.prisma.client.documento.findFirst({
      where: {
        tituloIntegro,
        enteEmisor,
        fechaPublicacion,
        eliminado: false,
      },
    });

    if (colision) {
      throw new ConflictException(
        'Ya existe un documento con el mismo título íntegro, ente emisor y fecha de publicación.',
      );
    }
  }
}
