import { apiGet } from './client';

export const fetchAnimales       = (params) => apiGet('/animales', params);
export const fetchAnimal         = (id)     => apiGet(`/animales/${encodeURIComponent(id)}`);
export const fetchAnimalPedigree = (id)     => apiGet(`/animales/${encodeURIComponent(id)}/pedigree`);

// Los méritos del animal: las filas de la tabla del Premio Solanet que ganó,
// de todos los premios y de la más nueva a la más vieja. Sólo vienen las que
// suman puntos. Cada mérito está atado a la inscripción del animal, no se
// resuelve por SBA + RP, así que no trae méritos de otro caballo.
//
// La API vieja (el default de dev) no tiene esta ruta y contesta 404: la ficha
// lo trata como «sin méritos» y no dibuja la sección.
export const fetchMeritosAnimal  = (id)     => apiGet(`/animales/${encodeURIComponent(id)}/meritos`);

// Un mérito, listo para pintar. `premio.nombre` viene crudo ("2025 - 2026"):
// el rótulo del premio lo arma la pantalla. Los puntos vienen como número y se
// muestran sin decimales cuando son enteros, que es el caso normal.
export function mapMerito(m) {
  // `null` y '' no son cero: `Number(null)` da 0 y mostraría «0 PES» en un
  // mérito que no trajo puntaje. El contrato dice que sólo vienen los que
  // suman, así que esto es defensa, no un caso esperado.
  const bruto = m?.puntos;
  const puntos = bruto == null || bruto === '' ? NaN : Number(bruto);
  return {
    temporada: m?.premio?.nombre || '',
    evento: m?.evento || '',
    fecha: m?.fecha || null,
    prueba: m?.prueba || '',
    categoria: m?.categoria || '',
    logro: m?.logro || '',
    puntos: Number.isFinite(puntos) ? puntos : null,
    puntosLabel: Number.isFinite(puntos)
      ? (Number.isInteger(puntos) ? String(puntos) : String(Math.round(puntos * 100) / 100))
      : '',
  };
}

// Agrupa por temporada conservando el orden que mandó la API (más nuevo
// primero), que es el que tiene sentido para un historial.
export function meritosPorTemporada(meritos) {
  const grupos = [];
  (meritos || []).forEach((m) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.temporada === m.temporada) ultimo.meritos.push(m);
    else grupos.push({ temporada: m.temporada, meritos: [m] });
  });
  return grupos;
}

const SEX_LABEL = { M: 'Macho', H: 'Hembra', C: 'Castrado' };

// Pasa la respuesta de /animales/{id}/pedigree al shape que consume
// HorseDetailScreen (mismo nombres de campo que el mock viejo en src/data.js).
// El animal raíz trae fecha_nacimiento y pelaje (sólo el raíz, no los
// ancestros); si vienen null las celdas correspondientes se ocultan en la UI.
export function mapAnimalPedigree(payload) {
  const a = payload?.animal || {};
  const p = payload?.pedigree || {};
  return {
    id: a.id,
    name: a.nombre || '',
    sex:  SEX_LABEL[a.sexo] || '',
    born:   a.fecha_nacimiento || '',
    pelaje: a.pelaje || '',
    rp:   a.rp  != null ? String(a.rp)  : '',
    sba:  a.sba != null ? String(a.sba) : '',
    propietario:    a.propietario?.nombre || '',
    propietarioNum: a.propietario?.numero || '',
    criador:    a.criador?.nombre || '',
    criadorNum: a.criador?.numero || '',
    sire: mapNode(p.padre),
    dam:  mapNode(p.madre),
  };
}

function mapNode(n) {
  if (!n) return null;
  return {
    id:   n.id,
    name: n.nombre || '',
    sex:  n.sexo || '',
    sire: mapNode(n.padre),
    dam:  mapNode(n.madre),
  };
}
