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

// Mensaje único para fallas de red (sin internet, DNS caído, timeout). `fetch`
// tira un TypeError ("Network request failed") que no sirve mostrarle al
// usuario; lo traducimos a algo accionable en español. Las pantallas ya pintan
// e.message en sus cards de error, así que con esto muestran algo entendible.
export const OFFLINE_MSG = 'Sin conexión. Revisá tu internet e intentá de nuevo.';

// Envuelve fetch para que un fallo de red se propague como OFFLINE_MSG en vez
// del TypeError crudo. Los errores HTTP (4xx/5xx) NO pasan por acá — esos son
// respuestas válidas y se manejan abajo con el status.
async function safeFetch(url, opts) {
  try {
    // Sin opts (GET) llamamos fetch(url) a secas — mismo shape que antes.
    return await (opts ? fetch(url, opts) : fetch(url));
  } catch {
    throw new Error(OFFLINE_MSG);
  }
}

export async function apiGet(path, params) {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  const res = await safeFetch(`${API_BASE}${path}${qs}`);
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.message || ''; } catch {}
    throw new Error(`${path} → HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.message || ''; } catch {}
    throw new Error(`${path} → HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json().catch(() => ({}));
}
