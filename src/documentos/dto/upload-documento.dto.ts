import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDocumentoDto {
  @ApiProperty({
    example: 'Contrato de servicios 2024',
    description: 'Título oficial del documento',
  })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

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

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  categorias?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  etiquetas?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tipoNorma?: string;

  @ApiProperty({
    example: 'Ministerio de Justicia',
    description: 'Ente/emisor del documento',
    required: false,
  })
  @IsString()
  @IsOptional()
  enteEmisor?: string;

  @ApiProperty({ example: '2024-01-15', description: 'Fecha del documento', required: false })
  @IsString()
  @IsOptional()
  fechaPublicacion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numeroGaceta?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  esReforma?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reformaAId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  matrizAElementos?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  matrizBElementos?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resumen?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  palabrasClave?: string[];
}
