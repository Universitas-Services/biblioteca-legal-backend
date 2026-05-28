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
import { Transform, TransformFnParams } from 'class-transformer';

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
  @Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value as string[];
    return value as unknown;
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
  @Transform(({ value }: TransformFnParams) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Imagen del Banner (JPG, PNG, GIF)',
  })
  @IsOptional() // Lo ponemos opcional en validación de clase porque Multer maneja el archivo aparte
  imagenBanner?: any;
}
