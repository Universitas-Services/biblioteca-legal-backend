import { ApiProperty } from '@nestjs/swagger';
import { Profesion } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export class PerfilNivel2Dto {
  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'El teléfono debe estar en formato internacional E.164 (ej. +584121234567)',
  })
  telefono: string;

  @ApiProperty({ example: 'Venezuela' })
  @IsString()
  @IsNotEmpty()
  pais: string;

  @ApiProperty({ enum: Profesion })
  @IsEnum(Profesion, { message: 'La profesión debe ser un valor del catálogo permitido' })
  profesion: Profesion;
}
