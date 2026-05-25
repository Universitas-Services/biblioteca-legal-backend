import { EstadoDocumento } from '@prisma/client';

export class DocumentoEstadoCambiadoEvent {
  constructor(
    public readonly documentoId: string,
    public readonly estadoAnterior: EstadoDocumento,
    public readonly estadoNuevo: EstadoDocumento,
  ) {}
}

export const DOCUMENTO_ESTADO_CAMBIADO = 'documento.estado-cambiado';
