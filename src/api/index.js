// Barrel: permite `import { fetchEventos } from '../api'` desde las pantallas
// sin que importen un archivo específico por endpoint. Cada nuevo endpoint
// va en su propio archivo y se re-exporta acá.

export { API_BASE, apiGet } from './client';
export {
  fetchEventos, fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
  mapEvent, isEmptyCatalog, isEmptyResults,
} from './eventos';
export { fetchVivos } from './vivos';
export { fetchNoticias, fetchNoticia, mapNoticia } from './noticias';
export {
  fetchAnimales, fetchAnimal, fetchAnimalPedigree, mapAnimalPedigree,
} from './animales';
export { todayISO } from './utils';
