import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoAprobacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SugerirEtiquetaDto } from './dto/sugerir-etiqueta.dto';
import { CreateEtiquetaDto } from './dto/create-etiqueta.dto';

@Injectable()
export class EtiquetasService {
  constructor(private prisma: PrismaService) {}

  private async assertNombreDisponible(nombre: string) {
    const existe = await this.prisma.client.etiqueta.findUnique({
      where: { nombre },
    });
    if (existe) {
      throw new ConflictException('Ya existe una etiqueta con ese nombre');
    }
  }

  /** Admin: alta directa como etiqueta usable en la aplicación (APROBADA). */
  async crearPorAdmin(dto: CreateEtiquetaDto) {
    await this.assertNombreDisponible(dto.nombre);

    return this.prisma.client.etiqueta.create({
      data: {
        nombre: dto.nombre.trim(),
        estado: EstadoAprobacion.APROBADA,
      },
    });
  }

  /** Admin: listado completo para gestión (sugeridas, aprobadas, rechazadas). */
  async findAllAdmin() {
    return this.prisma.client.etiqueta.findMany({
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      include: {
        sugeridoPor: { select: { id: true, email: true, role: true } },
      },
    });
  }

  /** Sugerir etiqueta por curador */
  async sugerir(dto: SugerirEtiquetaDto, sugeridoPorId: string) {
    await this.assertNombreDisponible(dto.nombre);

    return this.prisma.client.etiqueta.create({
      data: {
        nombre: dto.nombre.trim(),
        estado: EstadoAprobacion.SUGERIDA,
        sugeridoPorId,
      },
    });
  }

  /** Aprobar etiqueta sugerida */
  async aprobar(id: string) {
    const etiqueta = await this.prisma.client.etiqueta.findUnique({ where: { id } });
    if (!etiqueta) {
      throw new NotFoundException('Etiqueta no encontrada');
    }

    return this.prisma.client.etiqueta.update({
      where: { id },
      data: { estado: EstadoAprobacion.APROBADA },
    });
  }

  /** Rechazar etiqueta sugerida y desvincular de documentos */
  async rechazar(id: string) {
    const etiqueta = await this.prisma.client.etiqueta.findUnique({ where: { id } });
    if (!etiqueta) {
      throw new NotFoundException('Etiqueta no encontrada');
    }

    return this.prisma.client.etiqueta.update({
      where: { id },
      data: {
        estado: EstadoAprobacion.RECHAZADA,
        documentos: {
          set: [], // Desvincula de cualquier documento que la estuviera usando (aunque normalmente no deberia, pero por si acaso)
        },
      },
    });
  }

  /** Listar pendientes */
  async findPendientes() {
    return this.prisma.client.etiqueta.findMany({
      where: { estado: EstadoAprobacion.SUGERIDA },
      include: {
        sugeridoPor: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Público: Listar solo aprobadas */
  async findAprobadas() {
    return this.prisma.client.etiqueta.findMany({
      where: { estado: EstadoAprobacion.APROBADA },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Utilidad: Procesar array de nombres de etiquetas, creando las que no existen como sugeridas, y devolver las etiquetas resultantes (IDs) */
  async procesarEtiquetasPorNombres(nombres: string[], userId: string): Promise<string[]> {
    if (!nombres || nombres.length === 0) return [];

    // Normalizar nombres (trim)
    const nombresNormalizados = [...new Set(nombres.map(n => n.trim()).filter(n => n.length > 0))];
    if (nombresNormalizados.length === 0) return [];

    const etiquetasResultantesIds: string[] = [];

    for (const nombre of nombresNormalizados) {
      let etiqueta = await this.prisma.client.etiqueta.findUnique({
        where: { nombre },
      });

      if (!etiqueta) {
        // No existe, crearla como sugerida
        etiqueta = await this.prisma.client.etiqueta.create({
          data: {
            nombre,
            estado: EstadoAprobacion.SUGERIDA,
            sugeridoPorId: userId,
          },
        });
      }

      etiquetasResultantesIds.push(etiqueta.id);
    }

    return etiquetasResultantesIds;
  }

  /** Admin: Eliminar etiqueta */
  async remove(id: string) {
    const etiqueta = await this.prisma.client.etiqueta.findUnique({ where: { id } });
    if (!etiqueta) throw new NotFoundException('Etiqueta no encontrada');
    return this.prisma.client.etiqueta.delete({ where: { id } });
  }
}
