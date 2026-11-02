// Barrel: permite `import { fetchEventos } from '../api'` desde las pantallas
// sin que importen un archivo específico por endpoint. Cada nuevo endpoint
// va en su propio archivo y se re-exporta acá.

export { API_BASE, apiGet, apiPost, apiGetAuth, apiPostAuth, ApiError, OFFLINE_MSG } from './client';
export { getSession, setSession, clearSession, subscribeSession } from './session';
export { login, logout, cambiarClave, OLVIDO_CLAVE_URL } from './auth';
export { fetchPerfil, mapPerfil } from './perfil';
export {
  fetchInscripciones, fetchInscripcion, fetchCertificado,
  mapListado, mapInscripcion, mapCertificado, descargarCertificadoPdf,
} from './inscripciones';
export {
  fetchEventosAlta, fetchAlertasAlta, fetchCabanias,
  buscarAnimalesAlta, fetchOpcionesAlta, buscarJinetes, buscarDomadores,
  crearInscripcion, animalAPayload,
  mapEventoAlta, mapAlertas, mapAnimalAlta, mapOpciones, mapJinete, mapAltaCreada,
} from './alta';
export { registerPushToken } from './push';
export {
  fetchEventos, fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
  fetchResultadoDetalle,
  mapEvent, isEmptyCatalog, isEmptyResults, categoriaEntries,
} from './eventos';
export { fetchVivos } from './vivos';
export {
  fetchNoticias, fetchNoticia, fetchNoticiaCategorias, mapNoticia,
} from './noticias';
export { fetchNotificaciones, mapNotificacion, isUnreadSince } from './notificaciones';
export { fetchReglamentos, fetchReglamentoPruebas, mapReglamento } from './reglamentos';
export { fetchDelegados, mapDelegado, romanFromDelegacion } from './delegados';
export { fetchRankings, fetchRanking, fetchSolanetDetalle, decodeEntities, curateRankingFiltros } from './rankings';
export {
  fetchAnimales, fetchAnimal, fetchAnimalPedigree, mapAnimalPedigree,
} from './animales';
export { todayISO } from './utils';
export { imgUrl } from './images';
