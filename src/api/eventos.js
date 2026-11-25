import { apiGet } from './client';

export const fetchEventos           = (params) => apiGet('/eventos', params);
export const fetchEvento            = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}`);
// Catálogo de categorías para el filtro por actividad. Devuelve sólo las que
// tienen al menos un evento, y acepta los mismos `fecha_desde` / `fecha_hasta`
// que el listado: conviene mandarle las mismas fechas, así no ofrece una
// actividad que en ese período no tiene nada.
export const fetchEventoCategorias  = (params) => apiGet('/eventos/categorias', params);
export const fetchEventoCatalogo    = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}/catalogo`);
export const fetchEventoResultados  = (id)     => apiGet(`/eventos/${encodeURIComponent(id)}/resultados`);
// Desagregado de UN resultado (los sub-puntajes que suman el total).
// prueba: 'fzb' | 'corral_aparte' | 'rodeos'. target: id de animal compuesto
// (fzb/corral) o IdEquipo (rodeos). Ver docs/README.md.
export const fetchResultadoDetalle  = (id, prueba, target) =>
  apiGet(`/eventos/${encodeURIComponent(id)}/resultados/${encodeURIComponent(prueba)}/${encodeURIComponent(target)}`);

// Cuántos animales y cuántos expositores hay anotados, para la Info del evento.
//
// Dos cuidados: un animal aparece una vez por cada categoría en la que está
// inscripto, así que se cuenta por id y no por apariciones; y hay tres formas
// de listarlos —`animales[]`, `yuntas[].animales[]` (rodeos) y
// `equipos[].animales[]` (aparte campero)—, las mismas tres que mira
// `isEmptyCatalog`.
//
// El expositor es el propietario del animal. Lo identifica su `numero`; si una
// fila no lo trae, cae al nombre, que es lo único que queda para distinguirlo.
export function contarCatalogo(c) {
  const animales = new Set();
  const expositores = new Set();
  const sumar = (a) => {
    if (!a) return;
    if (a.id != null) animales.add(String(a.id));
    const clave = a.propietario?.numero || a.propietario?.nombre;
    if (clave) expositores.add(String(clave).trim());
  };
  const porCategoria = (cat) => {
    (cat?.animales || []).forEach(sumar);
    (cat?.yuntas || []).forEach((y) => (y?.animales || []).forEach(sumar));
    (cat?.equipos || []).forEach((e) => (e?.animales || []).forEach(sumar));
  };
  (c?.pruebas_funcionales || []).forEach((p) => (p?.categorias || []).forEach(porCategoria));
  (c?.morfologicas || []).forEach(porCategoria);
  return { animales: animales.size, expositores: expositores.size };
}

// Catálogo "vacío" = ninguna prueba funcional ni morfológica tiene animales
// (o yuntas para rodeos / equipos para aparte campero, que usan esos shapes
// en vez de animales[]).
export function isEmptyCatalog(c) {
  if (!c) return true;
  const pf = c.pruebas_funcionales || [];
  const mo = c.morfologicas || [];
  const pfHas = pf.some((p) => (p.categorias || []).some(
    (cat) => (cat.animales || []).length > 0 || (cat.yuntas || []).length > 0 || (cat.equipos || []).length > 0
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
// y dentro: gran_campeonato / campeonato / categorias) trae entries, rodeos
// no tiene ninguna prueba con yuntas y corral de aparte ninguna con resultados.
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
  const paleteada = r.paleteada?.pruebas || [];
  if (paleteada.some((p) => (p.yuntas || []).length > 0)) return false;
  const corral = r.corral_aparte?.pruebas || [];
  if (corral.some((p) => (p.resultados || []).length > 0)) return false;
  const fzb = r.fzb?.pruebas || [];
  if (fzb.some((p) => (p.resultados || []).length > 0)) return false;
  const freno = r.freno_oro?.pruebas || [];
  if (freno.some((p) => (p.resultados || []).length > 0)) return false;
  const cio = r.copa_incentivo?.pruebas || [];
  if (cio.some((p) => (p.resultados || []).length > 0)) return false;
  const aparte = r.aparte_campero?.pruebas || [];
  if (aparte.some((p) => (p.equipos || []).length > 0)) return false;
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
