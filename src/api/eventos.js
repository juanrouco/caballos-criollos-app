import { apiGet } from './client';

export const fetchEventos           = (params) => apiGet('/eventos', params);
export const fetchEvento            = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}`);
export const fetchEventoCatalogo    = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}/catalogo`);
export const fetchEventoResultados  = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}/resultados`);

// Catálogo "vacío" = ninguna prueba funcional ni morfológica tiene animales
// (o yuntas, para rodeos que usan ese shape en vez de animales[]).
export function isEmptyCatalog(c) {
  if (!c) return true;
  const pf = c.pruebas_funcionales || [];
  const mo = c.morfologicas || [];
  const pfHas = pf.some((p) => (p.categorias || []).some(
    (cat) => (cat.animales || []).length > 0 || (cat.yuntas || []).length > 0
  ));
  const moHas = mo.some((cat) => (cat.animales || []).length > 0);
  return !(pfHas || moHas);
}

// Premios de una categoría de morfología / TyA. Hoy vienen partidos en
// `subcategorias[]` (de a 6, por box); antes venían planos en `premios`.
// Devuelve el array aplanado (mantiene compat con datos viejos cacheados).
export function categoriaEntries(c) {
  const subs = c?.subcategorias;
  if (Array.isArray(subs) && subs.length) return subs.flatMap((s) => s.premios || []);
  return c?.premios || [];
}

// Resultados "vacíos" = ninguno de los grupos (morfología / tipo y aptitud,
// y dentro: gran_campeonato / campeonato / categorias) trae entries, y rodeos
// no tiene ninguna prueba con yuntas.
export function isEmptyResults(r) {
  if (!r) return true;
  const groups = [r.morfologia, r.tipo_aptitud].filter(Boolean);
  for (const g of groups) {
    const gc = g.gran_campeonato || [];
    const cp = g.campeonato || [];
    const cats = g.categorias || [];
    if (gc.some((x) => (x.resultados || []).length > 0)) return false;
    if (cp.some((x) => (x.resultados || []).length > 0)) return false;
    if (cats.some((x) => categoriaEntries(x).length > 0)) return false;
  }
  const pruebas = r.rodeos?.pruebas || [];
  if (pruebas.some((p) => (p.yuntas || []).length > 0)) return false;
  return true;
}

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT   = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];

// Normaliza un evento de la API al shape que consumen las pantallas (mismo
// shape que el mock viejo en src/data.js, así EventDetailScreen sigue andando).
export function mapEvent(e) {
  const [Y, M, D] = String(e.fecha || '').split('-');
  const mIdx = parseInt(M, 10) - 1;
  const day  = parseInt(D, 10);
  const date     = Number.isFinite(day) && MONTHS_SHORT[mIdx] ? `${day} ${MONTHS_SHORT[mIdx]}` : '';
  const dateFull = Number.isFinite(day) && MONTHS_LONG[mIdx]  ? `${day} de ${MONTHS_LONG[mIdx]}, ${Y}` : '';
  // T12:00 evita que el TZ del cliente desplace al día anterior.
  const dow = (Y && M && D) ? new Date(`${Y}-${M}-${D}T12:00:00`).getDay() : NaN;
  const dayShort = Number.isFinite(dow) ? DAYS_SHORT[dow] : '';
  return {
    id: e.id,
    name: e.titulo || '',
    date,
    dateFull,
    dayShort,
    location: [e.localidad, e.provincia?.nombre].filter(Boolean).join(' · '),
    disciplines: (e.categorias || []).map((c) => c.nombre),
    type: e.categorias?.[0]?.nombre || 'Evento',
    fecha: e.fecha,
    fecha_hasta: e.fecha_hasta,
    suspendido: !!e.suspendido,
    // URL base al endpoint /api/img (resize + WebP/JPEG). El campo `imagen`
    // crudo es sólo el nombre de archivo; usamos siempre la optimizada y le
    // pedimos el ancho con imgUrl() en cada pantalla. null si no hay imagen.
    image: e.imagen_optimizada || null,
    raw: e,
  };
}
