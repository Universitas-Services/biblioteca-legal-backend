import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // <-- Importar
import { CreateMatrizADto } from './dto/create-matriz-a.dto';
import { CreateMatrizBDto } from './dto/create-matriz-b.dto';
import { UpdateMatrizADto } from './dto/update-matriz.dto';
import { UpdateMatrizBDto } from './dto/update-matriz-b.dto';

@Injectable()
export class MatricesService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService, // <-- Inyectar
  ) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Matriz A — Catálogo de Productos y Formación
  // ──────────────────────────────────────────────────────────────────────────────

  async createA(dto: CreateMatrizADto, file: Express.Multer.File) {
    // 1. Subir a Cloudinary en una carpeta específica del negocio
    const cloudinaryResult = await this.cloudinaryService.uploadImage(
      file,
      'universitas/matrices-a',
    );

    // 2. Guardar todo en la BD
    return this.prisma.client.matrizA.create({
      data: {
        nombreProducto: dto.nombreProducto,
        tipoSolucion: dto.tipoSolucion,
        urlDestino: dto.urlDestino,
        categoriasKeywords: dto.categoriasKeywords ?? [],
        activo:
          dto.activo === undefined ? true : (dto.activo as any) === 'true' || dto.activo === true, // parse multipart boolean
        imagenBannerUrl: cloudinaryResult.secure_url,
        imagenBannerPublicId: cloudinaryResult.public_id,
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

  async updateA(id: string, dto: UpdateMatrizADto, file?: Express.Multer.File) {
    // Buscar el registro actual para obtener el public_id de la imagen
    const currentMatriz = await this.prisma.client.matrizA.findUnique({ where: { id } });
    if (!currentMatriz) throw new NotFoundException('Producto de Matriz A no encontrado');

    const dataToUpdate: Prisma.MatrizAUpdateInput = {
      nombreProducto: dto.nombreProducto,
      tipoSolucion: dto.tipoSolucion,
      urlDestino: dto.urlDestino,
      categoriasKeywords: dto.categoriasKeywords,
    };

    // Formatear booleano si viene como string desde form-data
    if (dto.activo !== undefined) {
      dataToUpdate.activo = (dto.activo as unknown) === 'true' || dto.activo === true;
    }

    // Si el Admin subió una nueva imagen en el PATCH
    if (file) {
      // 1. Subir la nueva imagen a Cloudinary
      const cloudinaryResult = await this.cloudinaryService.uploadImage(
        file,
        'universitas/matrices-a',
      );
      dataToUpdate.imagenBannerUrl = cloudinaryResult.secure_url;
      dataToUpdate.imagenBannerPublicId = cloudinaryResult.public_id;

      // 2. Borrar la imagen vieja de Cloudinary para liberar espacio
      if (currentMatriz.imagenBannerPublicId) {
        await this.cloudinaryService.deleteImage(currentMatriz.imagenBannerPublicId);
      }
    }

    return this.prisma.client.matrizA.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async deleteA(id: string) {
    const currentMatriz = await this.prisma.client.matrizA.findUnique({ where: { id } });
    if (!currentMatriz) throw new NotFoundException('Producto de Matriz A no encontrado');

    // Si el registro tiene imagen, la borramos primero de la nube
    if (currentMatriz.imagenBannerPublicId) {
      await this.cloudinaryService.deleteImage(currentMatriz.imagenBannerPublicId);
    }

    // Finalmente eliminamos el registro de la BD
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
