import { apiGet } from './client';

export const fetchEventos = (params) => apiGet('/eventos', params);

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Normaliza un evento de la API al shape que consumen las pantallas (mismo
// shape que el mock viejo en src/data.js, así EventDetailScreen sigue andando).
export function mapEvent(e) {
  const [Y, M, D] = String(e.fecha || '').split('-');
  const mIdx = parseInt(M, 10) - 1;
  const day  = parseInt(D, 10);
  const date     = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]}` : '';
  const dateFull = Number.isFinite(day) && MONTHS_LONG[mIdx]  ? `${day} de ${MONTHS_LONG[mIdx]}, ${Y}` : '';
  return {
    id: e.id,
    name: e.titulo || '',
    date,
    dateFull,
    location: [e.localidad, e.provincia?.nombre].filter(Boolean).join(' · '),
    disciplines: (e.categorias || []).map((c) => c.nombre),
    type: e.categorias?.[0]?.nombre || 'Evento',
    fecha: e.fecha,
    fecha_hasta: e.fecha_hasta,
    suspendido: !!e.suspendido,
    raw: e,
  };
}
