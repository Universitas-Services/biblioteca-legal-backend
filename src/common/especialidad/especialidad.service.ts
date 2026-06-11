import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  puedeAccederTemaPrincipal,
  ROLES_CON_ESPECIALIDAD_OBLIGATORIA,
  TEMA_ESPECIALIDAD_GENERAL_NOMBRE,
  TEMA_ESPECIALIDAD_GENERAL_SLUG,
  tieneEspecialidadGeneral,
  TemaAsignadoRef,
} from '../constants/tema-especialidad.constants';

@Injectable()
export class EspecialidadService {
  constructor(private prisma: PrismaService) {}

  requiereEspecialidades(role: Role): boolean {
    return (ROLES_CON_ESPECIALIDAD_OBLIGATORIA as readonly string[]).includes(role);
  }

  /**
   * Garantiza que exista el tema "General" en catálogo (especialidad transversal).
   */
  async ensureTemaGeneralEnCatalogo() {
    const existente = await this.prisma.client.temaPrincipal.findUnique({
      where: { slug: TEMA_ESPECIALIDAD_GENERAL_SLUG },
    });
    if (existente) return existente;

    const bucket = process.env.GCP_STORAGE_BUCKET_NAME ?? 'biblioteca-legal';
    return this.prisma.client.temaPrincipal.create({
      data: {
        nombre: TEMA_ESPECIALIDAD_GENERAL_NOMBRE,
        slug: TEMA_ESPECIALIDAD_GENERAL_SLUG,
        gcsUri: `gs://${bucket}/tema-principal/${TEMA_ESPECIALIDAD_GENERAL_SLUG}/`,
      },
    });
  }

  async listarEspecialidadesDisponibles() {
    await this.ensureTemaGeneralEnCatalogo();
    return this.prisma.client.temaPrincipal.findMany({
      orderBy: [{ nombre: 'asc' }],
      where: { eliminado: false },
      select: { id: true, nombre: true, slug: true },
    });
  }

  async getTemasAsignadosUsuario(userId: string): Promise<TemaAsignadoRef[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { temasAsignados: { select: { slug: true, nombre: true } } },
    });
    return user?.temasAsignados ?? [];
  }

  assertStaffTieneEspecialidades(role: Role, temaIds?: string[]) {
    if (!this.requiereEspecialidades(role)) return;
    if (!temaIds?.length) {
      throw new BadRequestException(
        'Se requiere al menos una especialidad (temaIds) para los roles CURADOR y REVISOR. ' +
          'Use el tema "General" para acceso a todas las áreas.',
      );
    }
  }

  async assertCuradorPuedeSubirTema(curadorId: string, temaPrincipal: string) {
    const temas = await this.getTemasAsignadosUsuario(curadorId);
    if (temas.length === 0) {
      throw new ForbiddenException(
        'El curador no tiene especialidades asignadas. Contacte al administrador.',
      );
    }
    if (!puedeAccederTemaPrincipal(temas, temaPrincipal)) {
      throw new ForbiddenException(
        `No tiene permiso para cargar documentos en el tema "${temaPrincipal}". ` +
          'Asigne la especialidad correspondiente o "General".',
      );
    }
  }

  async assertRevisorPuedeGestionarDocumento(revisorId: string, documentoId: string) {
    const [temas, documento, user] = await Promise.all([
      this.getTemasAsignadosUsuario(revisorId),
      this.prisma.client.documento.findFirst({
        where: { id: documentoId, eliminado: false },
        select: { revisorAsignadoId: true, temaPrincipal: true },
      }),
      this.prisma.client.user.findUnique({
        where: { id: revisorId },
        select: { role: true },
      }),
    ]);

    if (!documento) return;

    if (user?.role === Role.ADMIN) return;

    if (tieneEspecialidadGeneral(temas)) return;

    if (documento.revisorAsignadoId === revisorId) return;

    if (documento.temaPrincipal && puedeAccederTemaPrincipal(temas, documento.temaPrincipal)) {
      return;
    }

    throw new ForbiddenException(
      'No tiene permiso para revisar este documento. Requiere la especialidad del tema, "General", o rol ADMIN.',
    );
  }

  async revisorTieneAccesoGeneral(revisorId: string): Promise<boolean> {
    const temas = await this.getTemasAsignadosUsuario(revisorId);
    return tieneEspecialidadGeneral(temas);
  }
}
