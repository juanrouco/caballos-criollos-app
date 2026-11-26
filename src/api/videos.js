import { apiGet } from './client';

// Los videos y podcasts de la home del sitio, del más nuevo al más viejo.
// Pagina con `limit` / `offset` como /noticias (20 por defecto, 100 máximo).
// El vivo no viene por acá: eso es /vivos.
export const fetchVideos = (params) => apiGet('/videos', params);

const TIPO_LABEL = { podcast: 'Podcast', video: 'Video' };

// Normaliza al shape que consumen las pantallas. Lo que decide cómo se
// reproduce es `youtubeId`: con id va el player embebido (el mismo de los
// vivos); sin id —un canal de YouTube, un video de Facebook, un episodio de
// Spotify— se abre `url` afuera, que es donde la app del proveedor ya tiene
// la sesión del usuario. Por eso no usamos `embed_url`: un WebView por
// proveedor es más superficie de la que justifican tres items sobre 261.
export function mapVideo(v) {
  const tipo = v?.tipo === 'podcast' ? 'podcast' : 'video';
  return {
    id: v?.id,
    title: v?.titulo || '',
    tipo,
    tipoLabel: TIPO_LABEL[tipo],
    proveedor: v?.proveedor || '',
    // `null` cuando no es de YouTube o es un link a un canal.
    youtubeId: v?.youtube_id || null,
    url: v?.url || '',
    embedUrl: v?.embed_url || null,
    // Sólo la traen los de YouTube; el resto cae en la tarjeta sin foto.
    thumb: v?.miniatura || null,
  };
}
