import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, User, PrismaClient } from '.prisma/client';

@Injectable()
export class AuthService {
  private readonly prismaClient: PrismaClient;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.prismaClient = prisma.client;
  }

  async register(email: string, pass: string) {
    // 1. Verificamos si el usuario ya existe
    const userExists = await this.prismaClient.user.findUnique({
      where: { email },
    });
    if (userExists) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 2. Encriptamos la contraseña
    const hashedPassword = await bcrypt.hash(pass, 10);

    // 3. Guardamos en base de datos
    const user: User = await this.prismaClient.user.create({
      data: {
        email,
        password: hashedPassword,
        role: Role.CLIENTE,
      },
    });

    // Retornamos sin exponer la contraseña
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, pass: string) {
    // 1. Buscamos al usuario
    const user = await this.prismaClient.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        tokenVersion: true,
        requirePasswordChange: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comparamos las contraseñas
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Si el usuario tiene contraseña temporal, emitir token restringido
    if (user.requirePasswordChange) {
      const restrictedPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tv: user.tokenVersion,
        scope: 'change-password',
      };
      return {
        access_token: this.jwtService.sign(restrictedPayload, { expiresIn: '30m' }),
        mustChangePassword: true,
      };
    }

    // 4. Login normal: generar JWT de acceso completo
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
    };
    return {
      access_token: this.jwtService.sign(payload),
      mustChangePassword: false,
    };
  }

  /**
   * Permite a un usuario cambiar su contraseña temporal.
   * Accesible tanto con token restringido (scope: 'change-password')
   * como con token normal (para cambios voluntarios futuros).
   * Devuelve un nuevo JWT de acceso completo tras el cambio exitoso.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, password: true, tokenVersion: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que la contraseña actual (temporal) sea correcta
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Evitar reusar la misma contraseña
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la actual');
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña, quitar flag y rotar tokenVersion para invalidar el token restringido
    const updated = await this.prismaClient.user.update({
      where: { id: userId },
      data: {
        password: hashedNew,
        requirePasswordChange: false,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    // Emitir un JWT de acceso completo directamente (el usuario no tiene que volver a loguearse)
    const payload = {
      sub: updated.id,
      email: updated.email,
      role: updated.role,
      tv: updated.tokenVersion,
    };

    return {
      message: 'Contraseña actualizada exitosamente',
      access_token: this.jwtService.sign(payload),
    };
  }

  /** Cierra la sesión del usuario autenticado (invalida todos sus tokens). */
  async logout(userId: string) {
    return this.invalidateUserTokens(userId);
  }

  /** Admin: cierra la sesión de cualquier usuario. */
  async logoutUser(targetUserId: string) {
    const user = await this.prismaClient.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.invalidateUserTokens(targetUserId);
  }

  private async invalidateUserTokens(userId: string) {
    const user = await this.prismaClient.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    return {
      message: 'Sesión finalizada correctamente',
      userId: user.id,
    };
  }
}
