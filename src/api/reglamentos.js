import { apiGet } from './client';

// Reglamentos = noticias de una categoría fija filtrables por "prueba" (el
// columnista). El listado trae el shape de noticia + `prueba: {id, nombre}`.
// El detalle (con los archivos adjuntos) se pide con GET /noticias/{id}.
export const fetchReglamentos      = (params) => apiGet('/reglamentos', params);
export const fetchReglamentoPruebas = ()      => apiGet('/reglamentos/pruebas');

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Normaliza un reglamento del listado al shape que consume la pantalla.
export function mapReglamento(r) {
  const [Y, M, D] = String(r.fecha || '').split('-');
  const day  = parseInt(D, 10);
  const mIdx = parseInt(M, 10) - 1;
  const date = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]} ${Y}` : '';
  return {
    id: r.id,
    title: r.titulo || '',
    pruebaId: r.prueba?.id ?? null,
    prueba: r.prueba?.nombre || '',
    date,
  };
}
