import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaAdminDto {
  @ApiProperty({ example: 'Derecho Electoral' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
