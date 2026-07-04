import { Controller, Get, UseGuards, InternalServerErrorException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoDocumento, Prisma } from '@prisma/client';
import { ApiKeyGuard } from './guards/api-key.guard';

@ApiTags('Biblioteca Legal Externa')
@Controller('api/v1/biblioteca-legal')
export class BibliotecaLegalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('urbanismo')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Obtiene los documentos publicados de urbanismo',
    description:
      'Retorna una lista de documentos de la biblioteca legal cuyo tema principal sea Derecho Urbanístico. Este endpoint requiere autenticación mediante el header x-api-key.',
  })
  @ApiSecurity('x-api-key')
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key para acceso a servicios externos',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de documentos devuelta exitosamente en formato paginado con toda la información (relaciones incluidas).',
    schema: {
      example: {
        items: [
          {
            id: 'uuid-o-id-unico-del-documento',
            titulo: 'Plan de Desarrollo Urbano 2024',
            tituloIntegro: 'Plan de Desarrollo Urbano de la Ciudad 2024',
            descripcion:
              'Documento que establece los lineamientos principales para el desarrollo urbanístico.',
            resumen:
              'Documento que establece los lineamientos principales para el desarrollo urbanístico.',
            gcpFileName:
              'tema-principal/derecho-urbanistico/legislacion/ley-ordinaria/plan-2024.pdf',
            archivoOriginalUrl:
              'gs://biblioteca-legal/tema-principal/derecho-urbanistico/legislacion/ley-ordinaria/plan-2024.pdf',
            fechaPublicacion: '2024-05-12T10:00:00Z',
            numeroGaceta: 'G.O. 42.123',
            municipio: 'Chacao',
            estado: 'Miranda',
            estadoLegal: null,
            tipoNorma: 'Ley Ordinaria',
            enteEmisor: 'Concejo Municipal',
            pais: 'Venezuela',
            curadorId: 'uuid-curador',
            curador: {
              id: 'uuid-curador',
              email: 'curador@example.com',
              nombre: 'Juan',
              apellido: 'Pérez',
            },
            categorias: [
              {
                id: 'uuid-categoria',
                nombre: 'Derecho Administrativo',
              },
            ],
            etiquetas: [],
            notasInternas: [],
            metadatos: {
              municipio: 'Chacao',
              estado: 'Miranda',
            },
            _count: {
              notasInternas: 0,
            },
          },
        ],
        total: 100,
        page: 1,
        limit: 50,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Falta el header x-api-key o es inválido.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de registros por página (default: 50, max: 100)',
  })
  async getUrbanismoDocuments(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNumber = Math.max(1, parseInt(page || '1', 10));
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
    const skip = (pageNumber - 1) * limitNumber;

    try {
      const whereCondition: Prisma.DocumentoWhereInput = {
        temaPrincipal: 'Derecho Urbanístico',
        estado: EstadoDocumento.PUBLICADO,
        eliminado: false,
      };

      const [total, documentos] = await Promise.all([
        this.prisma.client.documento.count({ where: whereCondition }),
        this.prisma.client.documento.findMany({
          where: whereCondition,
          skip,
          take: limitNumber,
          orderBy: { createdAt: 'desc' },
          include: {
            curador: { select: { id: true, email: true, nombre: true, apellido: true } },
            _count: { select: { notasInternas: true } },
            notasInternas: {
              orderBy: { fecha: 'desc' },
              take: 1,
              include: { autor: { select: { id: true, nombre: true, role: true } } },
            },
            metadata: true,
            categorias: { select: { id: true, nombre: true } },
            etiquetas: { select: { id: true, nombre: true } },
          },
        }),
      ]);

      const bucketName = this.configService.get<string>('GCP_STORAGE_BUCKET_NAME');
      if (!bucketName) {
        throw new InternalServerErrorException('GCP_STORAGE_BUCKET_NAME no está configurado');
      }

      const prefix = `gs://${bucketName}/`;

      // Mapear los resultados al formato requerido
      const items = documentos.map(doc => {
        let gcpFileName = '';
        if (doc.archivoOriginalUrl && doc.archivoOriginalUrl.startsWith(prefix)) {
          gcpFileName = doc.archivoOriginalUrl.slice(prefix.length);
        } else {
          // Fallback por si la URL no tiene el formato esperado, aunque no debería ocurrir
          gcpFileName = doc.archivoOriginalUrl || '';
        }

        // Extraer municipio y estado de los metadatos si existen
        const metadatos = (doc.metadatos as Record<string, unknown>) || {};
        const municipio = typeof metadatos.municipio === 'string' ? metadatos.municipio : null;
        const estadoGeografico = typeof metadatos.estado === 'string' ? metadatos.estado : null;

        return {
          ...doc,
          id: doc.id,
          titulo: doc.titulo,
          descripcion: doc.resumen || '',
          gcpFileName,
          fechaPublicacion: doc.fechaPublicacion || null,
          numeroGaceta: doc.numeroGaceta || null,
          municipio,
          estado: estadoGeografico || doc.estadoLegal || doc.estado || null,
        };
      });

      return {
        items,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener los documentos de urbanismo');
    }
  }
}
