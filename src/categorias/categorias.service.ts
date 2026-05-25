import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCategoria } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SugerirCategoriaDto } from './dto/sugerir-categoria.dto';
import { CreateCategoriaAdminDto } from './dto/create-categoria-admin.dto';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  private async assertNombreDisponible(nombre: string) {
    const existe = await this.prisma.client.categoria.findUnique({
      where: { nombre },
    });
    if (existe) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }

  /** Admin: alta directa como categoría usable en la aplicación (APROBADA). */
  async crearPorAdmin(dto: CreateCategoriaAdminDto) {
    await this.assertNombreDisponible(dto.nombre);

    return this.prisma.client.categoria.create({
      data: {
        nombre: dto.nombre.trim(),
        estado: EstadoCategoria.APROBADA,
      },
    });
  }

  /** Admin: listado completo para gestión (sugeridas y aprobadas). */
  async findAllAdmin() {
    return this.prisma.client.categoria.findMany({
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      include: {
        sugeridoPor: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async sugerir(dto: SugerirCategoriaDto, sugeridoPorId: string) {
    await this.assertNombreDisponible(dto.nombre);

    return this.prisma.client.categoria.create({
      data: {
        nombre: dto.nombre.trim(),
        estado: EstadoCategoria.SUGERIDA,
        sugeridoPorId,
      },
    });
  }

  async aprobar(id: string) {
    const categoria = await this.prisma.client.categoria.findUnique({ where: { id } });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return this.prisma.client.categoria.update({
      where: { id },
      data: { estado: EstadoCategoria.APROBADA },
    });
  }

  async findAprobadas() {
    return this.prisma.client.categoria.findMany({
      where: { estado: EstadoCategoria.APROBADA },
      orderBy: { nombre: 'asc' },
    });
  }

  async validarIdsAprobadas(ids: string[]) {
    if (!ids?.length) {
      throw new ConflictException('Debe incluir al menos una categoría aprobada');
    }
    const categorias = await this.prisma.client.categoria.findMany({
      where: { id: { in: ids }, estado: EstadoCategoria.APROBADA },
    });
    if (categorias.length !== ids.length) {
      throw new ConflictException('Una o más categorías no existen o no están aprobadas');
    }
    return categorias;
  }
}
