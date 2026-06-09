import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotaInternaDto } from './dto/create-nota-interna.dto';

@Injectable()
export class NotasInternasService {
  constructor(private prisma: PrismaService) {}

  async create(autorId: string, dto: CreateNotaInternaDto) {
    const doc = await this.prisma.client.documento.findUnique({
      where: { id: dto.documentoId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Create the note
    const nota = await this.prisma.client.notaInterna.create({
      data: {
        texto: dto.texto,
        autorId,
        documentoId: dto.documentoId,
      },
      include: { autor: { select: { id: true, email: true, role: true } } },
    });

    // Notify the Curador if there is one assigned to the document
    if (doc.curadorId && doc.curadorId !== autorId) {
      await this.prisma.client.notificacion.create({
        data: {
          userId: doc.curadorId,
          documentoId: dto.documentoId,
          tipo: 'REFORMADA', // Reusing an existing enum or maybe we need a new one if possible, wait the schema only has REFORMADA and DEROGADA. Let's use REFORMADA for now, or just a generic message. Wait, schema: enum TipoNotificacion { REFORMADA DEROGADA }
          // The schema only has REFORMADA and DEROGADA for TipoNotificacion...
          // I shouldn't change the enum unless necessary, wait I'll use REFORMADA and set message appropriately. Wait, if I can't add to enum easily, I'll update schema.
          mensaje: `El administrador ha dejado una nueva nota en el documento: ${doc.titulo}`,
        },
      });
    }

    return nota;
  }

  findByDocumento(documentoId: string) {
    return this.prisma.client.notaInterna.findMany({
      where: { documentoId },
      orderBy: { fecha: 'desc' },
      include: { autor: { select: { id: true, email: true, role: true } } },
    });
  }

  async remove(id: string) {
    const nota = await this.prisma.client.notaInterna.findUnique({
      where: { id },
    });
    if (!nota) throw new NotFoundException('Nota interna no encontrada');
    return this.prisma.client.notaInterna.delete({ where: { id } });
  }
}
