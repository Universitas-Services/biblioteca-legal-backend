import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { AmbitoTerritorial } from '@prisma/client';

export class CreateMetadataDto {
  @ApiProperty({
    description: 'ID del documento asociado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  documentoId: string;

  @ApiPropertyOptional({ description: 'Tema principal del documento' })
  @IsOptional()
  @IsString()
  temaPrincipal?: string;

  @ApiPropertyOptional({ description: 'Tipo de documento' })
  @IsOptional()
  @IsString()
  tipoDocumento?: string;

  @ApiPropertyOptional({ description: 'Tipo de norma' })
  @IsOptional()
  @IsString()
  tipoNorma?: string;

  @ApiPropertyOptional({ description: 'Ente emisor de la norma' })
  @IsOptional()
  @IsString()
  enteEmisor?: string;

  @ApiPropertyOptional({ description: 'Fecha de publicación (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fechaPublicacion?: string;

  @ApiPropertyOptional({ description: 'Número de la Gaceta Oficial' })
  @IsOptional()
  @IsString()
  numeroGaceta?: string;

  @ApiPropertyOptional({ enum: AmbitoTerritorial, description: 'Ámbito territorial de la norma' })
  @IsOptional()
  @IsEnum(AmbitoTerritorial)
  ambitoTerritorial?: AmbitoTerritorial;

  @ApiPropertyOptional({ description: 'País de origen' })
  @IsOptional()
  @IsString()
  pais?: string;
}
