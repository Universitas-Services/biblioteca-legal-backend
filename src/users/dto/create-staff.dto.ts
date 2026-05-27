import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty({
    example: 'staff@biblioteca.com',
    description: 'Correo electrónico del personal interno',
  })
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    example: 'CURADOR',
    enum: [Role.CURADOR, Role.REVISOR, Role.AUDITOR],
    description: 'Rol asignado al personal interno',
  })
  @IsEnum([Role.CURADOR, Role.REVISOR, Role.AUDITOR], {
    message:
      'El rol debe ser CURADOR, REVISOR o AUDITOR. No se permite crear CLIENTE o ADMIN desde este endpoint.',
  })
  role: Role;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del personal interno',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del personal interno',
  })
  @IsString()
  apellido: string;

  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'IDs de los temas principales asignados (obligatorio para REVISOR)',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  temaIds?: string[];
}
