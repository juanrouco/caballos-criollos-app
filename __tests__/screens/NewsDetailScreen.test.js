import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchNoticia: jest.fn(),
  imgUrl: jest.requireActual('../../src/api/images').imgUrl,
}));
const { fetchNoticia } = require('../../src/api');
const NewsDetailScreen = require('../../src/screens/NewsDetailScreen').default;
const { T, navStub, routeStub } = require('../helpers');

beforeEach(() => { fetchNoticia.mockReset(); });

describe('NewsDetailScreen', () => {
  test('sin id muestra error', async () => {
    const { findByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({})} />,
    );
    expect(await findByText(/Falta el id de la noticia/)).toBeTruthy();
  });

  test('loading muestra spinner', () => {
    fetchNoticia.mockReturnValue(new Promise(() => {}));
    const { UNSAFE_getByType } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 10 })} />,
    );
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  test('render completo con título, fecha, copete y archivos', async () => {
    fetchNoticia.mockResolvedValueOnce({
      id: 10,
      titulo: 'FICCC: servicios para expositores',
      fecha: '2026-02-10',
      copete: 'Resumen de la noticia',
      cuerpo: '<h2>hola</h2>',
      destacado: true,
      imagenes: [{ id: 1, urls: { big: 'b.jpg', thumb: 't.jpg' } }],
      archivos: [{ id: 1, nombre: 'Reglamento.pdf', url: 'https://x/y.pdf' }],
    });
    const { findByText, getByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 10 })} />,
    );
    expect(await findByText('FICCC: servicios para expositores')).toBeTruthy();
    expect(getByText(/10 de Febrero, 2026/)).toBeTruthy();
    expect(getByText('Resumen de la noticia')).toBeTruthy();
    expect(getByText('DESTACADA')).toBeTruthy();
    expect(getByText('Archivos')).toBeTruthy();
    expect(getByText('Reglamento.pdf')).toBeTruthy();
  });

  test('chip de categoría usa route.params.tag como fallback cuando el detalle no expone categoria', async () => {
    fetchNoticia.mockResolvedValueOnce({
      id: 11, titulo: 'X', fecha: '2026-01-01', cuerpo: '',
    });
    const { findByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 11, tag: 'Remates' })} />,
    );
    expect(await findByText('Remates')).toBeTruthy();
  });

  test('si la API ya devuelve categoria, prevalece sobre el tag de params', async () => {
    fetchNoticia.mockResolvedValueOnce({
      id: 12, titulo: 'X', fecha: '2026-01-01', cuerpo: '',
      categoria: { id: 7, nombre: 'Eventos' },
    });
    const { findByText, queryByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 12, tag: 'Otro' })} />,
    );
    expect(await findByText('Eventos')).toBeTruthy();
    expect(queryByText('Otro')).toBeNull();
  });

  test('galería sólo aparece cuando hay imágenes adicionales', async () => {
    fetchNoticia.mockResolvedValueOnce({
      id: 13, titulo: 'X', fecha: '2026-01-01', cuerpo: '',
      imagenes: [
        { id: 1, urls: { big: 'b.jpg' } }, // hero, no entra a la galería
        { id: 2, urls: { big: 'b2.jpg' }, epigrafe: 'segunda' },
      ],
    });
    const { findByText, getByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 13 })} />,
    );
    await findByText('X');
    expect(getByText('Galería')).toBeTruthy();
    expect(getByText('segunda')).toBeTruthy();
  });

  test('error muestra mensaje y Volver', async () => {
    fetchNoticia.mockRejectedValueOnce(new Error('404 Not Found'));
    const { findByText } = render(
      <NewsDetailScreen t={T} navigation={navStub()} route={routeStub({ id: 99 })} />,
    );
    expect(await findByText(/404 Not Found/)).toBeTruthy();
    expect(await findByText('Volver')).toBeTruthy();
  });
});
