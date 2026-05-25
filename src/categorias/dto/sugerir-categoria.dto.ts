import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SugerirCategoriaDto {
  @ApiProperty({ example: 'Derecho Electoral' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
