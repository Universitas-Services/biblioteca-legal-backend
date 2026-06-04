import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListUsuariosAdminQueryDto } from './dto/list-usuarios-admin-query.dto';
import { ListUsuariosAdminResponseDto } from './dto/list-usuarios-admin-response.dto';
import { TemasPersonalQueryDto } from './dto/temas-personal-query.dto';
import { PerfilNivel1Dto } from './dto/perfil-nivel1.dto';
import { PerfilNivel2Dto } from './dto/perfil-nivel2.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayloadUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admin/staff')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear personal interno (ADMIN)' })
  createStaff(@Body() createStaffDto: CreateStaffDto) {
    return this.usersService.createStaffUser(createStaffDto);
  }

  @Post('staff')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Alias: crear personal interno' })
  createStaffAlias(@Body() createStaffDto: CreateStaffDto) {
    return this.usersService.createStaffUser(createStaffDto);
  }

  @Get('admin/usuarios')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar personal interno y administradores',
    description:
      'Devuelve nombre, apellido, correo, rol y temas principales (solo CURADOR/REVISOR). Excluye CLIENTE.',
  })
  @ApiOkResponse({ type: ListUsuariosAdminResponseDto })
  listarUsuariosAdmin(@Query() query: ListUsuariosAdminQueryDto) {
    return this.usersService.listarUsuariosAdmin(query);
  }

  @Get('admin/especialidades')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Catálogo de especialidades para alta de staff',
    description:
      'Incluye el tema "General" (acceso a todas las áreas). Usar en formularios de CURADOR/REVISOR.',
  })
  listarEspecialidades() {
    return this.usersService.listarEspecialidadesDisponibles();
  }

  @Get('admin/temas/personal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Temas con curadores y revisores asignados',
    description:
      'Lista cada TemaPrincipal con los CURADOR y REVISOR vinculados por especialidad. ' +
      'El personal con especialidad "General" aparece solo bajo el tema General.',
  })
  listarTemasConPersonal(@Query() query: TemasPersonalQueryDto) {
    return this.usersService.listarTemasConPersonal(query);
  }

  @Put('perfil/nivel-1')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Muro de datos nivel 1' })
  perfilNivel1(@CurrentUser() user: JwtPayloadUser, @Body() dto: PerfilNivel1Dto) {
    return this.usersService.updatePerfilNivel1(user.sub, dto);
  }

  @Put('perfil/nivel-2')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Muro de datos nivel 2' })
  perfilNivel2(@CurrentUser() user: JwtPayloadUser, @Body() dto: PerfilNivel2Dto) {
    return this.usersService.updatePerfilNivel2(user.sub, dto);
  }

  @Post('favoritos/:documentoId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Agregar documento a favoritos' })
  addFavorito(@CurrentUser() user: JwtPayloadUser, @Param('documentoId') documentoId: string) {
    return this.usersService.addFavorito(user.sub, documentoId);
  }

  @Get('dashboard/inicio')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Dashboard de inicio del cliente' })
  dashboardInicio(@CurrentUser() user: JwtPayloadUser) {
    return this.usersService.getDashboardInicio(user.sub);
  }
}
