import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateComentarioDto {
  @ApiProperty()
  @IsUUID()
  documentoId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  texto: string;
}
