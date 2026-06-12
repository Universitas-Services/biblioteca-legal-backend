import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, IsUUID, ArrayMinSize, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class PublicarBorradorDto {
  @ApiProperty({ description: 'ID de la SubcarpetaNorma destino (obligatorio al publicar)' })
  @IsUUID('4')
  @IsNotEmpty()
  subcarpetaNormaId: string;

  @ApiProperty({ required: false, description: 'ID de CarpetaInterna destino (opcional)' })
  @IsOptional()
  @IsUUID('4')
  carpetaInternaId?: string;

  @ApiProperty({ type: [String], description: 'IDs de categorías aprobadas' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value as string[];
  })
  categoriaIds: string[];
}
