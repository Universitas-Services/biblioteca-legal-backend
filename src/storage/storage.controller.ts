import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTemaDto } from './dto/create-tema.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { CreateSubcarpetaDto } from './dto/create-subcarpeta.dto';
import { CreateCarpetaInternaDto } from './dto/create-carpeta-interna.dto';
import { UpdateSubcarpetaDto } from './dto/update-subcarpeta.dto';
import { StorageListQueryDto } from './dto/storage-list-query.dto';
import { formatStorageSlug } from './utils/format-storage-slug.util';

@ApiTags('Admin - Storage')
@ApiBearerAuth()
@Controller('admin/storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  // ─── TEMAS PRINCIPALES ───────────────────────────────────────────────────────

  @Post('tema')
  @ApiOperation({ summary: 'Crear un tema principal (BD + carpeta GCS)' })
  createTema(@Body() dto: CreateTemaDto) {
    const slug = formatStorageSlug(dto.nombreTema);
    this.logger.log(`Creando tema: "${dto.nombreTema}" → slug: "${slug}"`);
    return this.storageService.createTema(dto.nombreTema, slug, dto.descripcion);
  }

  @Get('temas')
  @Roles('ADMIN', 'CURADOR')
  @ApiOperation({ summary: 'Listar temas principales con sus subcarpetas activas' })
  findAllTemas(@Query() query: StorageListQueryDto) {
    return this.storageService.findAllTemas(query.incluirEliminados);
  }

  @Get('tema/:id')
  @ApiOperation({ summary: 'Obtener un tema principal por ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID del tema principal' })
  findTemaById(@Param('id', ParseUUIDPipe) id: string, @Query() query: StorageListQueryDto) {
    return this.storageService.findTemaById(id, query.incluirEliminados);
  }

  @Patch('tema/:id')
  @ApiOperation({ summary: 'Editar un tema principal' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID del tema principal' })
  updateTema(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemaDto) {
    return this.storageService.updateTema(id, dto);
  }

  @Delete('tema/:id')
  @ApiOperation({ summary: 'Eliminar pasivamente un tema principal y sus subcarpetas' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID del tema principal' })
  softDeleteTema(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.softDeleteTema(id);
  }

  // ─── SUBCARPETAS (TIPO DE NORMA) ─────────────────────────────────────────────

  @Post('tema/:temaId/subcarpeta')
  @ApiOperation({ summary: 'Crear subcarpeta de tipo de norma (BD + GCS)' })
  @ApiParam({ name: 'temaId', type: String, description: 'ID UUID del tema principal' })
  createSubcarpeta(
    @Param('temaId', ParseUUIDPipe) temaId: string,
    @Body() dto: CreateSubcarpetaDto,
  ) {
    const slug = formatStorageSlug(dto.tipoNorma);
    this.logger.log(
      `Creando subcarpeta en tema ID ${temaId}: "${dto.tipoNorma}" → slug: "${slug}"`,
    );
    return this.storageService.createSubcarpeta(temaId, dto.tipoNorma, slug, dto.descripcion);
  }

  @Get('tema/:temaId/subcarpetas')
  @Roles('ADMIN', 'CURADOR')
  @ApiOperation({ summary: 'Listar subcarpetas de un tema' })
  @ApiParam({ name: 'temaId', type: String, description: 'ID UUID del tema principal' })
  findSubcarpetas(
    @Param('temaId', ParseUUIDPipe) temaId: string,
    @Query() query: StorageListQueryDto,
  ) {
    return this.storageService.findSubcarpetasByTema(temaId, query.incluirEliminados);
  }

  @Get('subcarpeta/:id')
  @ApiOperation({ summary: 'Obtener una subcarpeta por ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID de la subcarpeta' })
  findSubcarpetaById(@Param('id', ParseUUIDPipe) id: string, @Query() query: StorageListQueryDto) {
    return this.storageService.findSubcarpetaById(id, query.incluirEliminados);
  }

  @Patch('subcarpeta/:id')
  @ApiOperation({ summary: 'Editar una subcarpeta (tipo de norma y descripción)' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID de la subcarpeta' })
  updateSubcarpeta(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubcarpetaDto) {
    return this.storageService.updateSubcarpeta(id, dto);
  }

  @Delete('subcarpeta/:id')
  @ApiOperation({ summary: 'Eliminar pasivamente una subcarpeta' })
  @ApiParam({ name: 'id', type: String, description: 'ID UUID de la subcarpeta' })
  softDeleteSubcarpeta(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.softDeleteSubcarpeta(id);
  }

  // ─── CARPETAS INTERNAS (ANIDADAS) ───────────────────────────────────────────

  @Post('subcarpeta/:subcarpetaId/carpeta-interna')
  @ApiOperation({
    summary: 'Crear carpeta interna de primer nivel (BD + GCS)',
    description: 'Primer nivel bajo un tipo de norma (ej: carpeta A).',
  })
  @ApiParam({
    name: 'subcarpetaId',
    type: String,
    description: 'ID UUID de la subcarpeta (tipo de norma)',
  })
  createCarpetaInternaRaiz(
    @Param('subcarpetaId', ParseUUIDPipe) subcarpetaId: string,
    @Body() dto: CreateCarpetaInternaDto,
  ) {
    const slug = formatStorageSlug(dto.nombreCarpeta);
    this.logger.log(
      `Carpeta interna raíz en subcarpeta ${subcarpetaId}: "${dto.nombreCarpeta}" → "${slug}"`,
    );
    return this.storageService.createCarpetaInternaRaiz(
      subcarpetaId,
      dto.nombreCarpeta,
      slug,
      dto.descripcion,
    );
  }

  @Post('carpeta-interna/:parentId/carpeta-interna')
  @ApiOperation({
    summary: 'Crear carpeta interna hija (BD + GCS)',
    description:
      'Subcarpeta anidada bajo otra carpeta interna (ej: A.1, A.1.1). Máximo 10 niveles.',
  })
  @ApiParam({ name: 'parentId', type: String, description: 'ID UUID de la carpeta interna padre' })
  createCarpetaInternaHija(
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Body() dto: CreateCarpetaInternaDto,
  ) {
    const slug = formatStorageSlug(dto.nombreCarpeta);
    this.logger.log(`Carpeta interna hija de ${parentId}: "${dto.nombreCarpeta}" → "${slug}"`);
    return this.storageService.createCarpetaInternaHija(
      parentId,
      dto.nombreCarpeta,
      slug,
      dto.descripcion,
    );
  }

  @Get('subcarpeta/:subcarpetaId/carpetas-internas')
  @Roles('ADMIN', 'CURADOR')
  @ApiOperation({ summary: 'Listar carpetas internas raíz de una subcarpeta' })
  @ApiParam({ name: 'subcarpetaId', type: String })
  findCarpetasInternasRaiz(
    @Param('subcarpetaId', ParseUUIDPipe) subcarpetaId: string,
    @Query() query: StorageListQueryDto,
  ) {
    return this.storageService.findCarpetasInternasRaiz(subcarpetaId, query.incluirEliminados);
  }

  @Get('carpeta-interna/:id/hijos')
  @ApiOperation({ summary: 'Listar hijos directos de una carpeta interna' })
  @ApiParam({ name: 'id', type: String })
  findCarpetasInternasHijas(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StorageListQueryDto,
  ) {
    return this.storageService.findCarpetasInternasHijas(id, query.incluirEliminados);
  }

  @Get('carpeta-interna/:id')
  @ApiOperation({ summary: 'Obtener una carpeta interna por ID' })
  @ApiParam({ name: 'id', type: String })
  findCarpetaInternaById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StorageListQueryDto,
  ) {
    return this.storageService.findCarpetaInternaById(id, query.incluirEliminados);
  }

  @Delete('carpeta-interna/:id')
  @ApiOperation({ summary: 'Eliminar pasivamente una carpeta interna y sus descendientes' })
  @ApiParam({ name: 'id', type: String })
  softDeleteCarpetaInterna(@Param('id', ParseUUIDPipe) id: string) {
    return this.storageService.softDeleteCarpetaInterna(id);
  }
}
