import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatrizADto } from './dto/create-matriz-a.dto';
import { CreateMatrizBDto } from './dto/create-matriz-b.dto';
import { UpdateMatrizADto } from './dto/update-matriz.dto';
import { UpdateMatrizBDto } from './dto/update-matriz-b.dto';

@Injectable()
export class MatricesService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Matriz A — Catálogo de Productos y Formación
  // ──────────────────────────────────────────────────────────────────────────────

  createA(dto: CreateMatrizADto) {
    return this.prisma.client.matrizA.create({
      data: {
        nombreProducto: dto.nombreProducto,
        tipoSolucion: dto.tipoSolucion,
        urlDestino: dto.urlDestino,
        categoriasKeywords: dto.categoriasKeywords ?? [],
        activo: dto.activo ?? true,
      },
    });
  }

  /**
   * Devuelve el catálogo de Matriz A aplicando la regla de roles:
   *  - ADMIN: ve el inventario completo (activos e inactivos).
   *  - CURADOR / REVISOR: filtro oculto — solo productos con activo = true.
   */
  findAllA(role: Role) {
    const where = role === Role.ADMIN ? {} : { activo: true };
    return this.prisma.client.matrizA.findMany({
      where,
      orderBy: { nombreProducto: 'asc' },
    });
  }

  async findOneA(id: string) {
    const item = await this.prisma.client.matrizA.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Producto de Matriz A no encontrado');
    return item;
  }

  updateA(id: string, dto: UpdateMatrizADto) {
    return this.prisma.client.matrizA.update({ where: { id }, data: dto });
  }

  deleteA(id: string) {
    return this.prisma.client.matrizA.delete({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Matriz B — Repositorio de Ágora / Lecturas Recomendadas
  // ──────────────────────────────────────────────────────────────────────────────

  createB(dto: CreateMatrizBDto) {
    return this.prisma.client.matrizB.create({
      data: {
        tituloArticulo: dto.tituloArticulo,
        autorArticulo: dto.autorArticulo,
        urlDestinoAgora: dto.urlDestinoAgora,
        categoriasKeywords: dto.categoriasKeywords ?? [],
        activo: dto.activo ?? true,
      },
    });
  }

  findAllB() {
    return this.prisma.client.matrizB.findMany({
      orderBy: { tituloArticulo: 'asc' },
    });
  }

  async findOneB(id: string) {
    const item = await this.prisma.client.matrizB.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Artículo de Matriz B no encontrado');
    return item;
  }

  updateB(id: string, dto: UpdateMatrizBDto) {
    return this.prisma.client.matrizB.update({ where: { id }, data: dto });
  }

  deleteB(id: string) {
    return this.prisma.client.matrizB.delete({ where: { id } });
  }
}
