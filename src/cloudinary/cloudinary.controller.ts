import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Imagenes (Cloudinary)')
@ApiBearerAuth()
@Controller('admin/imagenes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CloudinaryController {
  private readonly logger = new Logger(CloudinaryController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir una imagen a un módulo de negocio en Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Carpeta o módulo destino en Cloudinary (ej: usuarios, logos)',
          default: 'general',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (Máximo 5MB. Formatos: jpeg, jpg, png, webp)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // Límite de 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const targetFolder = folder || 'general';
    this.logger.log(`Recibida petición para subir imagen a la carpeta: ${targetFolder}`);

    const result = await this.cloudinaryService.uploadImage(file, targetFolder);

    return {
      mensaje: 'Imagen subida exitosamente',
      url: result.secure_url,
      publicId: result.public_id,
      formato: result.format,
      bytes: result.bytes,
    };
  }
}
