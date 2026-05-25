import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayloadUser {
  sub: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayloadUser }>();
    return request.user;
  },
);
