import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => {
  const actual = jest.requireActual('../../src/api/rankings');
  return {
    fetchRankings: jest.fn(),
    fetchRanking: jest.fn(),
    decodeEntities: actual.decodeEntities,
    curateRankingFiltros: actual.curateRankingFiltros,
  };
});
const { fetchRankings, fetchRanking } = require('../../src/api');
const RankingsScreen = require('../../src/screens/RankingsScreen').default;
const { T, navStub } = require('../helpers');

const SOLANET = {
  slug: 'solanet', nombre: 'Premio Emilio Solanet', familia: 'propietario',
  filtros: [{ param: 'premio', default: 1, opciones: [
    { value: 1, label: '2024 - 2025' }, { value: 2, label: '2025 - 2026' }, { value: 3, label: '2026 - 2027' },
  ] }],
};
const FRENO = {
  slug: 'freno', nombre: 'Freno de Oro — Ranking General', familia: 'individual',
  filtros: [
    { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', default: 24, opciones: [{ value: 23, label: 'Hembras' }, { value: 24, label: 'Machos' }] },
  ],
};
const CORRAL_GEN = {
  slug: 'corral_general', nombre: 'Corral de Aparte — Ranking General', familia: 'individual',
  filtros: [
    { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', default: 5, opciones: [{ value: 5, label: 'Libre' }, { value: 6, label: 'Novicios' }] },
  ],
};
const CORRAL_ANA = {
  slug: 'corral_analitico', nombre: 'Corral de Aparte — Ranking Analítico', familia: 'individual',
  filtros: [
    { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', default: 5, opciones: [{ value: 5, label: 'Libre' }, { value: 6, label: 'Novicios' }] },
  ],
};
const APARTE_GEN = {
  slug: 'apartes_general', nombre: 'Aparte Campero — Ranking General', familia: 'equipo',
  filtros: [
    { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', default: 15, opciones: [{ value: 15, label: 'A' }, { value: 29, label: 'B' }] },
  ],
};
const APARTE_ANA = {
  slug: 'apartes_analitico', nombre: 'Aparte Campero — Ranking Analítico', familia: 'equipo',
  filtros: [
    { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', default: 15, opciones: [{ value: 15, label: 'A' }, { value: 29, label: 'B' }] },
  ],
};
const RODEOS = {
  slug: 'rodeos', nombre: 'Rodeos — Ranking', familia: 'equipo',
  filtros: [
    { param: 'calendario', default: 22, opciones: [{ value: 22, label: '2025 - 2026' }, { value: 21, label: '2024 - 2025' }] },
    { param: 'tipo', default: 1, opciones: [{ value: 1, label: 'General' }, { value: 2, label: 'Handicap' }, { value: 3, label: 'Ranking C' }] },
  ],
};
// Paleteada: viene en el catálogo pero sin filtros; su detalle responde not_available.
const PALETEADA = { slug: 'paleteada', nombre: 'Paleteada Campera — Ranking', familia: 'equipo', filtros: [] };
const CATALOG = [SOLANET, FRENO, CORRAL_GEN, CORRAL_ANA, RODEOS, APARTE_ANA, APARTE_GEN, PALETEADA];
const FRENO_CLEAN = { ...FRENO, nombre: 'Freno de Oro' }; // sin "— Ranking General" en el landing
const RODEOS_CLEAN = { ...RODEOS, nombre: 'Rodeos' };      // sin "— Ranking"
const PALETEADA_CLEAN = { ...PALETEADA, nombre: 'Paleteada Campera' };

beforeEach(() => {
  fetchRankings.mockReset(); fetchRanking.mockReset();
  fetchRankings.mockResolvedValue({ data: CATALOG });
  fetchRanking.mockResolvedValue({ filas: [{ position: 1, name: 'MATHO GARAT, RICARDO D.', cabin: 'CABA&Ntilde;A LA ESTRELLA', points: '109.50' }] });
});

describe('RankingsScreen', () => {
  test('card de Solanet + tabs de año + disciplina (acordeón cerrado)', async () => {
    const { findByText, getByText, queryByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(await findByText('Premio E. Solanet')).toBeTruthy();
    expect(getByText('Edición 2025 - 2026')).toBeTruthy();
    expect(await findByText('MATHO GARAT, RICARDO D.')).toBeTruthy();
    expect(getByText('CABAÑA LA ESTRELLA')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy(); // tab de año
    expect(getByText('Freno de Oro')).toBeTruthy(); // sin "— Ranking General"
    expect(queryByText('Freno de Oro — Ranking General')).toBeNull();
    expect(queryByText('Machos')).toBeNull(); // categorías ocultas hasta expandir
  });

  test('tocar la card de Solanet navega con la temporada del año elegido', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    // Año 2026 (default) → temporada "2025 - 2026" (value 2, la más nueva tras curar)
    fireEvent.press(await findByText('Premio E. Solanet'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', { ranking: SOLANET, initialFilters: { premio: 2 } });
    // Cambiar a 2025 → temporada "2024 - 2025" (value 1)
    fireEvent.press(getByText('2025'));
    fireEvent.press(getByText('Premio E. Solanet'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', { ranking: SOLANET, initialFilters: { premio: 1 } });
  });

  test('Solanet 2027 abre su temporada (2026-2027), no pisa el detalle de 2026', async () => {
    // Con un tab de año 2027 presente, 2027 debe mapear a su temporada (value 3),
    // no caer al default y mostrar lo mismo que 2026 (value 2).
    const FRENO_2027 = { ...FRENO, filtros: [
      { param: 'anio', default: 2026, opciones: [{ value: 2027, label: '2027' }, { value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
      FRENO.filtros[1],
    ] };
    fetchRankings.mockResolvedValue({ data: [SOLANET, FRENO_2027] });
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    await findByText('Premio E. Solanet');
    fireEvent.press(getByText('2027')); // tab de año 2027
    fireEvent.press(getByText('Premio E. Solanet'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', { ranking: SOLANET, initialFilters: { premio: 3 } });
  });

  test('expandir una disciplina y tocar una categoría navega con año + categoría', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    fireEvent.press(await findByText('Freno de Oro')); // expande
    fireEvent.press(getByText('Machos')); // categoría
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO_CLEAN, initialFilters: { anio: 2026, categoria: 24 },
    }));
  });

  test('cambiar el año se propaga a la categoría abierta', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    await findByText('Freno de Oro');
    fireEvent.press(getByText('2025')); // tab de año
    fireEvent.press(getByText('Freno de Oro')); // expande
    fireEvent.press(getByText('Machos'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO_CLEAN, initialFilters: { anio: 2025, categoria: 24 },
    }));
  });

  test('cambiar el año cierra los accordions abiertos', async () => {
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(<RankingsScreen t={T} navigation={nav} />);
    fireEvent.press(await findByText('Freno de Oro')); // expande → categorías visibles
    expect(getByText('Machos')).toBeTruthy();
    fireEvent.press(getByText('2025')); // cambia de año
    expect(queryByText('Machos')).toBeNull(); // el accordion se cerró
  });

  test('Corral de Aparte es un solo item que agrupa General y Analítico', async () => {
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(<RankingsScreen t={T} navigation={nav} />);
    // Un solo item "Corral de Aparte" (no dos rankings sueltos)
    expect(await findByText('Corral de Aparte')).toBeTruthy();
    expect(queryByText('Corral de Aparte — Ranking General')).toBeNull();
    expect(queryByText('Ranking General')).toBeNull(); // sub-rankings ocultos

    // Abrir el grupo → aparecen los sub-rankings
    fireEvent.press(getByText('Corral de Aparte'));
    expect(getByText('Ranking General')).toBeTruthy();
    expect(getByText('Ranking Analítico')).toBeTruthy();
    expect(queryByText('Libre')).toBeNull(); // categorías aún ocultas

    // Abrir un sub-ranking → aparecen sus categorías
    fireEvent.press(getByText('Ranking General'));
    fireEvent.press(getByText('Libre'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: CORRAL_GEN, initialFilters: { anio: 2026, categoria: 5 },
    }));
  });

  test('Aparte Campero (equipo) también se agrupa en General y Analítico', async () => {
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(<RankingsScreen t={T} navigation={nav} />);
    expect(await findByText('Aparte Campero')).toBeTruthy();
    expect(queryByText('Aparte Campero — Ranking General')).toBeNull();

    fireEvent.press(getByText('Aparte Campero'));
    const generales = await findByText('Ranking General'); // aparece dentro del grupo
    expect(generales).toBeTruthy();
    fireEvent.press(getByText('Ranking Analítico'));
    fireEvent.press(getByText('B'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: APARTE_ANA, initialFilters: { anio: 2026, categoria: 29 },
    }));
  });

  test('Rodeos: mapea el año al calendario (campeonato) + tipo', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    expect(await findByText('Rodeos')).toBeTruthy(); // sin "— Ranking"
    fireEvent.press(getByText('Rodeos')); // expande → tipos
    fireEvent.press(getByText('Handicap'));
    // año 2026 (default) → calendario "2025 - 2026" (value 22)
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: RODEOS_CLEAN, initialFilters: { calendario: 22, tipo: 2 },
    }));
  });

  test('Rodeos: cambiar el año cambia el calendario', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    await findByText('Rodeos');
    fireEvent.press(getByText('2025')); // tab de año
    fireEvent.press(getByText('Rodeos'));
    fireEvent.press(getByText('General'));
    // año 2025 → calendario "2024 - 2025" (value 21)
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: RODEOS_CLEAN, initialFilters: { calendario: 21, tipo: 1 },
    }));
  });

  test('cambiar el año actualiza la temporada de Solanet y re-pide su 1°', async () => {
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    await findByText('Premio E. Solanet');
    expect(getByText('Edición 2025 - 2026')).toBeTruthy(); // año 2026 → temporada 2025-2026
    fireEvent.press(getByText('2025')); // tab de año
    await waitFor(() => expect(getByText('Edición 2024 - 2025')).toBeTruthy());
    expect(fetchRanking).toHaveBeenCalledWith('solanet', { premio: 1 });
  });

  test('Paleteada Campera (not_available) muestra "Próximamente" en el listado y no navega', async () => {
    // El detalle de paleteada responde not_available; el resto (solanet) normal.
    fetchRanking.mockImplementation((slug) => (slug === 'paleteada'
      ? Promise.resolve({ modo: 'not_available', filas: [] })
      : Promise.resolve({ filas: [{ position: 1, name: 'MATHO GARAT, RICARDO D.', cabin: 'X', points: '109.50' }] })));
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    expect(await findByText('Paleteada Campera')).toBeTruthy();
    await waitFor(() => expect(getByText('Próximamente')).toBeTruthy()); // badge tras el probe
    fireEvent.press(getByText('Paleteada Campera')); // no es clickeable
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('Corral (grupo con todos los sub-rankings not_available) figura como Próximamente y no expande', async () => {
    // El detalle de ambos corral responde not_available para el año; el resto normal.
    fetchRanking.mockImplementation((slug) => (String(slug).startsWith('corral')
      ? Promise.resolve({ modo: 'not_available', filas: [] })
      : Promise.resolve({ filas: [{ position: 1, name: 'X', cabin: 'Y', points: '1' }] })));
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(<RankingsScreen t={T} navigation={nav} />);
    expect(await findByText('Corral de Aparte')).toBeTruthy();
    await waitFor(() => expect(getByText('Próximamente')).toBeTruthy()); // badge tras el probe
    fireEvent.press(getByText('Corral de Aparte')); // no es clickeable → no expande
    expect(queryByText('Ranking General')).toBeNull();
  });

  test('tocar una categoría PDF abre el PDF directo, sin entrar al detalle', async () => {
    // El detalle de freno responde modo pdf; el resto (solanet) normal.
    fetchRanking.mockImplementation((slug) => (slug === 'freno'
      ? Promise.resolve({ modo: 'pdf', pdf_url: 'https://caballoscriollos.com/r/freno-machos.pdf', filas: [] })
      : Promise.resolve({ filas: [{ position: 1, name: 'X', cabin: 'Y', points: '1' }] })));
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    fireEvent.press(await findByText('Freno de Oro')); // expande
    fireEvent.press(getByText('Machos')); // categoría PDF
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://caballoscriollos.com/r/freno-machos.pdf'));
    expect(nav.navigate).not.toHaveBeenCalledWith('RankingCat', expect.anything());
    openSpy.mockRestore();
  });

  test('error muestra reintentar', async () => {
    fetchRankings.mockRejectedValue(new Error('net'));
    const { findByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
