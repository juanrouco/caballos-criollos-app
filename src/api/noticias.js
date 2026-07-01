import { apiGet } from './client';
import { imgUrl } from './images';

export const fetchNoticias = (params) => apiGet('/noticias', params);
export const fetchNoticia  = (id)     => apiGet(`/noticias/${encodeURIComponent(id)}`);

// Memo a nivel módulo: la categoría es estable durante la sesión (el
// backend cachea 1h) y la consumen varias pantallas (Home para mapear
// disciplinas, Events para resolver "Remates"). Si falla, descartamos
// el promise para que un nuevo intento vuelva a pegarle.
let _categoriasPromise = null;
let _categoriasCache   = null;
export function fetchNoticiaCategorias() {
  if (_categoriasCache)   return Promise.resolve(_categoriasCache);
  if (_categoriasPromise) return _categoriasPromise;
  _categoriasPromise = apiGet('/noticias/categorias')
    .then((r) => { _categoriasCache = r; return r; })
    .catch((e) => { _categoriasPromise = null; throw e; });
  return _categoriasPromise;
}

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Normaliza una noticia de la API al shape que consumen las pantallas.
export function mapNoticia(n) {
  const [Y, M, D] = String(n.fecha || '').split('-');
  const day  = parseInt(D, 10);
  const mIdx = parseInt(M, 10) - 1;
  const date = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]}` : '';
  // Variante con año, para listas donde importa (ej. Remates). El resto usa `date`.
  const dateYear = date && Y ? `${date} ${Y}` : date;
  return {
    id: n.id,
    title: n.titulo || '',
    date,
    dateYear,
    tag: n.categoria?.nombre || '',
    // Thumb de lista (72pt → ~240px). Preferimos la optimizada del /api/img;
    // si la API no la trae (versión vieja), caemos al thumb/big legacy.
    thumb: imgUrl(n.imagen?.optimizada, 240) || n.imagen?.thumb || n.imagen?.big || null,
    destacado: !!n.destacado,
    fijo: !!n.fijo,
  };
}
