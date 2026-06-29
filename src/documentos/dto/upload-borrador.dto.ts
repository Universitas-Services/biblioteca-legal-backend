import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadBorradorDto {
  @ApiProperty({ example: 'Borrador de Ley Orgánica' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({ example: 'Borrador LOCP-2024' })
  @IsString()
  @IsNotEmpty()
  tituloIntegro: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  soloLecturaImagen?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nombreBreve?: string;

  @ApiProperty({
    required: false,
    description: 'ID de SubcarpetaNorma destino (opcional en borrador)',
  })
  @IsOptional()
  @IsUUID('4')
  subcarpetaNormaId?: string;

  @ApiProperty({
    required: false,
    description: 'ID de CarpetaInterna destino (opcional en borrador)',
  })
  @IsOptional()
  @IsUUID('4')
  carpetaInternaId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  enteEmisor?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fechaPublicacion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numeroGaceta?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resumen?: string;

  @ApiProperty({ required: false, description: 'Indica si el PDF tiene OCR habilitado' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  ocrHabilitado?: boolean;

  @ApiProperty({ required: false, description: 'País de origen de la norma' })
  @IsString()
  @IsOptional()
  pais?: string;

  @ApiProperty({
    required: false,
    description: 'ID del documento de jerarquía superior (ej. Ley que avala el reglamento)',
  })
  @IsUUID('4')
  @IsOptional()
  jerarquiaSuperiorId?: string;

  @ApiProperty({ required: false, description: 'ID de otro documento relacionado' })
  @IsUUID('4')
  @IsOptional()
  documentoRelacionadoId?: string;

  @ApiProperty({
    required: false,
    description:
      'Objeto JSON en string con metadatos específicos del tipo documental (ej. tribunal, ISBN, ponente, etc.)',
    example: '{"tribunal": "Tribunal Supremo de Justicia", "numeroExpediente": "12345"}',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        return value as unknown;
      }
    }
    return value as unknown;
  })
  metadatos?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  etiquetas?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  palabrasClave?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  categoriaIds?: string[];

  @ApiProperty({
    required: false,
    description: 'ID de la MatrizA (Producto/Formación) seleccionada por el curador',
  })
  @IsOptional()
  @IsUUID('4')
  matrizAId?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'IDs de MatrizB (Artículos Ágora) seleccionados por el curador',
  })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  matrizBIds?: string[];

  @ApiProperty({
    required: false,
    type: 'string',
    format: 'binary',
    description: 'Documento PDF principal',
  })
  file?: any;

  @ApiProperty({
    required: false,
    type: 'string',
    format: 'binary',
    description: 'Documento PDF de Gaceta Oficial',
  })
  gacetaFile?: any;
}
