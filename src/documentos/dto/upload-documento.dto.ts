import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadDocumentoDto {
  @ApiProperty({
    example: 'Contrato de servicios 2024',
    description: 'Título del documento',
  })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @ApiProperty({
    example: 'Ministerio de Justicia',
    description: 'Ente/emisor del documento',
    required: false,
  })
  @IsString()
  @IsOptional()
  ente?: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Fecha del documento en formato YYYY-MM-DD',
    required: false,
  })
  @IsString()
  @IsOptional()
  fecha: string;
}
