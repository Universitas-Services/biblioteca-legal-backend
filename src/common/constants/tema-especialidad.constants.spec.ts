import {
  puedeAccederTemaPrincipal,
  TEMA_ESPECIALIDAD_GENERAL_NOMBRE,
  TEMA_ESPECIALIDAD_GENERAL_SLUG,
  tieneEspecialidadGeneral,
} from './tema-especialidad.constants';

describe('tema-especialidad.constants', () => {
  it('detecta especialidad General por slug', () => {
    expect(
      tieneEspecialidadGeneral([{ slug: TEMA_ESPECIALIDAD_GENERAL_SLUG, nombre: 'Otro' }]),
    ).toBe(true);
  });

  it('permite cualquier tema con General', () => {
    expect(
      puedeAccederTemaPrincipal(
        [{ slug: TEMA_ESPECIALIDAD_GENERAL_SLUG, nombre: TEMA_ESPECIALIDAD_GENERAL_NOMBRE }],
        'Derecho Penal',
      ),
    ).toBe(true);
  });

  it('restringe por nombre de tema sin General', () => {
    const temas = [{ slug: 'derecho-civil', nombre: 'Derecho Civil' }];
    expect(puedeAccederTemaPrincipal(temas, 'Derecho Civil')).toBe(true);
    expect(puedeAccederTemaPrincipal(temas, 'Derecho Penal')).toBe(false);
  });
});
