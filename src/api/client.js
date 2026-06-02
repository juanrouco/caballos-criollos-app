// Cliente HTTP base + selección de host por entorno.
//
// En dev (__DEV__ = true) usa la API local; en prod, el dominio público.
// Cualquiera de las dos URLs se puede sobreescribir desde .env (sólo las
// variables que empiezan con EXPO_PUBLIC_ llegan al bundle del cliente).
// Hay que reiniciar `expo start` después de tocar .env.
//
// El simulador iOS no resuelve "localhost" al host — necesita la IP del Mac
// en la LAN. La que figura como fallback fue la detectada al inicializar el
// proyecto; cambiarla en .env si tu IP es otra.

const DEV_DEFAULT  = 'http://192.168.68.106:8090/api';
const PROD_DEFAULT = 'https://caballoscriollos.com/api';

export const API_BASE = __DEV__
  ? (process.env.EXPO_PUBLIC_API_BASE_DEV  || DEV_DEFAULT)
  : (process.env.EXPO_PUBLIC_API_BASE_PROD || PROD_DEFAULT);

export async function apiGet(path, params) {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  const res = await fetch(`${API_BASE}${path}${qs}`);
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.message || ''; } catch {}
    throw new Error(`${path} → HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}
