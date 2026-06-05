import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMetadataDto } from './dto/create-metadata.dto';
import { UpdateMetadataDto } from './dto/update-metadata.dto';

@Injectable()
export class MetadatasService {
  constructor(private prisma: PrismaService) {}

  async create(createMetadataDto: CreateMetadataDto) {
    // Verificar si el documento existe
    const documentoExists = await this.prisma.client.documento.findUnique({
      where: { id: createMetadataDto.documentoId },
    });
    if (!documentoExists) {
      throw new NotFoundException(
        `Documento con ID ${createMetadataDto.documentoId} no encontrado`,
      );
    }

    // Verificar si ya existe metadata para este documento
    const existingMetadata = await this.prisma.client.metadata.findUnique({
      where: { documentoId: createMetadataDto.documentoId },
    });

    if (existingMetadata) {
      throw new BadRequestException(
        `Ya existe metadata para el documento con ID ${createMetadataDto.documentoId}`,
      );
    }

    return this.prisma.client.metadata.create({
      data: {
        documentoId: createMetadataDto.documentoId,
        temaPrincipal: createMetadataDto.temaPrincipal,
        tipoDocumento: createMetadataDto.tipoDocumento,
        tipoNorma: createMetadataDto.tipoNorma,
        enteEmisor: createMetadataDto.enteEmisor,
        fechaPublicacion: createMetadataDto.fechaPublicacion
          ? new Date(createMetadataDto.fechaPublicacion)
          : null,
        numeroGaceta: createMetadataDto.numeroGaceta,
        ambitoTerritorial: createMetadataDto.ambitoTerritorial,
        pais: createMetadataDto.pais,
      },
    });
  }

  findAll() {
    return this.prisma.client.metadata.findMany();
  }

  async findOne(id: string) {
    const metadata = await this.prisma.client.metadata.findUnique({
      where: { id },
    });
    if (!metadata) {
      throw new NotFoundException(`Metadata con ID ${id} no encontrada`);
    }
    return metadata;
  }

  async findByDocumentoId(documentoId: string) {
    const metadata = await this.prisma.client.metadata.findUnique({
      where: { documentoId },
    });
    if (!metadata) {
      throw new NotFoundException(`Metadata para el documento con ID ${documentoId} no encontrada`);
    }
    return metadata;
  }

  async update(id: string, updateMetadataDto: UpdateMetadataDto) {
    const metadata = await this.prisma.client.metadata.findUnique({ where: { id } });
    if (!metadata) {
      throw new NotFoundException(`Metadata con ID ${id} no encontrada`);
    }

    const { fechaPublicacion, ...rest } = updateMetadataDto;
    const updateData = {
      ...rest,
      ...(fechaPublicacion ? { fechaPublicacion: new Date(fechaPublicacion) } : {}),
    };

    return this.prisma.client.metadata.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const metadata = await this.prisma.client.metadata.findUnique({ where: { id } });
    if (!metadata) {
      throw new NotFoundException(`Metadata con ID ${id} no encontrada`);
    }
    return this.prisma.client.metadata.delete({
      where: { id },
    });
  }
}
