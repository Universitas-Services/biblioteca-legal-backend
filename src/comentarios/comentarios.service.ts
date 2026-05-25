import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';

@Injectable()
export class ComentariosService {
  constructor(private prisma: PrismaService) {}

  async create(autorId: string, dto: CreateComentarioDto) {
    const doc = await this.prisma.client.documento.findUnique({
      where: { id: dto.documentoId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    return this.prisma.client.comentarioInterno.create({
      data: {
        texto: dto.texto,
        autorId,
        documentoId: dto.documentoId,
      },
      include: { autor: { select: { id: true, email: true, role: true } } },
    });
  }

  findByDocumento(documentoId: string) {
    return this.prisma.client.comentarioInterno.findMany({
      where: { documentoId },
      orderBy: { fecha: 'desc' },
      include: { autor: { select: { id: true, email: true, role: true } } },
    });
  }

  async remove(id: string) {
    const comentario = await this.prisma.client.comentarioInterno.findUnique({
      where: { id },
    });
    if (!comentario) throw new NotFoundException('Comentario no encontrado');
    return this.prisma.client.comentarioInterno.delete({ where: { id } });
  }
}
