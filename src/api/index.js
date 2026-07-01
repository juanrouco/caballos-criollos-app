// Barrel: permite `import { fetchEventos } from '../api'` desde las pantallas
// sin que importen un archivo específico por endpoint. Cada nuevo endpoint
// va en su propio archivo y se re-exporta acá.

export { API_BASE, apiGet, apiPost } from './client';
export { registerPushToken } from './push';
export {
  fetchEventos, fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
  mapEvent, isEmptyCatalog, isEmptyResults,
} from './eventos';
export { fetchVivos } from './vivos';
export {
  fetchNoticias, fetchNoticia, fetchNoticiaCategorias, mapNoticia,
} from './noticias';
export { fetchNotificaciones, mapNotificacion, isUnreadSince } from './notificaciones';
export { fetchReglamentos, fetchReglamentoPruebas, mapReglamento } from './reglamentos';
export {
  fetchAnimales, fetchAnimal, fetchAnimalPedigree, mapAnimalPedigree,
} from './animales';
export { todayISO } from './utils';
export { imgUrl } from './images';
