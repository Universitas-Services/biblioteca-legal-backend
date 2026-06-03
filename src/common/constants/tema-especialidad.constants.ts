/** Slug del tema "General": acceso a cualquier área temática. */
export const TEMA_ESPECIALIDAD_GENERAL_SLUG = 'general';

/** Nombre mostrado en catálogo y en documento.temaPrincipal cuando aplica. */
export const TEMA_ESPECIALIDAD_GENERAL_NOMBRE = 'General';

export const ROLES_CON_ESPECIALIDAD_OBLIGATORIA = ['CURADOR', 'REVISOR'] as const;

export type TemaAsignadoRef = { slug: string; nombre: string };

export function tieneEspecialidadGeneral(temas: TemaAsignadoRef[]): boolean {
  return temas.some(
    t =>
      t.slug === TEMA_ESPECIALIDAD_GENERAL_SLUG ||
      t.nombre.toLowerCase() === TEMA_ESPECIALIDAD_GENERAL_NOMBRE.toLowerCase(),
  );
}

export function puedeAccederTemaPrincipal(
  temas: TemaAsignadoRef[],
  temaPrincipalDocumento: string,
): boolean {
  if (tieneEspecialidadGeneral(temas)) return true;
  const normalizado = temaPrincipalDocumento.trim().toLowerCase();
  return temas.some(t => t.nombre.trim().toLowerCase() === normalizado);
}
