// Los tokens de la sesión, en memoria, y nada más.
//
// Vive en src/api/ porque es el cliente HTTP el que los necesita: cada request
// protegido manda el access en `Authorization: Bearer`, y el refresh tiene que
// poder dispararse desde cualquier llamada que pinche con 401, no sólo desde la
// UI. A propósito este archivo no importa nada: la persistencia la hace
// AuthContext con expo-secure-store (nos hidrata al arrancar y nos escucha), así
// src/api/ se mantiene sin dependencias nativas y los tests no necesitan mocks.
//
// El shape de la sesión (ver `mapSesion` en auth.js):
//   { accessToken, refreshToken, expiresAt, usuarioId }
// `expiresAt` es epoch en ms, ya calculado desde el `expires_in` de la API, para
// no andar restando segundos en cada request.

let session = null;
let listeners = [];

export function getSession() {
  return session;
}

// Guarda la sesión y avisa. Lo llama auth.js (login / refresh / cambio de clave)
// y AuthContext al hidratar desde el almacenamiento seguro.
export function setSession(next) {
  session = next || null;
  notify();
}

export function clearSession() {
  session = null;
  notify();
}

// Suscripción para que AuthContext persista y re-renderice. Devuelve la función
// para desuscribirse.
export function subscribeSession(fn) {
  listeners = [...listeners, fn];
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

function notify() {
  // Copia del array: un listener que se desuscribe en su propio callback no
  // tiene que correr el índice de los que faltan.
  listeners.slice().forEach((fn) => { try { fn(session); } catch {} });
}

// Margen para no mandar un access que vence en el viaje: si le queda menos que
// esto, lo refrescamos antes de salir. 30s cubre de sobra una request móvil.
const SKEW_MS = 30 * 1000;

export function accessExpired(now = Date.now()) {
  if (!session) return true;
  if (!session.expiresAt) return false; // sin dato, lo usamos hasta que dé 401
  return session.expiresAt - SKEW_MS <= now;
}

// Respuesta de /auth/login, /auth/refresh y /auth/clave (los tres comparten
// shape) → la sesión que guardamos. Vive acá, con el resto de lo que sabe del
// shape de la sesión, para que client.js (que refresca) y auth.js (que loguea)
// lo usen sin importarse entre ellos.
export function mapSesion(r) {
  if (!r?.access_token) return null;
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || null,
    // `expires_in` viene en segundos; lo pasamos a epoch en ms una sola vez.
    expiresAt: r.expires_in ? Date.now() + Number(r.expires_in) * 1000 : null,
    usuarioId: r.usuario?.id ?? null,
  };
}
