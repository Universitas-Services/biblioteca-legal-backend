import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSubcarpetaDto {
  @ApiPropertyOptional({
    example: 'Decreto con Fuerza de Ley',
    description: 'Nuevo tipo de norma (regenera el slug si cambia).',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  tipoNorma?: string;

  @ApiPropertyOptional({
    example: 'Normas expedidas por el Ejecutivo con fuerza de ley.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
