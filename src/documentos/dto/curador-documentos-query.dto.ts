import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum CuradorFiltroEstado {
  TODOS = 'TODOS',
  PUBLICADOS = 'PUBLICADOS',
  EN_REVISION = 'EN_REVISION',
  BORRADORES = 'BORRADORES',
  RECHAZADOS = 'RECHAZADOS',
}

export enum CuradorFiltroTiempo {
  SIETE_DIAS = '7_DIAS',
  TREINTA_DIAS = '30_DIAS',
  TRES_MESES = '3_MESES',
}

export class CuradorDocumentosQueryDto {
  @ApiPropertyOptional({
    enum: CuradorFiltroEstado,
    description: 'Filtrar por estado del documento',
  })
  @IsEnum(CuradorFiltroEstado)
  @IsOptional()
  estado?: CuradorFiltroEstado;

  @ApiPropertyOptional({ description: 'Término de búsqueda parcial en el título' })
  @IsString()
  @IsOptional()
  busqueda?: string;

  @ApiPropertyOptional({
    enum: CuradorFiltroTiempo,
    description: 'Filtrar por tiempo desde su creación',
  })
  @IsEnum(CuradorFiltroTiempo)
  @IsOptional()
  tiempo?: CuradorFiltroTiempo;

  @ApiPropertyOptional({ default: 1, description: 'Número de página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Resultados por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
