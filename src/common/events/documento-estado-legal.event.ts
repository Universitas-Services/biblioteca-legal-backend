import { EstadoLegal } from '@prisma/client';

export const DOCUMENTO_ESTADO_LEGAL_CAMBIADO = 'documento.estado_legal_cambiado';

export class DocumentoEstadoLegalCambiadoEvent {
  constructor(
    public readonly documentoId: string,
    public readonly estadoAnterior: EstadoLegal | null,
    public readonly estadoNuevo: EstadoLegal,
  ) {}
}
