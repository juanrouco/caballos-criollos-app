import { apiGet } from './client';

// Delegados por delegación/región (sección "Mapa ACCC"). El backend expone la
// lista + la URL del mapa oficial. Ver README §Delegados.
//   GET /delegados → { mapa, data: [{ delegacion, nombre, email }] }
export const fetchDelegados = () => apiGet('/delegados');

const ROMANS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII']);

// El número romano no viene aparte: lo sacamos del texto de `delegacion` (ej.
// "DELEGACIÓN V - a - CENTRO NORTE" → "V"). Es la clave que cruza con la
// posición del marcador en el mapa (MARKERS en MapaScreen).
export function romanFromDelegacion(delegacion) {
  const tokens = String(delegacion || '').split(/[\s\-]+/);
  return tokens.find((tok) => ROMANS.has(tok.toUpperCase())) || '';
}

// Normaliza un delegado al shape que consume MapaScreen.
export function mapDelegado(d) {
  return {
    delegacion: d.delegacion || '',
    delegado: d.nombre || '',
    email: d.email || null,
    romano: romanFromDelegacion(d.delegacion),
  };
}
