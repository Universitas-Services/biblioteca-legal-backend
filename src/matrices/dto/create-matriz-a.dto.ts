import { ApiProperty } from '@nestjs/swagger';
import { TipoSolucion } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateMatrizADto {
  @ApiProperty({ description: 'Nombre comercial del producto (ej. "Curso de Gestión Pública")' })
  @IsString()
  @IsNotEmpty()
  nombreProducto: string;

  @ApiProperty({
    enum: TipoSolucion,
    description: 'Tipo de solución: CURSO, MODELO_DESCARGABLE o EVENTO',
  })
  @IsEnum(TipoSolucion)
  @IsNotEmpty()
  tipoSolucion: TipoSolucion;

  @ApiProperty({ description: 'Enlace de salida hacia la pasarela externa de Universitas' })
  @IsUrl({}, { message: 'urlDestino debe ser una URL válida' })
  @IsNotEmpty()
  urlDestino: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Etiquetas temáticas para el algoritmo de match con el documento legal',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoriasKeywords?: string[];

  @ApiProperty({
    required: false,
    default: true,
    description: 'Control de visualización. Solo ADMIN puede alternarlo.',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
