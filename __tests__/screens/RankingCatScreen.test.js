import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchRanking: jest.fn(),
  decodeEntities: jest.requireActual('../../src/api/rankings').decodeEntities,
  curateRankingFiltros: jest.requireActual('../../src/api/rankings').curateRankingFiltros,
}));
const { fetchRanking } = require('../../src/api');
const RankingCatScreen = require('../../src/screens/RankingCatScreen').default;
const { T, navStub, routeStub } = require('../helpers');

const FRENO = {
  slug: 'freno', nombre: 'Freno de Oro — Ranking General', familia: 'individual',
  filtros: [
    { param: 'anio', label: 'Año', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
    { param: 'categoria', label: 'Categoría', default: 24, opciones: [{ value: 23, label: 'Hembras' }, { value: 24, label: 'Machos' }] },
  ],
};
const RESP = {
  titulo: 'Freno de Oro', subtitulo: 'Machos',
  columnas: [
    { key: 'position', label: '#' }, { key: 'sba', label: 'SBA' },
    { key: 'animal', label: 'Animal' }, { key: 'points', label: 'Puntaje' },
  ],
  filas: [{ position: 1, animalId: 'pdre:1000', sba: '3501 D', animal: 'CARDAL X', points: 87.5 }],
};

beforeEach(() => { fetchRanking.mockReset(); fetchRanking.mockResolvedValue(RESP); });

const renderCat = (nav = navStub()) =>
  render(<RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: FRENO })} />);

describe('RankingCatScreen', () => {
  test('pide el ranking con los filtros default y renderiza la fila compacta', async () => {
    const { findByText, getByText } = renderCat();
    expect(await findByText('CARDAL X')).toBeTruthy();
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2026, categoria: 24 });
    expect(getByText(/SBA 3501 D/)).toBeTruthy(); // columna secundaria
    expect(getByText('87.5')).toBeTruthy();        // puntaje
  });

  test('usa los initialFilters (año + categoría) por sobre los defaults', async () => {
    const { findByText } = render(
      <RankingCatScreen t={T} navigation={navStub()} route={routeStub({ ranking: FRENO, initialFilters: { anio: 2025, categoria: 23 } })} />,
    );
    await findByText('CARDAL X');
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2025, categoria: 23 });
  });

  test('cambiar un filtro re-pide con el nuevo valor', async () => {
    const { findByText, getByText } = renderCat();
    await findByText('CARDAL X');
    fireEvent.press(getByText('Hembras'));
    await waitFor(() => expect(fetchRanking).toHaveBeenLastCalledWith('freno', { anio: 2026, categoria: 23 }));
  });

  test('tocar una fila con animalId abre HorseDetail', async () => {
    const nav = navStub();
    const { findByText } = renderCat(nav);
    fireEvent.press(await findByText('CARDAL X'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:1000' });
  });

  test('decodifica entidades HTML (Ñ) en las filas', async () => {
    fetchRanking.mockResolvedValue({
      columnas: [{ key: 'position', label: '#' }, { key: 'name', label: 'Propietario' }, { key: 'points', label: 'Puntos' }],
      filas: [{ position: 1, name: 'CABA&Ntilde;A LA ESTRELLA', points: '109.50' }],
    });
    const { findByText } = renderCat();
    expect(await findByText('CABAÑA LA ESTRELLA')).toBeTruthy();
  });

  test('solanet: tocar una fila abre el detalle del propietario', async () => {
    const SOLANET = {
      slug: 'solanet', nombre: 'Premio Emilio Solanet', familia: 'propietario',
      filtros: [{ param: 'premio', default: 1, opciones: [
        { value: 1, label: '2024 - 2025' }, { value: 2, label: '2025 - 2026' }, { value: 3, label: '2026 - 2027' },
      ] }],
    };
    fetchRanking.mockResolvedValue({
      columnas: [{ key: 'position', label: '#' }, { key: 'propertyNumber', label: 'Nro' }, { key: 'name', label: 'Propietario' }, { key: 'points', label: 'Puntos' }],
      filas: [{ position: 1, propertyNumber: '221', name: 'MATHO GARAT, RICARDO D.', points: '109.50' }],
    });
    const nav = navStub();
    const { findByText } = render(<RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: SOLANET })} />);
    fireEvent.press(await findByText('MATHO GARAT, RICARDO D.'));
    expect(nav.navigate).toHaveBeenCalledWith('SolanetDetalle', { premio: 2, propietario: '221', nombre: 'MATHO GARAT, RICARDO D.', points: '109.50' });
  });

  test('sin filas muestra empty state', async () => {
    fetchRanking.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderCat();
    expect(await findByText(/No hay datos/)).toBeTruthy();
  });
});
