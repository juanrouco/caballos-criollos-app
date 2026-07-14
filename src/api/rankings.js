import { apiGet } from './client';

// Catálogo de rankings (qué hay + filtros con sus opciones) y datos de un
// ranking como tabla genérica (columnas + filas). Ver README (sección Rankings).
// El catálogo trae Cache-Control: max-age=3600; para que un ranking nuevo (o un
// cambio de disponibilidad) aparezca sin esperar la hora ni reinstalar, le
// agregamos un cache-bust por request (RN cachea a nivel nativo por URL).
export const fetchRankings = ()             => apiGet('/rankings', { _: Date.now() });
export const fetchRanking  = (slug, params) => apiGet(`/rankings/${encodeURIComponent(slug)}`, params);
// Detalle de un propietario en Solanet (méritos por animal). `propietario` es
// el NumeroPropietario (columna propertyNumber de una fila de /rankings/solanet).
export const fetchSolanetDetalle = (params) => apiGet('/rankings/solanet/detalle', params);

// Algunos strings vienen con entidades HTML (heredado del admin, ej.
// "CABA&Ntilde;A"). Decodificamos las nombradas comunes + las numéricas.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  Ntilde: 'Ñ', ntilde: 'ñ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  uuml: 'ü', Uuml: 'Ü', ordf: 'ª', ordm: 'º', deg: '°',
};

export function decodeEntities(s) {
  if (s == null) return s;
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
    if (code[0] === '#') {
      const cp = (code[1] === 'x' || code[1] === 'X')
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return Object.prototype.hasOwnProperty.call(NAMED, code) ? NAMED[code] : m;
  });
}

// Curación client-side de los filtros de algunos rankings (mientras el backend
// no lo maneje).
//   - Solanet: temporadas de más nueva a más vieja. No ocultamos ninguna: el
//     año se elige con los tabs compartidos (que ya incluyen 2027) y cada año
//     mapea a su temporada por label. Ocultar una temporada haría que su año
//     caiga al default y muestre datos de OTRA temporada (ej. 2027 pisando el
//     detalle de 2026). Una temporada sin datos aún se ve como "Sin datos", que
//     es lo correcto.
//   - fzb: su default de `categoria` (15) no existe en las opciones, así que
//     no quedaba nada seleccionado; forzamos año 2026 y categoría "A".
// Los overrides de default se resuelven por LABEL (robusto ante renumeraciones).
const SOLANET_HIDE_PREMIO = [];
const DEFAULT_OVERRIDES = {
  fzb: { anio: '2026', categoria: 'A' },
};

export function curateRankingFiltros(ranking) {
  if (!ranking) return ranking;
  let filtros = ranking.filtros || [];

  if (ranking.slug === 'solanet') {
    filtros = filtros.map((f) => {
      if (f.param !== 'premio') return f;
      const opciones = (f.opciones || [])
        .filter((o) => !SOLANET_HIDE_PREMIO.includes(o.label))
        .sort((a, b) => String(b.label).localeCompare(String(a.label))); // más nueva primero
      return { ...f, opciones, default: opciones[0]?.value ?? f.default };
    });
  }

  const overrides = DEFAULT_OVERRIDES[ranking.slug];
  if (overrides) {
    filtros = filtros.map((f) => {
      const wantLabel = overrides[f.param];
      if (wantLabel == null) return f;
      const match = (f.opciones || []).find((o) => String(o.label) === String(wantLabel));
      return match ? { ...f, default: match.value } : f;
    });
  }

  return filtros === ranking.filtros ? ranking : { ...ranking, filtros };
}
