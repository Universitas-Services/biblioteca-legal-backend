import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Correo electrónico del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
  })
  password: string;

  @ApiProperty({
    example: 'CURADOR',
    enum: ['ADMIN', 'CURADOR', 'LECTOR'],
    description: 'Rol del usuario (opcional)',
    required: false,
  })
  role?: Role;
}
