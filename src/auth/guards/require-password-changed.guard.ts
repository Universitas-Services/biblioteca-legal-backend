import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard que bloquea el acceso si el JWT presentado es un token restringido
 * de tipo "change-password". Solo el endpoint POST /auth/change-password
 * debe ser accesible con este tipo de token.
 *
 * Aplícalo como guard global o en cada controller que quieras proteger.
 */
@Injectable()
export class RequirePasswordChangedGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Si no hay token, dejamos que JwtAuthGuard lo maneje
      return true;
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify<{ scope?: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (payload.scope === 'change-password') {
        throw new ForbiddenException(
          'Debes cambiar tu contraseña antes de continuar. Usa POST /auth/change-password.',
        );
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // Otros errores de JWT (expirado, inválido) los maneja JwtAuthGuard
    }

    return true;
  }
}
