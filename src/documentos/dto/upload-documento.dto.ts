import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDocumentoDto {
  @ApiProperty({ example: 'Ley Orgánica de Contrataciones Públicas' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({ example: 'LOCP-2024 Completa' })
  @IsString()
  @IsNotEmpty()
  tituloIntegro: string;

  @ApiProperty({ example: 'locp-2024' })
  @IsString()
  @IsNotEmpty()
  nombreBreve: string;

  @ApiProperty({
    description: `ID de la SubcarpetaNorma destino (obligatorio). 
Define la base de la ruta GCS.
- Nivel 1 (Tema Principal): Se infiere automáticamente (ej. "Derecho Urbanístico").
- Nivel 2 (Subcarpeta de Norma): Definido por este ID (ej. "Legislación").
Ejemplo ruta base: "tema-principal/derecho-urbanistico/legislacion/"`,
  })
  @IsUUID('4')
  @IsNotEmpty()
  subcarpetaNormaId: string;

  @ApiProperty({
    required: false,
    description: `ID de CarpetaInterna destino (opcional). 
Define los subniveles adicionales (recursivos) de la ruta GCS.
- Nivel 3 (Jurisdicción): (ej. "Nacional", "Estadal").
- Nivel 4 (Subtipo de Norma): (ej. "Leyes Orgánicas", "Leyes Ordinarias").
*Nota: Si seleccionas el ID de una carpeta de Nivel 4, el backend resolverá automáticamente sus padres (Nivel 3) para construir la ruta.*
Ejemplo de ruta final resultante: "tema-principal/derecho-urbanistico/legislacion/nacional/leyes-organicas/"`,
  })
  @IsOptional()
  @IsUUID('4')
  carpetaInternaId?: string;

  @ApiProperty({ example: 'Gaceta Oficial Extraordinaria' })
  @IsString()
  @IsNotEmpty()
  enteEmisor: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsString()
  @IsNotEmpty()
  fechaPublicacion: string;

  @ApiProperty({ type: [String], description: 'IDs de categorías aprobadas' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value as string[];
  })
  categoriaIds: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  soloLecturaImagen?: boolean;

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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numeroGaceta?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resumen?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  palabrasClave?: string[];

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
}
