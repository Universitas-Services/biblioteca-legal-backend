import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class PublicarBorradorDto {
  @ApiProperty({ example: 'Derecho Mercantil' })
  @IsString()
  @IsNotEmpty()
  temaPrincipal: string;

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
