// Helper para construir URLs de imágenes optimizadas (endpoint /api/img).
//
// La API ya devuelve la URL base en los campos `optimizada` (noticias) e
// `imagen_optimizada` (eventos). Esa URL, sin params, devuelve el default del
// backend (máx 1280px). Acá le agregamos `?w=` para pedir un ancho acorde al
// tamaño en que se va a mostrar, así la app baja un archivo liviano (WebP/JPEG
// recomprimido, -85/97% vs el original) en vez del original pesado.
//
// `width` se pasa en px reales (ya pensado para densidad retina, ej. un thumb
// de 72pt → ~240px). El endpoint nunca agranda: si el original es más chico,
// respeta su ancho. Devuelve null si no hay URL base.
export function imgUrl(base, width) {
  if (!base) return null;
  if (!width) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}w=${Math.round(width)}`;
}
