import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDocumento, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { PerfilNivel1Dto } from './dto/perfil-nivel1.dto';
import { PerfilNivel2Dto } from './dto/perfil-nivel2.dto';
import { PROFESION_TEMA_MAP } from '../common/constants/profesion-tema.map';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createStaffUser(createStaffDto: CreateStaffDto) {
    const { email, password, role, especialidades } = createStaffDto;

    const userExists = await this.prisma.client.user.findUnique({ where: { email } });
    if (userExists) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user: User = await this.prisma.client.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        especialidades: especialidades ?? [],
      },
    });

    return { id: user.id, email: user.email, role: user.role, especialidades: user.especialidades };
  }

  async updatePerfilNivel1(userId: string, dto: PerfilNivel1Dto) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email !== user.email) {
      const emailTaken = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('El correo ya está en uso');
    }

    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
        nivelMuro: Math.max(user.nivelMuro, 1),
      },
    });

    return this.sanitizeUser(updated);
  }

  async updatePerfilNivel2(userId: string, dto: PerfilNivel2Dto) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.nivelMuro < 1) {
      throw new BadRequestException('Debe completar el nivel 1 del muro de datos primero');
    }

    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        telefono: dto.telefono,
        pais: dto.pais,
        profesion: dto.profesion,
        nivelMuro: 2,
      },
    });

    return this.sanitizeUser(updated);
  }

  async addFavorito(userId: string, documentoId: string) {
    const doc = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, eliminado: false },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    return this.prisma.client.favorito.upsert({
      where: { userId_documentoId: { userId, documentoId } },
      create: { userId, documentoId },
      update: {},
    });
  }

  async getDashboardInicio(userId: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const tema = user.profesion != null ? PROFESION_TEMA_MAP[user.profesion] : 'Derecho General';

    const leyesRecientes = await this.prisma.client.documento.findMany({
      where: {
        eliminado: false,
        estado: EstadoDocumento.VIGENTE,
        temaPrincipal: tema,
      },
      orderBy: { ultimaActualizacion: 'desc' },
      take: 3,
      select: {
        id: true,
        titulo: true,
        nombreBreve: true,
        temaPrincipal: true,
        enteEmisor: true,
        fechaPublicacion: true,
        resumen: true,
        ultimaActualizacion: true,
      },
    });

    const favoritos = await this.prisma.client.favorito.findMany({
      where: { userId },
      include: {
        documento: {
          select: {
            id: true,
            titulo: true,
            nombreBreve: true,
            estado: true,
            ultimaActualizacion: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const notificaciones = await this.prisma.client.notificacion.findMany({
      where: { userId, leida: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      profesion: user.profesion,
      temaSector: tema,
      leyesRecientes,
      favoritos: favoritos.map(f => f.documento),
      notificaciones,
    };
  }

  private sanitizeUser(user: User) {
    const { password: _p, ...rest } = user;
    return rest;
  }
}
