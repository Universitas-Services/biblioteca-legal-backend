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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  temaPrincipal?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tipoNorma?: string;

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
}
