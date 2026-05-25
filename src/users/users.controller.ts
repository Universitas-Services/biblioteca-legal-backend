import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
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
