import { apiGet } from './client';

export const fetchAnimales       = (params) => apiGet('/animales', params);
export const fetchAnimal         = (id)     => apiGet(`/animales/${encodeURIComponent(id)}`);
export const fetchAnimalPedigree = (id)     => apiGet(`/animales/${encodeURIComponent(id)}/pedigree`);

const SEX_LABEL = { M: 'Macho', H: 'Hembra', C: 'Castrado' };

// Pasa la respuesta de /animales/{id}/pedigree al shape que consume
// HorseDetailScreen (mismo nombres de campo que el mock viejo en src/data.js).
// La API no expone born/pelaje/criadero en el detalle — esos campos quedan
// vacíos y las celdas correspondientes se ocultan en la UI.
export function mapAnimalPedigree(payload) {
  const a = payload?.animal || {};
  const p = payload?.pedigree || {};
  return {
    id: a.id,
    name: a.nombre || '',
    sex:  SEX_LABEL[a.sexo] || '',
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
