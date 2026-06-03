import { apiGet } from './client';

export const fetchNoticias = (params) => apiGet('/noticias', params);
export const fetchNoticia  = (id)     => apiGet(`/noticias/${encodeURIComponent(id)}`);

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Normaliza una noticia de la API al shape que consumen las pantallas.
export function mapNoticia(n) {
  const [, M, D] = String(n.fecha || '').split('-');
  const day  = parseInt(D, 10);
  const mIdx = parseInt(M, 10) - 1;
  const date = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]}` : '';
  return {
    id: n.id,
    title: n.titulo || '',
    date,
    tag: n.categoria?.nombre || '',
    thumb: n.imagen?.thumb || n.imagen?.big || null,
    destacado: !!n.destacado,
    fijo: !!n.fijo,
  };
}
