import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CuradorFiltroEstado } from './curador-documentos-query.dto';

export class AdminDocumentosQueryDto {
  @ApiPropertyOptional({ description: 'ID del curador para filtrar los documentos' })
  @IsOptional()
  @IsString()
  curadorId?: string;

  @ApiPropertyOptional({ description: 'Filtrar solo documentos que tengan notas internas' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  conNotas?: boolean;

  @ApiPropertyOptional({
    enum: CuradorFiltroEstado,
    description: 'Filtrar por estado del documento (alineado con estados de curador)',
  })
  @IsEnum(CuradorFiltroEstado)
  @IsOptional()
  estado?: CuradorFiltroEstado;

  @ApiPropertyOptional({ default: 1, description: 'Número de página (1-based)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Resultados por página (máx 50)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
