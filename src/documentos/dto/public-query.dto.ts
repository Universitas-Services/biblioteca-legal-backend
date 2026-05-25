import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PublicQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  enteEmisor?: string;

  @ApiPropertyOptional({ description: 'Búsqueda en título, resumen y palabras clave' })
  @IsString()
  @IsOptional()
  q?: string;
}
