import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchResultadoDetalle: jest.fn(),
}));

import ResultDetailScreen from '../../src/screens/ResultDetailScreen';
import { fetchResultadoDetalle } from '../../src/api';

const { T, navStub, routeStub } = require('../helpers');

const PARAMS = {
  eventoId: 2159,
  prueba: 'fzb',
  pruebaNombre: 'F.Z.B.',
  categoriaTitle: 'Categoría C Inicial · Clasificatoria',
  resultado: {
    puesto: 1,
    total: 45,
    animal: {
      id: 'exis:117453', box: 45, nombre: 'CRUZ DIABLO LA TARDECITA',
      sba: 95832, rp: 294, sexo: 'H', fecha_nacimiento: '2016-11-04',
      pelaje: 'LOBUNO\r', cabania: 'LA BAGUALA',
      jinete: { id: 6182, nombre: 'MARTIN FELIX', apellido: 'CRESPO' },
    },
  },
};

const DETALLE_RESP = {
  prueba: { id: 1, nombre: 'F.Z.B.' },
  total: 45,
  detalle: {
    rubros: {
      morfologia: 0, andares: 6.5, rayada: 6, troya: 7, ocho: 7.5,
      volapie: 4.5, vuelta: 5.5, desmontar: 3, retroceso: 5,
    },
    total: 45,
  },
};

beforeEach(() => {
  fetchResultadoDetalle.mockReset();
  fetchResultadoDetalle.mockResolvedValue(DETALLE_RESP);
});

