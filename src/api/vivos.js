import { apiGet } from './client';

export const fetchVivos = (params) => apiGet('/vivos', params);
