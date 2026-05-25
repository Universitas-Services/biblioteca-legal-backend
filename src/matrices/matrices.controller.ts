import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MatricesService } from './matrices.service';
import { CreateMatrizADto } from './dto/create-matriz-a.dto';
import { CreateMatrizBDto } from './dto/create-matriz-b.dto';
import { UpdateMatrizADto } from './dto/update-matriz.dto';
import { UpdateMatrizBDto } from './dto/update-matriz-b.dto';

@ApiTags('Matrices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matrices')
export class MatricesController {
  constructor(private readonly matricesService: MatricesService) {}

  @Post('a')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear elemento Matriz A (ADMIN)' })
  createA(@Body() dto: CreateMatrizADto) {
    return this.matricesService.createA(dto);
  }

  @Get('a')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  findAllA() {
    return this.matricesService.findAllA();
  }

  @Get('a/:id')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  findOneA(@Param('id') id: string) {
    return this.matricesService.findOneA(id);
  }

  @Patch('a/:id')
  @Roles(Role.ADMIN)
  updateA(@Param('id') id: string, @Body() dto: UpdateMatrizADto) {
    return this.matricesService.updateA(id, dto);
  }

  @Delete('a/:id')
  @Roles(Role.ADMIN)
  deleteA(@Param('id') id: string) {
    return this.matricesService.deleteA(id);
  }

  @Post('b')
  @Roles(Role.ADMIN, Role.REVISOR)
  @ApiOperation({ summary: 'Crear elemento Matriz B (ADMIN/REVISOR)' })
  createB(@Body() dto: CreateMatrizBDto) {
    return this.matricesService.createB(dto);
  }

  @Get('b')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  findAllB() {
    return this.matricesService.findAllB();
  }

  @Get('b/:id')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  findOneB(@Param('id') id: string) {
    return this.matricesService.findOneB(id);
  }

  @Patch('b/:id')
  @Roles(Role.ADMIN, Role.REVISOR)
  updateB(@Param('id') id: string, @Body() dto: UpdateMatrizBDto) {
    return this.matricesService.updateB(id, dto);
  }

  @Delete('b/:id')
  @Roles(Role.ADMIN, Role.REVISOR)
  deleteB(@Param('id') id: string) {
    return this.matricesService.deleteB(id);
  }
}