describe('ResultDetailScreen', () => {
  test('muestra prueba, categoría, puesto, puntaje y la ficha del animal', async () => {
    const { getByText, findByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub(PARAMS)} />,
    );
    expect(getByText('F.Z.B.')).toBeTruthy();
    expect(getByText('Categoría C Inicial · Clasificatoria')).toBeTruthy();
    expect(getByText('1°')).toBeTruthy();
    expect(getByText('1° de la categoría')).toBeTruthy();
    expect(getByText('PUNTOS')).toBeTruthy();
    expect(getByText('CRUZ DIABLO LA TARDECITA')).toBeTruthy();
    expect(getByText('S.B.A. 95832 · R.P. 294')).toBeTruthy();
    expect(getByText('H · Nac. 04/11/2016 · LOBUNO')).toBeTruthy();
    // Datos de la corrida
    await findByText('Cabaña');
    expect(getByText('LA BAGUALA')).toBeTruthy();
    expect(getByText('Jinete')).toBeTruthy();
    expect(getByText('MARTIN FELIX CRESPO')).toBeTruthy();
  });

  test('pide el desagregado y muestra la planilla con los 9 rubros y el total', async () => {
    const { findByText, getByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub(PARAMS)} />,
    );
    expect(await findByText('Planilla')).toBeTruthy();
    expect(fetchResultadoDetalle).toHaveBeenCalledWith(2159, 'fzb', 'exis:117453');
    expect(getByText('Morfología')).toBeTruthy();
    expect(getByText('Andares')).toBeTruthy();
    expect(getByText('6.5')).toBeTruthy();
    expect(getByText('Volapié')).toBeTruthy();
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('Vuelta s/patas')).toBeTruthy();
    expect(getByText('Desmontar y montar')).toBeTruthy();
    expect(getByText('Retroceso')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
  });

  test('si el desagregado falla, la pantalla sigue mostrando el resto', async () => {
    fetchResultadoDetalle.mockRejectedValueOnce(new Error('500'));
    const { findByText, queryByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub(PARAMS)} />,
    );
    await findByText('Cabaña');
    expect(queryByText('Planilla')).toBeNull();
  });

  test('tocar la ficha del animal abre HorseDetail (pedigree)', async () => {
    const nav = navStub();
    const { getByText, findByText } = render(
      <ResultDetailScreen t={T} navigation={nav} route={routeStub(PARAMS)} />,
    );
    await findByText('Planilla');
    fireEvent.press(getByText('Ver pedigree'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', { id: 'exis:117453' });
  });

  test('corral de aparte (Final): planilla por días con las 3 vacas, morfología y totales', async () => {
    fetchResultadoDetalle.mockResolvedValueOnce({
      prueba: { id: 3, nombre: 'Corral de aparte' },
      clasificacion: 'Final',
      total: 36.5,
      detalle: {
        rondas: [
          {
            ronda: 1,
            apartes: [
              { aparte: 8, apretadas: [1, 2], subtotal: 11 },
              { aparte: 6.5, apretadas: [0, 2], subtotal: 8.5 },
              { aparte: 0, apretadas: [0, 0], subtotal: 0 },
            ],
            morfologia: 0, total: 19.5, puesto: null,
          },
          {
            ronda: 2,
            apartes: [{ aparte: 6, apretadas: [3, 1], subtotal: 10 }],
            morfologia: null, total: 17, puesto: null,
          },
          {
            // Ronda sin nada corrido → no se muestra.
            ronda: 3,
            apartes: [{ aparte: null, apretadas: [null, null], subtotal: null }],
            morfologia: null, total: 0, puesto: null,
          },
        ],
        total: 36.5,
      },
    });
    const { findByText, getByText, queryByText, getAllByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub({ ...PARAMS, prueba: 'corral_aparte' })} />,
    );
    expect(await findByText('Planilla')).toBeTruthy();
    expect(fetchResultadoDetalle).toHaveBeenCalledWith(2159, 'corral_aparte', 'exis:117453');
    // Nomenclatura de la planilla del admin: Día N y N° Vaca.
    expect(getByText('Día 1')).toBeTruthy();
    expect(getByText('19.5')).toBeTruthy();            // total del día 1
    expect(getAllByText('1° Vaca').length).toBe(2);    // una por día corrido
    expect(getByText('Aparte y mant. 8 · Apretar 1 · Apretar 2')).toBeTruthy();
    expect(getByText('11')).toBeTruthy();              // total de la vaca
    expect(getByText('Morfología')).toBeTruthy();
    expect(getByText('Día 2')).toBeTruthy();
    expect(queryByText('Día 3')).toBeNull();           // sin corrida, filtrado
    expect(getByText('Total final')).toBeTruthy();
    expect(getByText('36.5')).toBeTruthy();
  });

  test('corral clasificatoria: oculta la 3° vaca y la morfología', async () => {
    fetchResultadoDetalle.mockResolvedValueOnce({
      prueba: { id: 3, nombre: 'Corral de aparte' },
      clasificacion: 'Clasificatoria',
      total: 19.5,
      detalle: {
        rondas: [{
          ronda: 1,
          apartes: [
            { aparte: 8, apretadas: [1, 2], subtotal: 11 },
            { aparte: 6.5, apretadas: [0, 2], subtotal: 8.5 },
            { aparte: 0, apretadas: [0, 0], subtotal: 0 },
          ],
          morfologia: 0, total: 19.5, puesto: null,
        }],
        total: 19.5,
      },
    });
    const { findByText, getByText, queryByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub({ ...PARAMS, prueba: 'corral_aparte' })} />,
    );
    expect(await findByText('Planilla')).toBeTruthy();
    expect(getByText('1° Vaca')).toBeTruthy();
    expect(getByText('2° Vaca')).toBeTruthy();
    expect(queryByText('3° Vaca')).toBeNull();
    expect(queryByText('Morfología')).toBeNull();
  });

  test('resultado sin puesto ni total no rompe (sin corrida)', async () => {
    fetchResultadoDetalle.mockResolvedValueOnce({ detalle: null });
    const { getByText, queryByText, findByText } = render(
      <ResultDetailScreen t={T} navigation={navStub()} route={routeStub({
        ...PARAMS,
        resultado: { puesto: null, total: null, animal: { id: 'exis:1', nombre: 'SinCorrida' } },
      })} />,
    );
    expect(getByText('Sin puesto')).toBeTruthy();
    expect(await findByText('SinCorrida')).toBeTruthy();
    await waitFor(() => expect(queryByText('Planilla')).toBeNull());
    expect(queryByText('PUNTOS')).toBeNull();
  });
});
