import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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

interface RequestWithUser extends Request {
  user: { id: string; email: string; role: Role };
}

@ApiTags('Matrices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matrices')
export class MatricesController {
  constructor(private readonly matricesService: MatricesService) {}

  // ──────────────────────────────────────────────────────────────────────────────
  // Matriz A — Catálogo de Productos y Formación
  // ──────────────────────────────────────────────────────────────────────────────

  @Post('a')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear producto en Matriz A (solo ADMIN)',
    description: 'Agrega un nuevo curso, modelo descargable o evento al catálogo de Universitas.',
  })
  createA(@Body() dto: CreateMatrizADto) {
    return this.matricesService.createA(dto);
  }

  @Get('a')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  @ApiOperation({
    summary: 'Listar Matriz A (filtrada por rol)',
    description:
      'ADMIN: ve el inventario completo incluyendo inactivos. CURADOR/REVISOR: filtro oculto — solo productos activos.',
  })
  findAllA(@Req() req: RequestWithUser) {
    return this.matricesService.findAllA(req.user.role);
  }

  @Get('a/:id')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  @ApiOperation({ summary: 'Obtener un producto de Matriz A por ID' })
  findOneA(@Param('id') id: string) {
    return this.matricesService.findOneA(id);
  }

  @Patch('a/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Editar producto en Matriz A (solo ADMIN)',
    description: 'Permite actualizar cualquier campo, incluido el estatus activo/inactivo.',
  })
  updateA(@Param('id') id: string, @Body() dto: UpdateMatrizADto) {
    return this.matricesService.updateA(id, dto);
  }

  @Delete('a/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar producto de Matriz A (solo ADMIN)' })
  deleteA(@Param('id') id: string) {
    return this.matricesService.deleteA(id);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Matriz B — Repositorio de Ágora / Lecturas Recomendadas
  // ──────────────────────────────────────────────────────────────────────────────

  @Post('b')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear artículo en Matriz B — Ágora (solo ADMIN)',
    description: 'Agrega un artículo del blog de Ágora al repositorio de lecturas recomendadas.',
  })
  createB(@Body() dto: CreateMatrizBDto) {
    return this.matricesService.createB(dto);
  }

  @Get('b')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  @ApiOperation({
    summary: 'Listar artículos de Matriz B — Ágora',
    description: 'Devuelve todos los artículos del repositorio, ordenados por título.',
  })
  findAllB() {
    return this.matricesService.findAllB();
  }

  @Get('b/:id')
  @Roles(Role.ADMIN, Role.REVISOR, Role.CURADOR)
  @ApiOperation({ summary: 'Obtener un artículo de Matriz B por ID' })
  findOneB(@Param('id') id: string) {
    return this.matricesService.findOneB(id);
  }

  @Patch('b/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Editar artículo de Matriz B (solo ADMIN)' })
  updateB(@Param('id') id: string, @Body() dto: UpdateMatrizBDto) {
    return this.matricesService.updateB(id, dto);
  }

  @Delete('b/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar artículo de Matriz B (solo ADMIN)' })
  deleteB(@Param('id') id: string) {
    return this.matricesService.deleteB(id);
  }
}
