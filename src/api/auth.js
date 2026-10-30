// Autenticación de la app: login, logout y cambio de clave.
//
// Son las mismas credenciales con las que el socio entra a caballoscriollos.com
// (usuario o email + clave). Estos endpoints existen sólo en la API nueva.
// Contrato completo en docs/README.md §Autenticación.

import { apiPost, apiPostAuth } from './client';
import { getSession, setSession, clearSession, mapSesion } from './session';

// El recupero de clave no pasa por la API: se abre la página del sitio en el
// navegador. El socio recibe por mail un link de un solo uso que vence en 60
// minutos y elige la clave nueva ahí; con esa clave entra a la app y al sitio.
export const OLVIDO_CLAVE_URL = 'https://caballoscriollos.com/espanol/expositores_olvidoclave.php';

// `usuario` puede ser el usuario o el email de la cuenta. La API le hace trim y
// no distingue mayúsculas; el trim lo hacemos igual acá para que un espacio que
// se cuela en el teclado del teléfono no termine en un 401.
export async function login(usuario, clave) {
  const body = await apiPost('/auth/login', { usuario: String(usuario ?? '').trim(), clave });
  const sesion = mapSesion(body);
  if (!sesion) throw new Error('La API no devolvió la sesión');
  setSession(sesion);
  return sesion;
}

// Cierra la sesión del lado del servidor (ese refresh y toda su familia) y
// borra la local. El 204 es idempotente y no confirma nada, así que si el POST
// falla —sin red, token ya cerrado— la sesión local se borra igual: no tiene
// sentido dejar al socio adentro porque no hubo señal.
export async function logout() {
  const s = getSession();
  if (s?.refreshToken) {
    try { await apiPost('/auth/logout', { refresh_token: s.refreshToken }); } catch {}
  }
  clearSession();
}

// Cambia la clave de la cuenta, para el sitio y para la app. La respuesta es una
// sesión nueva con el mismo shape que el login: el cambio cierra todas las
// sesiones de la app de esa cuenta, incluida la de este teléfono, así que hay
// que reemplazar el par que teníamos por el que vuelve acá.
export async function cambiarClave(claveActual, claveNueva) {
  const body = await apiPostAuth('/auth/clave', {
    clave_actual: claveActual,
    clave_nueva: claveNueva,
  });
  const sesion = mapSesion(body);
  if (!sesion) throw new Error('La API no devolvió la sesión');
  setSession(sesion);
  return sesion;
}
