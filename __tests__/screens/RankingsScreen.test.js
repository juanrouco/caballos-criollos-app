import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

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
    { param: 'calendario', default: 22, opciones: [{ value: 22, label: '2024 - 2025' }, { value: 8, label: '2012 - 2013' }] },
    { param: 'tipo', default: 1, opciones: [{ value: 1, label: 'General' }, { value: 2, label: 'Handicap' }, { value: 3, label: 'Ranking C' }] },
  ],
};
const CATALOG = [SOLANET, FRENO, CORRAL_GEN, CORRAL_ANA, RODEOS, APARTE_ANA, APARTE_GEN];
const FRENO_CLEAN = { ...FRENO, nombre: 'Freno de Oro' }; // sin "— Ranking General" en el landing
const RODEOS_CLEAN = { ...RODEOS, nombre: 'Rodeos' };      // sin "— Ranking"

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

  test('tocar la card de Solanet navega a su ranking', async () => {
    const nav = navStub();
    const { findByText } = render(<RankingsScreen t={T} navigation={nav} />);
    fireEvent.press(await findByText('Premio E. Solanet'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', { ranking: SOLANET });
  });

  test('expandir una disciplina y tocar una categoría navega con año + categoría', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    fireEvent.press(await findByText('Freno de Oro')); // expande
    fireEvent.press(getByText('Machos')); // categoría
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO_CLEAN, initialFilters: { anio: 2026, categoria: 24 },
    });
  });

  test('cambiar el año se propaga a la categoría abierta', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    await findByText('Freno de Oro');
    fireEvent.press(getByText('2025')); // tab de año
    fireEvent.press(getByText('Freno de Oro')); // expande
    fireEvent.press(getByText('Machos'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO_CLEAN, initialFilters: { anio: 2025, categoria: 24 },
    });
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
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: CORRAL_GEN, initialFilters: { anio: 2026, categoria: 5 },
    });
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
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: APARTE_ANA, initialFilters: { anio: 2026, categoria: 29 },
    });
  });

  test('Rodeos: item único que abre los tipos (sin año, con calendario default)', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    expect(await findByText('Rodeos')).toBeTruthy(); // sin "— Ranking"
    fireEvent.press(getByText('Rodeos')); // expande → tipos
    fireEvent.press(getByText('Handicap'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: RODEOS_CLEAN, initialFilters: { tipo: 2 }, // rodeos no usa año
    });
  });

  test('cambiar el año actualiza la temporada de Solanet y re-pide su 1°', async () => {
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    await findByText('Premio E. Solanet');
    expect(getByText('Edición 2025 - 2026')).toBeTruthy(); // año 2026 → temporada 2025-2026
    fireEvent.press(getByText('2025')); // tab de año
    await waitFor(() => expect(getByText('Edición 2024 - 2025')).toBeTruthy());
    expect(fetchRanking).toHaveBeenLastCalledWith('solanet', { premio: 1 });
  });

  test('anuncia "Paleteada campera" como Próximamente', async () => {
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(await findByText('Paleteada campera')).toBeTruthy();
    expect(getByText('Próximamente')).toBeTruthy();
  });

  test('error muestra reintentar', async () => {
    fetchRankings.mockRejectedValue(new Error('net'));
    const { findByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
