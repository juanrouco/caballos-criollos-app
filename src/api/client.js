// Cliente HTTP base + selección de host por entorno.
//
// En dev (__DEV__ = true) usa la API local; en prod, el dominio público.
// Cualquiera de las dos URLs se puede sobreescribir desde .env (sólo las
// variables que empiezan con EXPO_PUBLIC_ llegan al bundle del cliente).
// Hay que reiniciar `expo start` después de tocar .env.
//
// OJO con el prefijo de ruta: la API vieja (PHP 5.6) vivía en un subdirectorio
// de caballoscriollos.com y las rutas colgaban de `/api`. La migrada a PHP 8
// tiene su propio subdominio y sirve las rutas en la raíz — de ahí que la base
// de prod NO lleve `/api` y la local sí (el Docker la expone en /api).
//
// El simulador iOS no resuelve "localhost" al host — necesita la IP del Mac
// en la LAN. La que figura como fallback fue la detectada al inicializar el
// proyecto; cambiarla en .env si tu IP es otra.

import { getSession, setSession, clearSession, accessExpired, mapSesion } from './session';

const DEV_DEFAULT  = 'http://192.168.68.106:8090/api';
const PROD_DEFAULT = 'https://api.caballoscriollos.com';

export const API_BASE = __DEV__
  ? (process.env.EXPO_PUBLIC_API_BASE_DEV  || DEV_DEFAULT)
  : (process.env.EXPO_PUBLIC_API_BASE_PROD || PROD_DEFAULT);

// Mensaje único para fallas de red (sin internet, DNS caído, timeout). `fetch`
// tira un TypeError ("Network request failed") que no sirve mostrarle al
// usuario; lo traducimos a algo accionable en español. Las pantallas ya pintan
// e.message en sus cards de error, así que con esto muestran algo entendible.
export const OFFLINE_MSG = 'Sin conexión. Revisá tu internet e intentá de nuevo.';

// Error HTTP de la API, con el status y el `code` a mano.
//
// `message` mantiene el formato de siempre (`<path> → HTTP <status>: <texto del
// backend>`): es lo que las pantallas ya pintan en sus cards de error. `detail`
// es el texto del backend solo, para los casos donde hay que mostrarlo tal cual
// (el login y el cambio de clave: los mensajes del README están redactados para
// la pantalla). `code` es el string estable que trae `/auth/*` e
// `/inscripciones` para elegir qué mostrar sin parsear el mensaje.
export class ApiError extends Error {
  constructor({ path, status, detail, code, campo, motivo, errores }) {
    super(`${path} → HTTP ${status}${detail ? `: ${detail}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail || '';
    this.code = code || '';
    // El 400 `entrada_invalida` dice en qué parámetro falló. El `message` que
    // lo acompaña está escrito para quien programa («se esperaba un entero
    // positivo»), así que las pantallas traducen por `campo` y no lo muestran.
    this.campo = campo || '';
    // El 422 `baja_no_permitida` no trae `errores` sino un `motivo` suelto
    // (`plazo_cerrado`, `no_propietario`, `con_resultados`, …): la razón por la
    // que esa baja no se puede, que la pantalla traduce sin leer el texto.
    this.motivo = motivo || '';
    // El 422 de POST /inscripciones trae la lista de reglas que no se
    // cumplieron ({codigo, campo, prueba, categoria}), sin texto: el mensaje
    // que ve el socio lo pone la app (src/erroresInscripcion.js).
    this.errores = Array.isArray(errores) ? errores : null;
  }
}

// Envuelve fetch para que un fallo de red se propague como OFFLINE_MSG en vez
// del TypeError crudo. Los errores HTTP (4xx/5xx) NO pasan por acá — esos son
// respuestas válidas y se manejan abajo con el status.
async function safeFetch(url, opts) {
  try {
    // Sin opts (GET sin headers) llamamos fetch(url) a secas — mismo shape que antes.
    return await (opts ? fetch(url, opts) : fetch(url));
  } catch {
    throw new Error(OFFLINE_MSG);
  }
}

function queryString(params) {
  if (!params) return '';
  return '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
}

// ── Observador de errores HTTP ─────────────────────────────────────
//
// El registro de uso (`src/uso.js`) quiere contar los errores que ve el socio.
// Se suscribe acá en vez de que el cliente lo importe: `/uso` se manda con el
// mismo `apiPost` que todo lo demás, así que un import de vuelta sería un ciclo.
// Si nadie observa, no cuesta nada.
//
// Sólo pasan por acá los errores HTTP. Las fallas de red salen antes, en
// `safeFetch`, y es correcto que no se registren: sin conexión tampoco habría
// con qué mandar el registro.
let observador = null;

export function observarErroresHttp(fn) {
  observador = fn;
  return () => { if (observador === fn) observador = null; };
}

async function raise(res, path) {
  let detail = '';
  let code = '';
  let campo = '';
  let motivo = '';
  let errores = null;
  try {
    const body = await res.json();
    detail = body?.message || '';
    code = body?.code || '';
    campo = body?.campo || '';
    motivo = body?.motivo || '';
    errores = body?.errores || null;
  } catch {}
  if (res.status >= 500 && !code) detail = ERROR_SERVIDOR_MSG;
  // Nunca dejar que el observador rompa el camino del error.
  try { observador?.({ path, status: res.status, code }); } catch {}
  throw new ApiError({ path, status: res.status, detail, code, campo, motivo, errores });
}

// Un 2xx que no trae JSON no es una respuesta usable, y pasa: un error fatal de
// PHP sale con status 200 y cuerpo HTML, y cualquier proxy puede meter su propia
// página de error. `res.json()` tira ahí un SyntaxError crudo («JSON Parse
// error: Unexpected character: <») que las pantallas pintaban tal cual en la
// card de error. Lo convertimos en un ApiError como cualquier otro, para que el
// socio lea algo que pueda hacer. El 204 (y el 205) no traen cuerpo a propósito
// — `/auth/logout` es uno — así que esos valen vacíos.
export const RESPUESTA_RARA_MSG = 'El servidor respondió algo que no entendemos. Probá de nuevo en un rato.';

// Un 5xx sin `code` no trae nada que el socio pueda leer. Desde #249 un fatal
// de PHP en la API sale como 500 con el envelope de siempre —antes era un 200
// con HTML, que caía en RESPUESTA_RARA_MSG—, pero su `message` es «Internal
// Server Error» en prod y «Fatal: <el error de PHP>» en dev: inglés, o las
// entrañas del servidor. Se reemplaza por un texto nuestro.
//
// Los 503 con `code` (`mantenimiento`, `base_no_disponible`) quedan afuera: ésos
// los traduce cada pantalla por el `code`, y el alta además le agrega que no
// quedó nada anotado (src/erroresInscripcion.js).
export const ERROR_SERVIDOR_MSG = 'Hubo un problema en el servidor. Probá de nuevo en un rato.';

async function leerJson(res, path) {
  try {
    return await res.json();
  } catch {
    if (res.status === 204 || res.status === 205) return {};
    throw new ApiError({ path, status: res.status, detail: RESPUESTA_RARA_MSG });
  }
}

export async function apiGet(path, params, headers) {
  const res = await safeFetch(`${API_BASE}${path}${queryString(params)}`, headers ? { headers } : undefined);
  if (!res.ok) await raise(res, path);
  return leerJson(res, path);
}

// La baja de una inscripción es el único DELETE del contrato. Sin body de
// entrada; el 200 trae cuerpo, pero `leerJson` tolera el vacío por si algún
// DELETE futuro contesta 204.
export async function apiDelete(path, headers) {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { ...headers },
  });
  if (!res.ok) await raise(res, path);
  return leerJson(res, path);
}

