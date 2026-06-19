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
