import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchAnimales: jest.fn(),
}));
const { fetchAnimales } = require('../../src/api');
const PedigreeScreen = require('../../src/screens/PedigreeScreen').default;
const { T, navStub, flushPromises } = require('../helpers');

beforeEach(() => { fetchAnimales.mockReset(); });

describe('PedigreeScreen', () => {
  test('arranca con el empty state y sin requests a la API', () => {
    const { getByText } = render(<PedigreeScreen t={T} navigation={navStub()} />);
    expect(getByText('Buscá un pedigree')).toBeTruthy();
    // Con 0 campos activos, el botón sale como "Buscar" pelado y disabled.
    expect(getByText('Buscar')).toBeTruthy();
    expect(fetchAnimales).not.toHaveBeenCalled();
  });

  test('escribir un nombre y tappear Buscar dispara fetchAnimales con el shape correcto', async () => {
    fetchAnimales.mockResolvedValueOnce({ data: [] });
    const nav = navStub();
    const { getByPlaceholderText, getByText } = render(<PedigreeScreen t={T} navigation={nav} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del animal'), 'cardal');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    expect(fetchAnimales).toHaveBeenCalledTimes(1);
    expect(fetchAnimales).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'cardal',
      limit: 50,
    }));
  });

  test('mapea Macho/Hembra → M/H y "criador" → numero_criador para la API', async () => {
    fetchAnimales.mockResolvedValueOnce({ data: [] });
    const { getByText, getByPlaceholderText } = render(<PedigreeScreen t={T} navigation={navStub()} />);
    fireEvent.press(getByText('Macho'));
    fireEvent.changeText(getByPlaceholderText('Número de criador'), '301');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    expect(fetchAnimales).toHaveBeenCalledWith(expect.objectContaining({
      sexo: 'M',
      numero_criador: '301',
    }));
  });

  test('renderiza los resultados con nombre + propietario + RP/SBA', async () => {
    fetchAnimales.mockResolvedValueOnce({
      data: [{
        id: 'pdre:1', nombre: 'FERMIN REMOLON', sexo: 'M', rp: '3', sba: 6598,
        propietario: { nombre: 'HERMANAS BUSQUET' },
      }],
    });
    const { getByText, getByPlaceholderText } = render(<PedigreeScreen t={T} navigation={navStub()} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del animal'), 'x');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    await waitFor(() => expect(getByText('FERMIN REMOLON')).toBeTruthy());
    expect(getByText(/HERMANAS BUSQUET/)).toBeTruthy();
    expect(getByText(/R\.P\. 3/)).toBeTruthy();
  });

  test('tap en un resultado navega a HorseDetail con el id de la API', async () => {
    fetchAnimales.mockResolvedValueOnce({
      data: [{ id: 'pdre:1', nombre: 'FERMIN', sexo: 'M', rp: '3', sba: 6598 }],
    });
    const nav = navStub();
    const { getByText, getByPlaceholderText } = render(<PedigreeScreen t={T} navigation={nav} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del animal'), 'x');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    await waitFor(() => expect(getByText('FERMIN')).toBeTruthy());
    fireEvent.press(getByText('FERMIN'));
    expect(nav.navigate).toHaveBeenCalledWith('HorseDetail', expect.objectContaining({ id: 'pdre:1' }));
  });

  test('error muestra mensaje + Reintentar', async () => {
    fetchAnimales.mockRejectedValueOnce(new Error('500 internal'));
    const { getByText, getByPlaceholderText } = render(<PedigreeScreen t={T} navigation={navStub()} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del animal'), 'x');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    await waitFor(() => expect(getByText('Reintentar')).toBeTruthy());
    expect(getByText(/500 internal/)).toBeTruthy();
  });

  test('cero resultados muestra el empty card', async () => {
    fetchAnimales.mockResolvedValueOnce({ data: [] });
    const { getByText, getByPlaceholderText } = render(<PedigreeScreen t={T} navigation={navStub()} />);
    fireEvent.changeText(getByPlaceholderText('Nombre del animal'), 'x');
    await act(async () => { fireEvent.press(getByText(/Buscar · \d+ campo/)); await flushPromises(); });
    await waitFor(() => expect(getByText(/No se encontraron caballos/)).toBeTruthy());
  });
});
