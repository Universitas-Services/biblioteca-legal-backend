import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { UploadDocumentoDto } from './upload-documento.dto';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoLegal } from '@prisma/client';

export class UpdateDocumentoDto extends PartialType(UploadDocumentoDto) {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((s: string) => s.trim()) : (value as string[]),
  )
  categoriaIds?: string[];

  @ApiPropertyOptional({
    enum: EstadoLegal,
    description: 'Estado legal del documento (VIGENTE, REFORMADA, DEROGADA)',
  })
  @IsEnum(EstadoLegal)
  @IsOptional()
  estadoLegal?: EstadoLegal;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Reemplazar Documento PDF principal',
  })
  file?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Reemplazar Documento PDF de Gaceta Oficial',
  })
  gacetaFile?: any;
}
