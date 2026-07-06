import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { Role, User, PrismaClient } from '.prisma/client';

@Injectable()
export class AuthService {
  private readonly prismaClient: PrismaClient;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {
    this.prismaClient = prisma.client;
  }

  private generateAuthTokens(userId: string, email: string, role: string, tokenVersion: number) {
    const payload = {
      sub: userId,
      email,
      role,
      tv: tokenVersion,
    };

    const access_token = this.jwtService.sign(payload);

    // Refresh token uses a separate secret and longer expiration
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
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

    // 4. Login normal: generar JWT de acceso completo y refresh token
    const tokens = this.generateAuthTokens(user.id, user.email, user.role, user.tokenVersion);
    return {
      ...tokens,
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

    // Emitir JWTs de acceso completo directamente (el usuario no tiene que volver a loguearse)
    const tokens = this.generateAuthTokens(
      updated.id,
      updated.email,
      updated.role,
      updated.tokenVersion,
    );

    return {
      message: 'Contraseña actualizada exitosamente',
      ...tokens,
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

  /**
   * Genera un token de reseteo y envía un correo al usuario.
   */
  async forgotPassword(email: string) {
    const user = await this.prismaClient.user.findUnique({
      where: { email },
      select: { id: true, email: true, tokenVersion: true },
    });

    if (!user) {
      // Devolvemos success igual para no revelar si el email existe o no
      return {
        message:
          'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
      };
    }

    // Generar un JWT temporal restringido al reseteo de contraseña
    const payload = {
      sub: user.id,
      email: user.email,
      tv: user.tokenVersion,
      scope: 'password-reset',
    };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });
    let frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    let resetLink: string;

    if (frontendUrl.includes('EL_TOKEN')) {
      resetLink = frontendUrl.replace('EL_TOKEN', token);
    } else {
      frontendUrl = frontendUrl.replace(/\/$/, '');
      resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;
    }

    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    return {
      message:
        'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  /**
   * Verifica el token de reseteo y actualiza la contraseña.
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        tv: number;
        scope: string;
      }>(token);

      if (payload.scope !== 'password-reset') {
        throw new BadRequestException('Token inválido para esta operación');
      }

      const user = await this.prismaClient.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (user.tokenVersion !== payload.tv) {
        throw new BadRequestException('El token ha expirado o ya fue utilizado');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prismaClient.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 }, // Invalidamos el token usado y sesiones activas
          requirePasswordChange: false, // Por si acaso estaba forzado
        },
      });

      return { message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Token inválido o expirado');
    }
  }

  /**
   * Valida el Refresh Token y emite un nuevo par de tokens.
   */
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        tv: number;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prismaClient.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, tokenVersion: true },
      });

      // Si el tokenVersion de la BD no coincide con el del token, la sesión fue revocada
      if (!user || user.tokenVersion !== payload.tv) {
        throw new UnauthorizedException('Refresh token revocado o inválido');
      }

      return this.generateAuthTokens(user.id, user.email, user.role, user.tokenVersion);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
}
