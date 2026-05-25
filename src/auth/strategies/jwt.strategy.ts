import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    if (payload.tv === undefined || payload.tv !== user.tokenVersion) {
      throw new UnauthorizedException('Sesión cerrada. Inicie sesión nuevamente.');
    }

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
