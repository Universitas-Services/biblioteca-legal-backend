import { Profesion } from '@prisma/client';

/** Mapeo Profesion del muro → temaPrincipal para dashboard */
export const PROFESION_TEMA_MAP: Record<Profesion, string> = {
  [Profesion.ABOGADO]: 'Derecho Civil',
  [Profesion.NOTARIO]: 'Derecho Notarial',
  [Profesion.JUEZ]: 'Derecho Procesal',
  [Profesion.FISCAL]: 'Derecho Penal',
  [Profesion.DEFENSOR]: 'Derecho Penal',
  [Profesion.ESTUDIANTE_DERECHO]: 'Derecho Constitucional',
  [Profesion.ACADEMICO]: 'Derecho Constitucional',
  [Profesion.CONSULTOR_LEGAL]: 'Derecho Mercantil',
  [Profesion.OTRO]: 'Derecho General',
};
