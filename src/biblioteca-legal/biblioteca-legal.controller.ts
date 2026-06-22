import { Controller, Get, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoDocumento } from '@prisma/client';
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
    description: 'Lista de documentos devuelta exitosamente.',
    schema: {
      example: [
        {
          id: 'uuid-o-id-unico-del-documento',
          titulo: 'Plan de Desarrollo Urbano 2024',
          descripcion:
            'Documento que establece los lineamientos principales para el desarrollo urbanístico de la ciudad.',
          gcpFileName: 'tema-principal/derecho-urbanistico/legislacion/ley-ordinaria/plan-2024.pdf',
          fechaPublicacion: '2024-05-12T10:00:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Falta el header x-api-key o es inválido.',
  })
  async getUrbanismoDocuments() {
    try {
      // Filtrar documentos por el tema principal y que estén publicados y no eliminados
      const documentos = await this.prisma.client.documento.findMany({
        where: {
          temaPrincipal: 'Derecho Urbanístico',
          estado: EstadoDocumento.PUBLICADO,
          eliminado: false,
        },
        select: {
          id: true,
          titulo: true,
          resumen: true,
          archivoOriginalUrl: true,
          fechaPublicacion: true,
        },
      });

      const bucketName = this.configService.get<string>('GCP_STORAGE_BUCKET_NAME');
      if (!bucketName) {
        throw new InternalServerErrorException('GCP_STORAGE_BUCKET_NAME no está configurado');
      }

      const prefix = `gs://${bucketName}/`;

      // Mapear los resultados al formato requerido
      return documentos.map(doc => {
        let gcpFileName = '';
        if (doc.archivoOriginalUrl && doc.archivoOriginalUrl.startsWith(prefix)) {
          gcpFileName = doc.archivoOriginalUrl.slice(prefix.length);
        } else {
          // Fallback por si la URL no tiene el formato esperado, aunque no debería ocurrir
          gcpFileName = doc.archivoOriginalUrl || '';
        }

        return {
          id: doc.id,
          titulo: doc.titulo,
          descripcion: doc.resumen || '',
          gcpFileName,
          fechaPublicacion: doc.fechaPublicacion || null,
        };
      });
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener los documentos de urbanismo');
    }
  }
}
