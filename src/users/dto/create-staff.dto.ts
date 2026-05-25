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
    example: ['Derecho Electoral', 'Derecho Constitucional'],
    description: 'Especialidades del personal (CURADOR/REVISOR)',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  especialidades?: string[];
}
