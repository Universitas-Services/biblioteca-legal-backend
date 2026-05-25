import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatrizADto } from './dto/create-matriz-a.dto';
import { CreateMatrizBDto } from './dto/create-matriz-b.dto';
import { UpdateMatrizADto } from './dto/update-matriz.dto';
import { UpdateMatrizBDto } from './dto/update-matriz-b.dto';

@Injectable()
export class MatricesService {
  constructor(private prisma: PrismaService) {}

  // Matriz A
  createA(dto: CreateMatrizADto) {
    return this.prisma.client.matrizA.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        palabrasClave: dto.palabrasClave ?? [],
        activo: dto.activo ?? true,
      },
    });
  }

  findAllA() {
    return this.prisma.client.matrizA.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOneA(id: string) {
    const item = await this.prisma.client.matrizA.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Matriz A no encontrada');
    return item;
  }

  updateA(id: string, dto: UpdateMatrizADto) {
    return this.prisma.client.matrizA.update({ where: { id }, data: dto });
  }

  deleteA(id: string) {
    return this.prisma.client.matrizA.delete({ where: { id } });
  }

  // Matriz B
  createB(dto: CreateMatrizBDto) {
    return this.prisma.client.matrizB.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        palabrasClave: dto.palabrasClave ?? [],
        activo: dto.activo ?? true,
        esAgora: dto.esAgora ?? true,
      },
    });
  }

  findAllB() {
    return this.prisma.client.matrizB.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOneB(id: string) {
    const item = await this.prisma.client.matrizB.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Matriz B no encontrada');
    return item;
  }

  updateB(id: string, dto: UpdateMatrizBDto) {
    return this.prisma.client.matrizB.update({ where: { id }, data: dto });
  }

  deleteB(id: string) {
    return this.prisma.client.matrizB.delete({ where: { id } });
  }
}
