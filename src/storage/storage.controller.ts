import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { CreateSubcarpetaDto } from './dto/create-subcarpeta.dto';

/**
 * Controlador administrativo para gestionar la estructura de carpetas simuladas
 * en Google Cloud Storage, sincronizadas con registros en la base de datos.
 *
 * Todas las rutas están protegidas por autenticación JWT y requieren rol ADMIN.
 *
 * La estructura jerárquica que se construye es:
 *   BD:  TemaPrincipal (id, nombre, slug) → SubcarpetaNorma (id, nombre, slug, temaPrincipalId)
 *   GCS: tema-principal/{temaSlug}/{normaSlug}/
 */
@ApiTags('Admin - Storage') // Agrupar estos endpoints en la sección "Admin - Storage" de Swagger
@ApiBearerAuth() // Indica a Swagger que envíe el token Bearer en el header Authorization
@Controller('admin/storage')
@UseGuards(JwtAuthGuard, RolesGuard) // Proteger todas las rutas del controlador con JWT y validación de rol
@Roles('ADMIN') // Solo usuarios con rol ADMIN pueden acceder
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Formatea un string de texto para usarlo como nombre de carpeta en GCS (slug).
   *
   * Transformaciones aplicadas:
   * 1. Convierte a minúsculas.
   * 2. Elimina tildes y diacríticos (NFD + regex de marcas combinadas).
   * 3. Reemplaza cualquier carácter no alfanumérico ni guión por un guión `-`.
   * 4. Colapsa guiones consecutivos en uno solo.
   * 5. Elimina guiones al inicio y al final del string.
   *
   * @param text - Texto a formatear (ej: "Derecho Civil" → "derecho-civil").
   * @returns String formateado listo para usar en rutas de GCS.
   */
  private formatSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ENDPOINTS DE TEMAS PRINCIPALES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /admin/storage/tema
   *
   * Crea un tema principal en la BD y su carpeta simulada en GCS.
   *
   * Flujo:
   * 1. El ValidationPipe valida el DTO (nombreTema: string, requerido).
   * 2. Se formatea el nombre a slug.
   * 3. El servicio verifica unicidad en BD → crea carpeta en GCS → persiste en BD.
   * 4. Retorna el registro creado con su ID auto-incremental.
   *
   * @param dto - DTO con `nombreTema`.
   * @returns Objeto con `id`, `nombre`, `slug`, `path` y `gcsUri`.
   */
  @Post('tema')
  @ApiOperation({ summary: 'Crear un tema principal (BD + carpeta GCS)' })
  async createTema(@Body() dto: CreateTemaDto) {
    const slug = this.formatSlug(dto.nombreTema);
    this.logger.log(`Creando tema: "${dto.nombreTema}" → slug: "${slug}"`);

    // El servicio orquesta: verificación de unicidad → GCS → Prisma
    const tema = await this.storageService.createTema(dto.nombreTema, slug);

    return {
      id: tema.id,
      nombre: tema.nombre,
      slug: tema.slug,
      path: `tema-principal/${tema.slug}/`,
      gcsUri: tema.gcsUri,
    };
  }

  /**
   * GET /admin/storage/temas
   *
   * Lista todos los temas principales registrados en la BD,
   * incluyendo sus subcarpetas de tipo de norma.
   *
   * @returns Array de temas con sus subcarpetas anidadas.
   */
  @Get('temas')
  @ApiOperation({ summary: 'Listar todos los temas principales con sus subcarpetas' })
  async findAllTemas() {
    return this.storageService.findAllTemas();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ENDPOINTS DE SUBCARPETAS (TIPO DE NORMA)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /admin/storage/tema/:temaId/subcarpeta
   *
   * Crea una subcarpeta de tipo de norma dentro de un tema existente.
   *
   * Flujo:
   * 1. El ValidationPipe valida el DTO (tipoNorma: string, requerido).
   * 2. `ParseIntPipe` convierte el parámetro `:temaId` a número entero.
   * 3. Se formatea `tipoNorma` a slug.
   * 4. El servicio verifica que el tema padre exista → verifica unicidad del slug
   *    dentro del tema → crea carpeta en GCS → persiste el registro en BD.
   * 5. Retorna el registro creado con su ID y la referencia al tema padre.
   *
   * @param temaId - ID numérico del tema padre (auto-incremental de la BD).
   * @param dto - DTO con `tipoNorma`.
   * @returns Objeto con `id`, `nombre`, `slug`, `temaPrincipalId`, `path` y `gcsUri`.
   */
  @Post('tema/:temaId/subcarpeta')
  @ApiOperation({ summary: 'Crear una subcarpeta de tipo de norma dentro de un tema (BD + GCS)' })
  @ApiParam({ name: 'temaId', type: String, description: 'ID UUID del tema principal' })
  async createSubcarpeta(
    @Param('temaId', ParseUUIDPipe) temaId: string,
    @Body() dto: CreateSubcarpetaDto,
  ) {
    const slug = this.formatSlug(dto.tipoNorma);
    this.logger.log(
      `Creando subcarpeta en tema ID ${temaId}: "${dto.tipoNorma}" → slug: "${slug}"`,
    );

    // El servicio valida que el tema exista, verifica duplicados y crea en GCS + BD
    const subcarpeta = await this.storageService.createSubcarpeta(temaId, dto.tipoNorma, slug);

    return {
      id: subcarpeta.id,
      nombre: subcarpeta.nombre,
      slug: subcarpeta.slug,
      temaPrincipalId: subcarpeta.temaPrincipalId,
      gcsUri: subcarpeta.gcsUri,
    };
  }

  /**
   * GET /admin/storage/tema/:temaId/subcarpetas
   *
   * Lista todas las subcarpetas de tipo de norma de un tema específico.
   *
   * @param temaId - ID numérico del tema principal.
   * @returns Array de subcarpetas del tema, ordenadas por ID.
   */
  @Get('tema/:temaId/subcarpetas')
  @ApiOperation({ summary: 'Listar todas las subcarpetas de un tema específico' })
  @ApiParam({ name: 'temaId', type: String, description: 'ID UUID del tema principal' })
  async findSubcarpetas(@Param('temaId', ParseUUIDPipe) temaId: string) {
    return this.storageService.findSubcarpetasByTema(temaId);
  }
}
