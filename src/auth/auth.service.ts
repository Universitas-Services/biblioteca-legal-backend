import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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
    const user = await this.prismaClient.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comparamos las contraseñas
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Generamos el JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
    };
    return {
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
