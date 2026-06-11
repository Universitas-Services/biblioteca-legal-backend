import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from './decorators/current-user.decorator';

// ─── Clases de respuesta Swagger ─────────────────────────────────────────────

class LoginNormalResponse {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT de acceso completo',
  })
  access_token: string;

  @ApiProperty({ example: false, description: 'Siempre false en el login normal' })
  mustChangePassword: boolean;
}

class LoginPasswordChangeResponse {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'JWT restringido (scope: change-password). Solo válido para POST /auth/change-password',
  })
  access_token: string;

  @ApiProperty({
    example: true,
    description: 'Indica que el usuario DEBE cambiar su contraseña antes de continuar',
  })
  mustChangePassword: boolean;
}

class ChangePasswordResponse {
  @ApiProperty({ example: 'Contraseña actualizada exitosamente' })
  message: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Nuevo JWT de acceso completo. Reemplaza el token restringido anterior.',
  })
  access_token: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario',
    description: 'Crea un nuevo usuario en el sistema con rol CLIENTE.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente.' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado.' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: `Autentica al usuario y devuelve un JWT.

**Caso 1 — Login normal:**
\`\`\`json
{ "access_token": "eyJ...", "mustChangePassword": false }
\`\`\`
Usar el \`access_token\` para todas las solicitudes protegidas.

**Caso 2 — Usuario con contraseña temporal (creado por Admin):**
\`\`\`json
{ "access_token": "eyJ...", "mustChangePassword": true }
\`\`\`
El token recibido es **restringido**: únicamente puede llamar a \`POST /auth/change-password\`.
Cualquier otro endpoint devolverá \`403 Forbidden\`.
El frontend debe redirigir obligatoriamente a la pantalla de cambio de contraseña.`,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    type: LoginNormalResponse,
    description: 'Login exitoso. mustChangePassword: false.',
  })
  @ApiResponse({
    status: 200,
    type: LoginPasswordChangeResponse,
    description:
      'Login con contraseña temporal. mustChangePassword: true. El token recibido solo puede usarse en POST /auth/change-password.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: `Permite al usuario cambiar su contraseña. Es **obligatorio** cuando \`mustChangePassword: true\` viene en la respuesta del login.

**¿Cuándo se activa?**
Cuando un Admin crea un usuario staff, ese usuario recibe una contraseña temporal. Al hacer login, recibirá \`mustChangePassword: true\` junto con un **token restringido**.

**Flujo completo:**
1. Llamar a \`POST /auth/login\` → recibir \`mustChangePassword: true\` + \`access_token\` restringido.
2. Usar ese token en el header \`Authorization: Bearer <token>\`.
3. Llamar a este endpoint con \`currentPassword\` (la temporal) y \`newPassword\`.
4. La respuesta incluirá un **nuevo \`access_token\` de acceso completo**.
5. Reemplazar el token guardado y redirigir al dashboard.

**Notas de seguridad:**
- El token restringido caduca en **30 minutos**.
- La nueva contraseña no puede ser igual a la actual.
- La nueva contraseña debe tener mínimo **8 caracteres**.
- Tras el cambio exitoso, el token restringido queda **invalidado automáticamente**.`,
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    type: ChangePasswordResponse,
    description:
      'Contraseña actualizada. La respuesta incluye un nuevo access_token de acceso completo.',
  })
  @ApiResponse({ status: 400, description: 'La nueva contraseña no puede ser igual a la actual.' })
  @ApiResponse({
    status: 401,
    description: 'La contraseña actual es incorrecta o el token es inválido.',
  })
  @ApiResponse({
    status: 422,
    description: 'La nueva contraseña no cumple el mínimo de 8 caracteres.',
  })
  async changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: JwtPayloadUser) {
    return this.authService.changePassword(user.sub, body.currentPassword, body.newPassword);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Finaliza la sesión del usuario autenticado invalidando todos sus tokens activos (cualquier rol).',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado.' })
  async logout(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.logout(user.sub);
  }

  @Post('logout/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cerrar sesión de un usuario (ADMIN)',
    description:
      'Invalida todos los tokens activos del usuario indicado. Solo accesible por Administradores.',
  })
  @ApiResponse({ status: 200, description: 'Sesión del usuario cerrada exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Solo los Administradores pueden ejecutar esta acción.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async logoutUser(@Param('userId') userId: string) {
    return this.authService.logoutUser(userId);
  }
}
