// Barrel: permite `import { fetchEventos } from '../api'` desde las pantallas
// sin que importen un archivo específico por endpoint. Cada nuevo endpoint
// va en su propio archivo y se re-exporta acá.

export { API_BASE, apiGet } from './client';
export { fetchEventos, mapEvent } from './eventos';
export { fetchVivos } from './vivos';
export { todayISO } from './utils';
