import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

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
  test('pide el ranking con los filtros default y muestra el resumen en el subtítulo', async () => {
    const { findByText, getByText } = renderCat();
    expect(await findByText('CARDAL X')).toBeTruthy();
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2026, categoria: 24 });
    expect(getByText('Año: 2026 - Categoría: Machos')).toBeTruthy(); // subtítulo desde los filtros fijos
    expect(getByText(/SBA 3501 D/)).toBeTruthy(); // columna secundaria
    expect(getByText('87.5')).toBeTruthy();        // puntaje
  });

  test('usa los initialFilters (año + categoría) por sobre los defaults', async () => {
    const { findByText, getByText } = render(
      <RankingCatScreen t={T} navigation={navStub()} route={routeStub({ ranking: FRENO, initialFilters: { anio: 2025, categoria: 23 } })} />,
    );
    await findByText('CARDAL X');
    expect(fetchRanking).toHaveBeenCalledWith('freno', { anio: 2025, categoria: 23 });
    expect(getByText('Año: 2025 - Categoría: Hembras')).toBeTruthy();
  });

  test('no muestra chips para cambiar año ni categoría', async () => {
    const { findByText, queryByText } = renderCat();
    await findByText('CARDAL X');
    expect(queryByText('Hembras')).toBeNull();
    expect(queryByText('2025')).toBeNull();
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

  test('ranking de equipo: lista los animales del equipo y linkea al pedigree', async () => {
    const APARTES = {
      slug: 'apartes_general', nombre: 'Aparte Campero — Ranking General', familia: 'equipo',
      filtros: [
        { param: 'anio', default: 2026, opciones: [{ value: 2026, label: '2026' }, { value: 2025, label: '2025' }] },
        { param: 'categoria', default: 15, opciones: [{ value: 15, label: 'A' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      columnas: [
        { key: 'position', label: '#' }, { key: 'equipo', label: 'Equipo' },
        { key: 'total', label: 'Total' },
      ],
      filas: [{
        position: 1, equipo: 'los orejanos.', total: '01:46',
        animales: [
          { sba: '67698', nombre: 'OREVA CARAMELO', jinete: 'ALEJANDRO RYAN', animalId: 'pdre:70970' },
          { sba: '75781', nombre: 'BROCAL PUESTERO', jinete: 'IGNACIO AGUIRRE', animalId: 'pdre:80428' },
        ],
      }],
    });
    const nav = navStub();
    const { findByText, getByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: APARTES, initialFilters: { anio: 2026, categoria: 15 } })} />,
    );
    expect(await findByText('los orejanos.')).toBeTruthy();      // nombre del equipo
    expect(getByText('Aparte Campero')).toBeTruthy();            // header: disciplina
    expect(getByText('Ranking General')).toBeTruthy();           // header: sub-ranking
    expect(getByText('Año: 2026 - Categoría: A')).toBeTruthy();  // header: selección
    expect(getByText('OREVA CARAMELO')).toBeTruthy();            // miembro
    fireEvent.press(getByText('BROCAL PUESTERO'));               // tocar miembro
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'pdre:80428' });
    expect(fetchRanking).toHaveBeenCalledWith('apartes_general', { anio: 2026, categoria: 15 });
  });

  test('rodeos: subtítulo del campeonato viene de la API y usa la yunta (animals)', async () => {
    const RODEOS = {
      slug: 'rodeos', nombre: 'Rodeos — Ranking', familia: 'equipo',
      filtros: [
        { param: 'calendario', default: 22, opciones: [{ value: 22, label: '2024 - 2025' }] },
        { param: 'tipo', default: 1, opciones: [{ value: 1, label: 'General' }] },
      ],
    };
    fetchRanking.mockResolvedValue({
      subtitulo: '57° CAMPEONATO NACIONAL\\nRANKING GENERAL', // barra-n literal, como la API
      columnas: [
        { key: 'position', label: '#' },
        { key: 'totalPointsObtained', label: 'Puntos obtenidos' },
        { key: 'totalPointsRanking', label: 'Puntos ranking' },
      ],
      filas: [{
        position: 1, totalPointsObtained: 148, totalPointsRanking: '95.00',
        animals: [{ sba: '87399', name: 'CONTRAFUEGO TEJEDORA', rider: 'SANTIAGO GABRIELLI', animalId: 'exis:105929' }],
      }],
    });
    const nav = navStub();
    const { findByText, getByText, queryByText } = render(
      <RankingCatScreen t={T} navigation={nav} route={routeStub({ ranking: RODEOS, initialFilters: { tipo: 2 } })} />,
    );
    expect(await findByText('CONTRAFUEGO TEJEDORA')).toBeTruthy();
    expect(getByText('57° CAMPEONATO NACIONAL · RANKING GENERAL')).toBeTruthy(); // subtítulo sin \n literal
    expect(getByText('95.00')).toBeTruthy(); // puntaje desde totalPointsRanking
    expect(getByText('Puntos ranking')).toBeTruthy(); // etiqueta bajo el puntaje prominente
    expect(queryByText(/Puntos obtenidos/)).toBeNull(); // oculto por ahora
    fireEvent.press(getByText('CONTRAFUEGO TEJEDORA'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:105929' });
    expect(fetchRanking).toHaveBeenCalledWith('rodeos', { calendario: 22, tipo: 2 });
  });

  test('sin filas muestra empty state', async () => {
    fetchRanking.mockResolvedValue({ columnas: [], filas: [] });
    const { findByText } = renderCat();
    expect(await findByText(/No hay datos/)).toBeTruthy();
  });
});
