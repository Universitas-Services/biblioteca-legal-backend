import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

const ROLES_LISTABLES = [Role.CURADOR, Role.REVISOR, Role.AUDITOR, Role.ADMIN] as const;

export class ListUsuariosAdminQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Número de página (desde 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Cantidad de usuarios por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ROLES_LISTABLES,
    description: 'Filtrar por un rol concreto',
  })
  @IsEnum(ROLES_LISTABLES)
  @IsOptional()
  role?: (typeof ROLES_LISTABLES)[number];
}
