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
const CATALOG = [SOLANET, FRENO];

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
    expect(getByText('Freno de Oro — Ranking General')).toBeTruthy();
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
    fireEvent.press(await findByText('Freno de Oro — Ranking General')); // expande
    fireEvent.press(getByText('Machos')); // categoría
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO, initialFilters: { anio: 2026, categoria: 24 },
    });
  });

  test('cambiar el año se propaga a la categoría abierta', async () => {
    const nav = navStub();
    const { findByText, getByText } = render(<RankingsScreen t={T} navigation={nav} />);
    await findByText('Freno de Oro — Ranking General');
    fireEvent.press(getByText('2025')); // tab de año
    fireEvent.press(getByText('Freno de Oro — Ranking General')); // expande
    fireEvent.press(getByText('Machos'));
    expect(nav.navigate).toHaveBeenCalledWith('RankingCat', {
      ranking: FRENO, initialFilters: { anio: 2025, categoria: 24 },
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

  test('error muestra reintentar', async () => {
    fetchRankings.mockRejectedValue(new Error('net'));
    const { findByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
  });
});
