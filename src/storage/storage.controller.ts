import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTemaDto } from './dto/create-tema.dto';
import { CreateSubcarpetaDto } from './dto/create-subcarpeta.dto';

/**
 * Controlador administrativo para gestionar la estructura de carpetas simuladas
 * en Google Cloud Storage.
 *
 * Todas las rutas están protegidas por autenticación JWT y requieren rol ADMIN.
 *
 * La estructura jerárquica que se construye en el bucket es:
 *   tema-principal/{nombreTema}/{tipoNorma}/
 *
 * Ejemplo real:
 *   tema-principal/derecho-civil/ley/
 *   tema-principal/derecho-penal/decreto/
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
   * Formatea un string de texto para usarlo como nombre de carpeta en GCS.
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
      .toLowerCase() // Paso 1: todo a minúsculas
      .normalize('NFD') // Paso 2a: descomponer caracteres acentuados (ej: á → a + ́)
      .replace(/[\u0300-\u036f]/g, '') // Paso 2b: eliminar las marcas diacríticas
      .replace(/[^a-z0-9-]/g, '-') // Paso 3: reemplazar caracteres especiales y espacios por guiones
      .replace(/-+/g, '-') // Paso 4: colapsar múltiples guiones consecutivos
      .replace(/^-|-$/g, ''); // Paso 5: eliminar guiones al inicio y al final
  }

  /**
   * POST /admin/storage/tema
   *
   * Crea una carpeta de tema principal en GCS.
   *
   * Flujo:
   * 1. El ValidationPipe global valida el DTO (nombreTema requerido, tipo string).
   * 2. Formatea el nombre a slug (minúsculas, sin espacios, con guiones).
   * 3. Construye la ruta: `tema-principal/{slug}/`.
   * 4. Delega la creación al StorageService.
   * 5. Retorna un JSON con el mensaje de éxito y la URI de GCS.
   *
   * @param dto - DTO validado con la propiedad `nombreTema`.
   * @returns Objeto con mensaje de éxito, ruta creada y URI de GCS.
   */
  @Post('tema')
  async createTema(@Body() dto: CreateTemaDto) {
    // Formatear el nombre del tema a slug para usarlo en la ruta de GCS
    const slug = this.formatSlug(dto.nombreTema);
    this.logger.log(`Creando carpeta de tema: "${dto.nombreTema}" → slug: "${slug}"`);

    // Construir la ruta completa según la estructura jerárquica definida
    const folderPath = `tema-principal/${slug}/`;

    // Delegar la creación de la carpeta al servicio de almacenamiento
    const gcsUri = await this.storageService.createFolder(folderPath);

    return {
      message: `Carpeta de tema '${slug}' creada exitosamente.`,
      path: folderPath,
      gcsUri,
    };
  }

  /**
   * POST /admin/storage/tema/:nombreTema/subcarpeta
   *
   * Crea una subcarpeta de tipo de norma dentro de un tema existente en GCS.
   *
   * Flujo:
   * 1. El ValidationPipe global valida el DTO (tipoNorma requerido, tipo string).
   * 2. Valida que el parámetro de ruta `nombreTema` no esté vacío.
   * 3. Formatea ambos nombres a slug.
   * 4. Construye la ruta: `tema-principal/{nombreTema}/{tipoNorma}/`.
   * 5. Delega la creación al StorageService.
   * 6. Retorna un JSON con el mensaje de éxito y la URI de GCS.
   *
   * Nota: No se valida si la carpeta padre (tema) existe, ya que GCS no requiere
   * que existan carpetas intermedias. Sin embargo, la estructura lógica se mantiene.
   *
   * @param nombreTema - Nombre del tema padre (parámetro de ruta).
   * @param dto - DTO validado con la propiedad `tipoNorma`.
   * @returns Objeto con mensaje de éxito, ruta creada y URI de GCS.
   * @throws BadRequestException si `nombreTema` está vacío.
   */
  @Post('tema/:nombreTema/subcarpeta')
  async createSubcarpeta(
    @Param('nombreTema') nombreTema: string,
    @Body() dto: CreateSubcarpetaDto,
  ) {
    // Validar que el parámetro de ruta no esté vacío (los params no pasan por ValidationPipe)
    if (!nombreTema || nombreTema.trim().length === 0) {
      throw new BadRequestException(
        'El parámetro "nombreTema" es obligatorio y no puede estar vacío.',
      );
    }

    // Formatear ambos nombres a slug para construir la ruta
    const temaSlug = this.formatSlug(nombreTema);
    const normaSlug = this.formatSlug(dto.tipoNorma);
    this.logger.log(
      `Creando subcarpeta: tema="${nombreTema}" → "${temaSlug}", norma="${dto.tipoNorma}" → "${normaSlug}"`,
    );

    // Construir la ruta completa: tema-principal/{tema}/{tipoNorma}/
    const folderPath = `tema-principal/${temaSlug}/${normaSlug}/`;

    // Delegar la creación de la subcarpeta al servicio de almacenamiento
    const gcsUri = await this.storageService.createFolder(folderPath);

    return {
      message: `Subcarpeta '${normaSlug}' creada exitosamente dentro de '${temaSlug}'.`,
      path: folderPath,
      gcsUri,
    };
  }
}
