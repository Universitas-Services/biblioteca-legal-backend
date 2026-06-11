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

  @ApiProperty({ example: 'Derecho Mercantil' })
  @IsString()
  @IsNotEmpty()
  temaPrincipal: string;

  @ApiProperty({ example: 'Ley' })
  @IsString()
  @IsNotEmpty()
  tipoNorma: string;

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
