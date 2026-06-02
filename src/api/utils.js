// Fecha local (Argentina ≈ user) en formato YYYY-MM-DD — útil para
// filtros como `fecha_desde` en /eventos.
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
