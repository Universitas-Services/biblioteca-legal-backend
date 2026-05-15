import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import * as bcrypt from 'bcrypt';
import { User, PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly prismaClient: PrismaClient;

  constructor(private prisma: PrismaService) {
    this.prismaClient = prisma.client;
  }

  async createStaffUser(createStaffDto: CreateStaffDto) {
    const { email, password, role } = createStaffDto;

    // 1. Verificamos si el usuario ya existe
    const userExists = await this.prismaClient.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 2. Encriptamos la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Guardamos en base de datos
    const user: User = await this.prismaClient.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    // 4. Retornamos el usuario excluyendo la contraseña
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
