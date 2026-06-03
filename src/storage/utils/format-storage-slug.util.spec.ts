import { formatStorageSlug } from './format-storage-slug.util';

describe('formatStorageSlug', () => {
  it('normaliza texto a slug', () => {
    expect(formatStorageSlug('Ley Orgánica')).toBe('ley-organica');
    expect(formatStorageSlug('Derecho Civil')).toBe('derecho-civil');
  });
});
