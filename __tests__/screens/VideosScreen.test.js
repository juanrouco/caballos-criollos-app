import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api', () => ({
  fetchVideos: jest.fn(),
  mapVideo: jest.requireActual('../../src/api/videos').mapVideo,
}));

const { fetchVideos } = require('../../src/api');
const VideosScreen = require('../../src/screens/VideosScreen').default;
const { T, navStub, routeStub } = require('../helpers');

const yt = (over = {}) => ({
  id: 275, titulo: 'Definición de Rodeos La Cautiva', tipo: 'video', proveedor: 'youtube',
  youtube_id: 'a3__HwfsIWo',
  url: 'https://www.youtube.com/watch?v=a3__HwfsIWo',
  embed_url: 'https://www.youtube.com/embed/a3__HwfsIWo',
  miniatura: 'https://img.youtube.com/vi/a3__HwfsIWo/hqdefault.jpg',
  ...over,
});

const podcast = {
  id: 92, titulo: 'GATO Y MANCHA: Cartas de un viaje', tipo: 'podcast', proveedor: 'spotify',
  youtube_id: null, url: 'https://open.spotify.com/episode/39d9', embed_url: null, miniatura: null,
};

beforeEach(() => {
  fetchVideos.mockReset();
});

describe('VideosScreen', () => {
  test('lista los videos y pide la primera página con limit y offset', async () => {
    fetchVideos.mockResolvedValueOnce({ data: [yt(), podcast] });
    const { findByText, getByText } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    expect(await findByText('Definición de Rodeos La Cautiva')).toBeTruthy();
    expect(getByText('GATO Y MANCHA: Cartas de un viaje')).toBeTruthy();
    expect(getByText('Podcast')).toBeTruthy();
    expect(fetchVideos).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  test('el video de YouTube trae el player montado: un solo toque para verlo', async () => {
    fetchVideos.mockResolvedValueOnce({ data: [yt()] });
    const { findByLabelText } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    // Sin miniatura propia delante: lo que se toca es el player de YouTube.
    // Con una miniatura nuestra harían falta dos toques, porque iOS no deja
    // que el WebView arranque solo.
    expect(await findByLabelText('YoutubePlayer')).toBeTruthy();
  });

  test('lo que no es de YouTube se abre afuera, no se intenta reproducir', async () => {
    fetchVideos.mockResolvedValueOnce({ data: [podcast] });
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { findByLabelText, queryByLabelText } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    fireEvent.press(await findByLabelText('Abrir GATO Y MANCHA: Cartas de un viaje'));
    expect(spy).toHaveBeenCalledWith('https://open.spotify.com/episode/39d9');
    expect(queryByLabelText('YoutubePlayer')).toBeNull();
    spy.mockRestore();
  });

  test('una página completa pide la siguiente al llegar al final', async () => {
    const pagina1 = Array.from({ length: 20 }, (_, i) => yt({ id: 300 - i, titulo: `Video ${i}` }));
    fetchVideos.mockResolvedValueOnce({ data: pagina1 });
    fetchVideos.mockResolvedValueOnce({ data: [yt({ id: 100, titulo: 'Video viejo' })] });
    const { findByText, getByText, UNSAFE_getByType } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    await findByText('Video 0');
    const { FlatList } = require('react-native');
    fireEvent(UNSAFE_getByType(FlatList), 'endReached');
    await waitFor(() => expect(fetchVideos).toHaveBeenLastCalledWith({ limit: 20, offset: 20 }));
    // El item 21 no se afirma por texto: la FlatList sólo monta la primera
    // ventana. El cartel del final sólo sale si la segunda página se sumó a
    // la lista (su condición es `items.length > PAGE_SIZE`).
    expect(await findByText('Llegaste al final.')).toBeTruthy();
    // Página corta: no pide más aunque se vuelva a llegar al final.
    fireEvent(UNSAFE_getByType(FlatList), 'endReached');
    expect(getByText('Llegaste al final.')).toBeTruthy();
    expect(fetchVideos).toHaveBeenCalledTimes(2);
  });

  test('si la API falla, la pantalla ofrece reintentar', async () => {
    fetchVideos.mockRejectedValueOnce(new Error('404'));
    fetchVideos.mockResolvedValueOnce({ data: [yt()] });
    const { findByText } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    fireEvent.press(await findByText('Reintentar'));
    expect(await findByText('Definición de Rodeos La Cautiva')).toBeTruthy();
  });

  test('sin videos lo dice, no deja la pantalla en blanco', async () => {
    fetchVideos.mockResolvedValueOnce({ data: [] });
    const { findByText } = render(
      <VideosScreen t={T} navigation={navStub()} route={routeStub()} />,
    );
    expect(await findByText('No hay videos.')).toBeTruthy();
  });
});