export async function apiPost(path, body, headers) {
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await raise(res, path);
  // /auth/logout responde 204 sin body; el resto devuelve JSON.
  return leerJson(res, path);
}

// ── Requests protegidos ────────────────────────────────────────────
//
// El flujo del README (§Autenticación): el access dura 60 minutos y va en
// `Authorization: Bearer`; cuando vence, `POST /auth/refresh` devuelve uno nuevo
// **y un refresh nuevo** (el anterior deja de servir).
//
// ⚠️ El refresh rota, y reusar uno ya usado el servidor lo lee como token
// robado: cierra la sesión entera, no sólo ese token. Por eso el refresh es de
// un solo vuelo — si dos requests pinchan con 401 a la vez, las dos esperan el
// mismo refresh en lugar de mandar dos y matar la sesión.

let refreshing = null;

function refreshOnce() {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function doRefresh() {
  const s = getSession();
  if (!s?.refreshToken) {
    clearSession();
    throw new ApiError({ path: '/auth/refresh', status: 401, detail: 'No autenticado' });
  }
  let body;
  try {
    body = await apiPost('/auth/refresh', { refresh_token: s.refreshToken });
  } catch (e) {
    // 401 = el refresh venció, fue revocado, ya se usó, o la cuenta cambió de
    // estado: la sesión está perdida y la app vuelve al login. Cualquier otra
    // falla (sin red, 503) deja la sesión como está para reintentar después.
    if (e instanceof ApiError && e.status === 401) clearSession();
    throw e;
  }
  const next = mapSesion(body);
  if (!next) {
    clearSession();
    throw new ApiError({ path: '/auth/refresh', status: 401, detail: 'Respuesta de refresh sin token' });
  }
  setSession(next);
  return next;
}

// Corre `run(accessToken)` con una sesión válida: refresca antes si el access ya
// venció, y ante un 401 refresca y reintenta una sola vez.
//
// Exportada como `authedRequest` porque no todo request protegido pasa por
// fetch: la descarga del certificado en PDF la hace el downloader nativo, y
// necesita el mismo token fresco y el mismo refresh de un solo vuelo.
export async function authedRequest(path, run) {
  return authed(path, run);
}

async function authed(path, run) {
  if (!getSession()) throw new ApiError({ path, status: 401, detail: 'No autenticado' });
  if (accessExpired()) await refreshOnce();

  const token = () => {
    const s = getSession();
    // Otra request pudo haber perdido la sesión mientras esperábamos.
    if (!s) throw new ApiError({ path, status: 401, detail: 'No autenticado' });
    return s.accessToken;
  };

  try {
    return await run(token());
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    await refreshOnce();
    try {
      return await run(token());
    } catch (e2) {
      // Un 401 con un access recién emitido no se arregla reintentando.
      if (e2 instanceof ApiError && e2.status === 401) clearSession();
      throw e2;
    }
  }
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export function apiGetAuth(path, params) {
  return authed(path, (token) => apiGet(path, params, bearer(token)));
}

export function apiPostAuth(path, body) {
  return authed(path, (token) => apiPost(path, body, bearer(token)));
}

export function apiDeleteAuth(path) {
  return authed(path, (token) => apiDelete(path, bearer(token)));
}
