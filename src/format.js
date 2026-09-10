// Helpers de presentación reutilizables entre screens.

// Convierte una fecha en formato ISO corto (YYYY-MM-DD) al formato local
// argentino (DD/MM/YYYY). Si la entrada no matchea el formato ISO la
// devuelve como está — así si el backend cambia o si ya viene formateada,
// no rompe nada.
export function formatDate(s) {
  if (s == null) return '';
  const str = String(s);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return str;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Algunos textos del backend vienen con bytes de control de cp1252 en vez
// del caracter Unicode (ej. las categorias CIO traen \x96 en lugar del guion
// "\u2013"). Los mapeamos a su equivalente para que no se vea un caracter
// raro. Es un parche defensivo: el fix de fondo es del lado API.
const CP1252 = {
  '\u0085': '\u2026', '\u0091': '\u2018', '\u0092': '\u2019',
  '\u0093': '\u201C', '\u0094': '\u201D', '\u0095': '\u2022',
  '\u0096': '\u2013', '\u0097': '\u2014',
};
export function fixCp1252(s) {
  if (s == null) return '';
  return String(s).replace(/[\u0080-\u009F]/g, (c) => CP1252[c] ?? '');
}

// "2026-07-16" → "16 de julio 2026" (mes en minúscula, sin coma). Si no matchea
// el formato ISO, devuelve el string tal cual (por si ya viene formateado).
export function formatDateLong(s) {
  if (s == null) return '';
  const str = String(s);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return str;
  const day   = parseInt(m[3], 10);
  const month = MONTHS_LONG[parseInt(m[2], 10) - 1];
  if (!month) return str;
  return `${day} de ${month} ${m[1]}`;
}
