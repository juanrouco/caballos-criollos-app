import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('../../src/api', () => ({
  fetchReglamentos: jest.fn(),
  fetchReglamentoPruebas: jest.fn(),
  mapReglamento: jest.requireActual('../../src/api/reglamentos').mapReglamento,
  fetchReglamento: jest.fn(),
}));

const { fetchReglamentos, fetchReglamentoPruebas, fetchReglamento } = require('../../src/api');
const ReglamentosScreen = require('../../src/screens/ReglamentosScreen').default;
const { T } = require('../helpers');

const flushPromises = () => new Promise((res) => process.nextTick(res));

const PRUEBAS = [{ id: 4, nombre: 'Freno de Oro' }, { id: 10, nombre: 'Rodeos' }];
const REGS = [
  { id: 1072, titulo: 'Freno de Oro - Reglamento', fecha: '2026-03-01', prueba: { id: 4, nombre: 'Freno de Oro' } },
  { id: 124,  titulo: 'Rodeos - Jurados vigentes', fecha: '2026-06-16', prueba: { id: 10, nombre: 'Rodeos' } },
];

beforeEach(() => {
  fetchReglamentos.mockReset();
  fetchReglamentoPruebas.mockReset();
  fetchReglamento.mockReset();
  fetchReglamentoPruebas.mockResolvedValue({ data: PRUEBAS });
  fetchReglamentos.mockResolvedValue({ data: REGS });
});

describe('ReglamentosScreen', () => {
  test('carga los chips de prueba y la lista', async () => {
    const { findByText, getByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText('Freno de Oro - Reglamento')).toBeTruthy();
    expect(getByText('Todas')).toBeTruthy();
    expect(getByText('Rodeos')).toBeTruthy(); // chip de prueba
    expect(getByText('Rodeos - Jurados vigentes')).toBeTruthy();
  });

  test('filtrar por una prueba re-pide /reglamentos con el id', async () => {
    const { findByText, getByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    await findByText('Freno de Oro - Reglamento');
    expect(fetchReglamentos).toHaveBeenLastCalledWith({ limit: 100 });
    fireEvent.press(getByText('Rodeos')); // chip
    await waitFor(() => expect(fetchReglamentos).toHaveBeenLastCalledWith({ limit: 100, prueba: 10 }));
  });

  test('tocar un reglamento abre el detalle (contenido) y desde ahí el PDF', async () => {
    fetchReglamento.mockResolvedValueOnce({ cuerpo: '<p>Reglamento vigente</p>', pdf: 'https://x/reg.pdf', archivos: [{ id: 1, nombre: 'Reg.pdf', url: 'https://x/reg.pdf' }] });
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText, getByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('Freno de Oro - Reglamento'));
    // El detalle tiene endpoint propio: /noticias/{id} comparte tabla pero no
    // trae el `pdf` resuelto.
    await waitFor(() => expect(fetchReglamento).toHaveBeenCalledWith(1072));
    // Vista de detalle: título del reglamento + botón para abrir el PDF (fuera de la app)
    expect(await findByText('Abrir PDF')).toBeTruthy();
    fireEvent.press(getByText('Abrir PDF'));
    expect(spy).toHaveBeenCalledWith('https://x/reg.pdf');
    spy.mockRestore();
  });

  test('el botón abre el `pdf` de la API, no el primer adjunto cualquiera', async () => {
    // Es la razón del cambio de endpoint: `pdf` es «el primer adjunto que
    // termina en .pdf», y `/noticias/{id}` no lo trae. Con el fallback al
    // primer archivo, un reglamento con un anexo adelante abría el anexo.
    fetchReglamento.mockResolvedValueOnce({
      cuerpo: '<p>x</p>',
      archivos: [
        { id: 1, nombre: 'Anexo.docx', url: 'https://x/anexo.docx' },
        { id: 2, nombre: 'Reglamento.pdf', url: 'https://x/reg.pdf' },
      ],
      pdf: 'https://x/reg.pdf',
    });
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText, getByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('Freno de Oro - Reglamento'));
    fireEvent.press(await findByText('Abrir PDF'));
    expect(spy).toHaveBeenCalledWith('https://x/reg.pdf');
    expect(spy).not.toHaveBeenCalledWith('https://x/anexo.docx');
    spy.mockRestore();
  });

  test('sin `pdf` cae al primer archivo: mejor eso que no ofrecer nada', async () => {
    fetchReglamento.mockResolvedValueOnce({ cuerpo: '<p>x</p>', archivos: [{ id: 1, nombre: 'Viejo.doc', url: 'https://x/viejo.doc' }] });
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('Freno de Oro - Reglamento'));
    fireEvent.press(await findByText('Abrir PDF'));
    expect(spy).toHaveBeenCalledWith('https://x/viejo.doc');
    spy.mockRestore();
  });

  test('desde el detalle, Volver regresa al listado', async () => {
    fetchReglamento.mockResolvedValueOnce({ cuerpo: '<p>x</p>', archivos: [] });
    const { findByText, getByLabelText, queryByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    fireEvent.press(await findByText('Rodeos - Jurados vigentes'));
    await findByText('Reglamento'); // header del detalle
    fireEvent.press(getByLabelText('Volver'));
    // De vuelta en la lista: reaparecen los chips
    expect(await findByText('Todas')).toBeTruthy();
    expect(queryByText('Reglamento')).toBeNull();
  });

  test('sin datos muestra el empty state', async () => {
    fetchReglamentos.mockResolvedValue({ data: [] });
    const { findByText } = render(<ReglamentosScreen t={T} topInset={0} onBack={jest.fn()} />);
    expect(await findByText(/No hay reglamentos/)).toBeTruthy();
  });
});
