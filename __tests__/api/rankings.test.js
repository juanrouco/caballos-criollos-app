import { decodeEntities, curateRankingFiltros } from '../../src/api/rankings';

describe('decodeEntities', () => {
  test('decodifica entidades nombradas comunes', () => {
    expect(decodeEntities('CABA&Ntilde;A LA ESTRELLA')).toBe('CABAÑA LA ESTRELLA');
    expect(decodeEntities('Mart&iacute;n')).toBe('Martín');
    expect(decodeEntities('a &amp; b')).toBe('a & b');
  });

  test('decodifica numéricas (decimal y hex)', () => {
    expect(decodeEntities('&#209;')).toBe('Ñ');
    expect(decodeEntities('&#xD1;')).toBe('Ñ');
  });

  test('deja lo desconocido intacto; null/undefined passthrough', () => {
    expect(decodeEntities('a &foo; b')).toBe('a &foo; b');
    expect(decodeEntities(null)).toBeNull();
    expect(decodeEntities(undefined)).toBeUndefined();
  });
});

describe('curateRankingFiltros', () => {
  const solanet = () => ({
    slug: 'solanet',
    filtros: [{
      param: 'premio', label: 'Premio', default: 1,
      opciones: [
        { value: 1, label: '2024 - 2025' },
        { value: 2, label: '2025 - 2026' },
        { value: 3, label: '2026 - 2027' },
      ],
    }],
  });

  test('solanet: temporadas más nueva primero, sin ocultar ninguna, default a la primera', () => {
    // No se oculta 2026-2027: hay tab de año 2027 y cada año debe mapear a su
    // temporada; ocultarla haría que 2027 caiga al default y pise el detalle de 2026.
    const { filtros } = curateRankingFiltros(solanet());
    const premio = filtros[0];
    expect(premio.opciones.map((o) => o.label)).toEqual(['2026 - 2027', '2025 - 2026', '2024 - 2025']);
    expect(premio.default).toBe(3); // 2026-2027 (la más nueva)
  });

  test('fzb: fuerza default año 2026 y categoría "A" (por label)', () => {
    const fzb = {
      slug: 'fzb',
      filtros: [
        { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
        { param: 'categoria', default: 15, opciones: [{ value: 6, label: 'A' }, { value: 7, label: 'B' }] },
      ],
    };
    const { filtros } = curateRankingFiltros(fzb);
    expect(filtros.find((f) => f.param === 'anio').default).toBe(2026);
    expect(filtros.find((f) => f.param === 'categoria').default).toBe(6); // "A"
  });

  test('otros rankings quedan intactos', () => {
    const freno = { slug: 'freno', filtros: [{ param: 'anio', opciones: [{ value: 2026, label: '2026' }] }] };
    expect(curateRankingFiltros(freno)).toBe(freno);
  });
});
