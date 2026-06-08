import { apiGet } from './client';

// Listado paginado de notifs. El backend ordena por Fecha DESC y soporta
// `since` para "traeme lo nuevo desde X" — clave para el badge de la
// campanita (pedimos `limit: 1` y leemos `meta.total`).
export const fetchNotificaciones = (params) => apiGet('/notificaciones', params);

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// "2026-06-08 13:11:58" → "8 Jun · 13:11". El backend ya devuelve hora
// Argentina sin TZ, así que partimos el string sin Date (Date.parse con
// strings sin TZ tira resultados distintos según OS).
function formatFecha(s) {
  const str = String(s || '');
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return '';
  const day  = parseInt(m[3], 10);
  const mIdx = parseInt(m[2], 10) - 1;
  const datePart = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]}` : '';
  if (!datePart) return '';
  return m[4] ? `${datePart} · ${m[4]}:${m[5]}` : datePart;
}

// Compara la `fecha` de una notif (string del backend, hora Argentina
// sin TZ) contra un `since` ISO. Devuelve `true` si la notif es más
// nueva que el snapshot — la usa la NotificationsScreen para destacar
// las "no vistas". Forzamos UTC-3 acá para que el resultado no dependa
// del timezone del device.
export function isUnreadSince(fecha, sinceIso) {
  if (!sinceIso) return false;
  const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return false;
  const tsNotif = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5], +m[6]);
  const tsSince = new Date(sinceIso).getTime();
  if (Number.isNaN(tsSince)) return false;
  return tsNotif > tsSince;
}

export function mapNotificacion(n) {
  return {
    id: n.id,
    titulo: n.titulo || '',
    cuerpo: n.cuerpo || '',
    tipo: n.tipo || 'generico',
    target: n.target || null,
    imagen: n.imagen_url || null,
    fecha: n.fecha || '',
    fechaLabel: formatFecha(n.fecha),
  };
}
