import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from './decorators/current-user.decorator';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario',
    description: 'Crear un nuevo usuario en el sistema',
  })
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autenticar usuario y obtener token JWT',
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Finaliza la sesión del usuario autenticado (cualquier rol).',
  })
  async logout(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.logout(user.sub);
  }

  @Post('logout/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cerrar sesión de un usuario (ADMIN)',
    description: 'Invalida todos los tokens activos del usuario indicado.',
  })
  async logoutUser(@Param('userId') userId: string) {
    return this.authService.logoutUser(userId);
  }
}
