import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

// Mockeamos toda la API consumida por la home + LiveContext.
jest.mock('../../src/api', () => ({
  fetchEventos: jest.fn(),
  mapEvent: jest.requireActual('../../src/api/eventos').mapEvent,
  fetchNoticias: jest.fn(),
  mapNoticia: jest.requireActual('../../src/api/noticias').mapNoticia,
  fetchNoticiaCategorias: jest.fn(),
  fetchVideos: jest.fn(),
  mapVideo: jest.requireActual('../../src/api/videos').mapVideo,
  todayISO: () => '2026-06-04',
  imgUrl: jest.requireActual('../../src/api/images').imgUrl,
  fetchVivos: jest.fn(),
}));
const mockOpenMenu = jest.fn();
jest.mock('../../src/MenuContext', () => ({ useMenu: () => ({ openMenu: mockOpenMenu }) }));

const {
  fetchEventos, fetchNoticias, fetchNoticiaCategorias, fetchVideos, fetchVivos,
} = require('../../src/api');
const { LiveProvider } = require('../../src/LiveContext');
const HomeScreen = require('../../src/screens/HomeScreen').default;
const { T, navStub } = require('../helpers');

beforeEach(() => {
  fetchEventos.mockReset();
  fetchNoticias.mockReset();
  fetchNoticiaCategorias.mockReset();
  fetchVideos.mockReset();
  fetchVideos.mockResolvedValue({ data: [] }); // sin videos por default
  fetchVivos.mockReset();
  fetchVivos.mockResolvedValue({ data: [] }); // sin vivo por default
  mockOpenMenu.mockClear();
});

const wrap = (ui) => <LiveProvider>{ui}</LiveProvider>;

describe('HomeScreen · menú', () => {
  test('la hamburguesa del header abre el menú lateral', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const { findByLabelText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    fireEvent.press(await findByLabelText('Abrir menú'));
    expect(mockOpenMenu).toHaveBeenCalled();
  });
});

describe('HomeScreen', () => {
  test('llama a /eventos con fecha_desde + sort + limit; renderiza los eventos cercanos', async () => {
    fetchEventos.mockResolvedValueOnce({
      data: [{
        id: 2057, titulo: 'Expo Esperanza', fecha: '2026-06-06',
        provincia: { id: 5, nombre: 'Santa Fe' }, localidad: 'Esperanza',
        categorias: [{ id: 9, nombre: 'Morfología' }],
        suspendido: false,
      }],
    });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    expect(await findByText('Expo Esperanza')).toBeTruthy();
    expect(fetchEventos).toHaveBeenCalledWith(expect.objectContaining({
      fecha_desde: '2026-06-04', sort: 'fecha_asc',
    }));
  });

  test('filtra suspendidos del listado de próximos', async () => {
    fetchEventos.mockResolvedValueOnce({
      data: [
        { id: 1, titulo: 'BUENO',  fecha: '2026-06-10', suspendido: false, provincia: null, categorias: [] },
        { id: 2, titulo: 'CANCEL', fecha: '2026-06-11', suspendido: true,  provincia: null, categorias: [] },
      ],
    });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const { findByText, queryByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    await findByText('BUENO');
    expect(queryByText('CANCEL')).toBeNull();
  });

  test('si falla la carga de eventos, muestra la card de "Reintentar"', async () => {
    fetchEventos.mockRejectedValueOnce(new Error('net'));
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    expect(await findByText(/No se pudieron cargar los eventos/)).toBeTruthy();
    expect(await findByText('Reintentar')).toBeTruthy();
  });

  test('renderiza el chip de tag + título + fecha en cada noticia', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({
      data: [{
        id: 1, titulo: 'NOTI 1', fecha: '2026-05-05',
        categoria: { id: 7, nombre: 'Eventos' },
        imagen: { thumb: 't.jpg' },
      }],
    });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const { findByText, getByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    expect(await findByText('NOTI 1')).toBeTruthy();
    expect(getByText('Eventos')).toBeTruthy();
    expect(getByText('5 May')).toBeTruthy();
  });

  test('tap en una noticia navega a NewsDetail con id + tag', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({
      data: [{ id: 42, titulo: 'NOTI42', fecha: '2026-05-05', categoria: { id: 7, nombre: 'Eventos' } }],
    });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const nav = navStub();
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={nav} />));
    fireEvent.press(await findByText('NOTI42'));
    expect(nav.navigate).toHaveBeenCalledWith('NewsDetail', expect.objectContaining({
      id: 42, tag: 'Eventos',
    }));
  });

  test('"Ver todo" navega a NewsList sin filtros', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
    const nav = navStub();
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={nav} />));
    fireEvent.press(await findByText('Ver todo'));
    expect(nav.navigate).toHaveBeenCalledWith('NewsList');
  });

  // El ocultado del splash se movió a App.js (onReady del NavigationContainer)
  // para que el cold-start por deep-link de push —que no monta Home— también lo
  // oculte. Ya no es responsabilidad de HomeScreen, así que no se testea acá.

  test('tile de Disciplina con match en /noticias/categorias navega a NewsList con la categoria', async () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    // "Paleteada Campera" matchea por prefijo con DISCIPLINES.name "Paleteada".
    fetchNoticiaCategorias.mockResolvedValueOnce({
      data: [{ id: 280, nombre: 'Paleteada Campera' }],
    });
    const nav = navStub();
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={nav} />));
    await findByText('Paleteada');
    fireEvent.press(await findByText('Paleteada'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('NewsList', expect.objectContaining({
      categoria: 280, categoriaNombre: 'Paleteada Campera',
    })));
  });
});

