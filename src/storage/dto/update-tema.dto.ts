import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTemaDto {
  @ApiPropertyOptional({
    example: 'Derecho Civil y Comercial',
    description: 'Nuevo nombre del tema principal (regenera el slug si cambia).',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  nombreTema?: string;

  @ApiPropertyOptional({
    example: 'Actualización de la descripción del tema.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
