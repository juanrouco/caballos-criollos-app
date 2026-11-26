import { mapVideo } from '../../src/api/videos';

describe('mapVideo', () => {
  test('mapea un video de YouTube al shape de pantalla', () => {
    const v = mapVideo({
      id: 275,
      titulo: 'Definición 2° cuarto de Final de Rodeos La Cautiva 2026',
      tipo: 'video',
      proveedor: 'youtube',
      youtube_id: 'a3__HwfsIWo',
      url: 'https://www.youtube.com/watch?v=a3__HwfsIWo',
      embed_url: 'https://www.youtube.com/embed/a3__HwfsIWo',
      miniatura: 'https://img.youtube.com/vi/a3__HwfsIWo/hqdefault.jpg',
    });
    expect(v.id).toBe(275);
    expect(v.title).toBe('Definición 2° cuarto de Final de Rodeos La Cautiva 2026');
    expect(v.tipo).toBe('video');
    expect(v.tipoLabel).toBe('Video');
    expect(v.proveedor).toBe('youtube');
    expect(v.youtubeId).toBe('a3__HwfsIWo');
    expect(v.thumb).toBe('https://img.youtube.com/vi/a3__HwfsIWo/hqdefault.jpg');
    expect(v.url).toBe('https://www.youtube.com/watch?v=a3__HwfsIWo');
  });

  test('el podcast de Spotify queda sin id de YouTube ni miniatura', () => {
    const v = mapVideo({
      id: 92,
      titulo: 'GATO Y MANCHA: Cartas de un viaje #1',
      tipo: 'podcast',
      proveedor: 'spotify',
      youtube_id: null,
      url: 'https://open.spotify.com/episode/39d9voqtWPb0LcXbELvM47',
      embed_url: 'https://open.spotify.com/embed/episode/39d9voqtWPb0LcXbELvM47',
      miniatura: null,
    });
    expect(v.tipo).toBe('podcast');
    expect(v.tipoLabel).toBe('Podcast');
    expect(v.youtubeId).toBe(null);
    expect(v.thumb).toBe(null);
    expect(v.url).toContain('open.spotify.com');
  });

  test('un link a un canal de YouTube viene sin id: se abre afuera, no se reproduce', () => {
    const v = mapVideo({
      id: 150,
      titulo: 'FINAL NACIONAL CORRAL DE APARTE "C"',
      tipo: 'video',
      proveedor: 'youtube',
      youtube_id: null,
      url: 'https://www.youtube.com/@CaballosCriollosArg',
      embed_url: null,
      miniatura: null,
    });
    expect(v.youtubeId).toBe(null);
    expect(v.embedUrl).toBe(null);
    expect(v.url).toBe('https://www.youtube.com/@CaballosCriollosArg');
  });

  test('un item vacío no rompe: strings vacíos y nulls, nunca undefined', () => {
    const v = mapVideo({});
    expect(v.title).toBe('');
    expect(v.tipo).toBe('video');          // el default es video, no podcast
    expect(v.tipoLabel).toBe('Video');
    expect(v.youtubeId).toBe(null);
    expect(v.thumb).toBe(null);
    expect(v.url).toBe('');
    expect(mapVideo(null).title).toBe('');
  });
});
