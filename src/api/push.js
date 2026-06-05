import { apiPost } from './client';

// Registra el Expo Push Token en el backend. El backend deduplica por
// token (es globalmente único por instalación de la app) y guarda
// plataforma + device_id para asociar el token al dispositivo y poder
// invalidar tokens viejos del mismo aparato en el futuro.
export const registerPushToken = ({ token, plataforma, device_id }) =>
  apiPost('/push/register', { token, plataforma, device_id });
