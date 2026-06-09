import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminDocumentosQueryDto {
  @ApiPropertyOptional({ description: 'ID del curador para filtrar los documentos' })
  @IsOptional()
  @IsString()
  curadorId?: string;

  @ApiPropertyOptional({ description: 'Filtrar solo documentos que tengan notas internas' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  conNotas?: boolean;
}
