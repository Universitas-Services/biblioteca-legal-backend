import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDocumento, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListUsuariosAdminQueryDto } from './dto/list-usuarios-admin-query.dto';
import { TemasPersonalQueryDto } from './dto/temas-personal-query.dto';
import { PerfilNivel1Dto } from './dto/perfil-nivel1.dto';
import { PerfilNivel2Dto } from './dto/perfil-nivel2.dto';
import { PROFESION_TEMA_MAP } from '../common/constants/profesion-tema.map';
import { EspecialidadService } from '../common/especialidad/especialidad.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private especialidad: EspecialidadService,
  ) {}

  async listarEspecialidadesDisponibles() {
    return this.especialidad.listarEspecialidadesDisponibles();
  }

  /** Resumen de personal asignado por tema (sin contraseñas). */
  private readonly staffResumenSelect = {
    id: true,
    email: true,
    nombre: true,
    apellido: true,
    role: true,
  } as const;

  private static readonly ROLES_USUARIOS_ADMIN = [
    Role.CURADOR,
    Role.REVISOR,
    Role.AUDITOR,
    Role.ADMIN,
  ] as const;

  private static readonly ROLES_CON_TEMAS = [Role.CURADOR, Role.REVISOR] as const;

  async listarUsuariosAdmin(query: ListUsuariosAdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      role: query.role ?? { in: [...UsersService.ROLES_USUARIOS_ADMIN] },
    };

    const [usuarios, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { nombre: 'asc' }, { apellido: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          role: true,
          temasAsignados: {
            where: { eliminado: false },
            select: { id: true, nombre: true, slug: true },
            orderBy: { nombre: 'asc' },
          },
        },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    const items = usuarios.map(u => this.mapUsuarioAdminItem(u));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapUsuarioAdminItem(user: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    email: string;
    role: Role;
    temasAsignados: { id: string; nombre: string; slug: string }[];
  }) {
    const incluyeTemas = (UsersService.ROLES_CON_TEMAS as readonly Role[]).includes(user.role);

    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.email,
      rol: user.role,
      temasPrincipales: incluyeTemas ? user.temasAsignados : null,
    };
  }

  async listarTemasConPersonal(query: TemasPersonalQueryDto) {
    await this.especialidad.ensureTemaGeneralEnCatalogo();

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [temas, total] = await Promise.all([
      this.prisma.client.temaPrincipal.findMany({
        where: { eliminado: false },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
        include: {
          revisores: {
            where: { role: { in: [Role.CURADOR, Role.REVISOR] } },
            select: this.staffResumenSelect,
            orderBy: [{ role: 'asc' }, { apellido: 'asc' }, { nombre: 'asc' }],
          },
        },
      }),
      this.prisma.client.temaPrincipal.count({ where: { eliminado: false } }),
    ]);

    const items = temas.map(tema => {
      const curadores = tema.revisores.filter(u => u.role === Role.CURADOR);
      const revisores = tema.revisores.filter(u => u.role === Role.REVISOR);
      return {
        id: tema.id,
        nombre: tema.nombre,
        slug: tema.slug,
        gcsUri: tema.gcsUri,
        curadores,
        revisores,
        totalCuradores: curadores.length,
        totalRevisores: revisores.length,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createStaffUser(createStaffDto: CreateStaffDto) {
    const { email, password, role, nombre, apellido, temaIds } = createStaffDto;

    await this.especialidad.ensureTemaGeneralEnCatalogo();
    this.especialidad.assertStaffTieneEspecialidades(role, temaIds);

    const userExists = await this.prisma.client.user.findUnique({ where: { email } });
    if (userExists) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Validar que cada temaId exista en la BD
    if (temaIds && temaIds.length > 0) {
      const temasExistentes = await this.prisma.client.temaPrincipal.findMany({
        where: { id: { in: temaIds }, eliminado: false },
        select: { id: true },
      });
      if (temasExistentes.length !== temaIds.length) {
        const encontrados = temasExistentes.map(t => t.id);
        const invalidos = temaIds.filter(id => !encontrados.includes(id));
        throw new NotFoundException(`Los siguientes temaIds no existen: ${invalidos.join(', ')}`);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.client.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        nombre,
        apellido,
        ...(temaIds && temaIds.length > 0
          ? { temasAsignados: { connect: temaIds.map(id => ({ id })) } }
          : {}),
      },
      include: { temasAsignados: { select: { id: true, nombre: true, slug: true } } },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nombre: user.nombre,
      apellido: user.apellido,
      temasAsignados: user.temasAsignados,
    };
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