describe('HomeScreen · videos y podcast', () => {
  const vacio = () => {
    fetchEventos.mockResolvedValueOnce({ data: [] });
    fetchNoticias.mockResolvedValueOnce({ data: [] });
    fetchNoticiaCategorias.mockResolvedValueOnce({ data: [] });
  };
  const yt = {
    id: 275, titulo: 'Definición de Rodeos La Cautiva', tipo: 'video', proveedor: 'youtube',
    youtube_id: 'a3__HwfsIWo', url: 'https://www.youtube.com/watch?v=a3__HwfsIWo',
    embed_url: null, miniatura: 'https://img.youtube.com/vi/a3__HwfsIWo/hqdefault.jpg',
  };

  test('la sección muestra el set más nuevo y pide sólo esos', async () => {
    vacio();
    fetchVideos.mockResolvedValueOnce({ data: [yt] });
    const { findByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    expect(await findByText('Videos y Podcast')).toBeTruthy();
    expect(await findByText('Definición de Rodeos La Cautiva')).toBeTruthy();
    expect(fetchVideos).toHaveBeenCalledWith({ limit: 4 });
  });

  // Un solo toque para ver el video: el player viene montado y lo que se
  // toca es su botón, no una miniatura nuestra. iOS no deja que un WebView
  // recién montado arranque a sonar sin un gesto hecho adentro.
  test('el video de la home trae el player montado, sin navegar a ningún lado', async () => {
    vacio();
    fetchVideos.mockResolvedValueOnce({ data: [yt] });
    const nav = navStub();
    const { findByLabelText } = render(wrap(<HomeScreen t={T} navigation={nav} />));
    expect(await findByLabelText('YoutubePlayer')).toBeTruthy();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('"Ver todo" sí abre la pantalla con todos', async () => {
    vacio();
    fetchVideos.mockResolvedValueOnce({ data: [yt] });
    const nav = navStub();
    const { findByText, getAllByText } = render(wrap(<HomeScreen t={T} navigation={nav} />));
    await findByText('Videos y Podcast');              // la sección ya está en pantalla
    const verTodo = getAllByText('Ver todo');          // el de Noticias y el de Videos
    fireEvent.press(verTodo[verTodo.length - 1]);
    expect(nav.navigate).toHaveBeenCalledWith('VideosList');
  });

  test('si el endpoint no está (la /api vieja da 404) la sección no se dibuja', async () => {
    vacio();
    fetchVideos.mockRejectedValueOnce(new Error('404'));
    const { findByText, queryByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    await findByText('No hay noticias.');           // la home terminó de cargar
    expect(queryByText('Videos y Podcast')).toBeNull();
  });

  test('sin videos tampoco se dibuja: nada de un hueco vacío al final', async () => {
    vacio();
    fetchVideos.mockResolvedValueOnce({ data: [] });
    const { findByText, queryByText } = render(wrap(<HomeScreen t={T} navigation={navStub()} />));
    await findByText('No hay noticias.');
    expect(queryByText('Videos y Podcast')).toBeNull();
  });
});
