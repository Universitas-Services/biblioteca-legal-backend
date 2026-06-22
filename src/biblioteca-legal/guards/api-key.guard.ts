import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

    // Si no viene x-api-key en el header, puede que lo envíen como Bearer Token
    let token = apiKeyHeader;
    if (!token && request.headers.authorization) {
      const match = request.headers.authorization.match(/^Bearer (.*)$/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('API key is missing');
    }

    const validApiKey = this.configService.get<string>('URBANISMO_API_KEY');

    if (!validApiKey) {
      // Si el servidor no tiene configurada la variable de entorno, fallar de forma segura
      throw new UnauthorizedException('API key is not configured on the server');
    }

    if (token !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
