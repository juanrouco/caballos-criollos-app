import { apiGet } from './client';

// Delegaciones regionales de la ACCC (sección "Mapa ACCC"). El backend expone
// la lista; cada delegación trae su número/romano, la zona y el delegado. La
// posición de cada marcador en el mapa vive en la app (MARKERS en MapaScreen),
// cruzada por `romano`.
export const fetchDelegaciones = () => apiGet('/delegaciones');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

// Normaliza una delegación al shape que consume MapaScreen. Tolera nombres de
// campo alternativos por si el endpoint todavía no está fijo.
export function mapDelegacion(d) {
  const numero = d.numero ?? d.id ?? null;
  return {
    numero,
    romano: d.romano || (numero != null ? ROMAN[numero] : '') || '',
    titulo: d.titulo || d.nombre || '',
    zona: d.zona || d.region || '',
    delegado: d.delegado || d.delegado_nombre || '',
    email: d.email || null,
  };
}
