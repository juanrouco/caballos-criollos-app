import { apiPost, apiPostAuth } from './client';
import { getSession } from './session';

// Registra el Expo Push Token en el backend. El backend deduplica por
// token (es globalmente único por instalación de la app) y guarda
// plataforma + device_id para asociar el token al dispositivo y poder
// invalidar tokens viejos del mismo aparato.
//
// Con sesión va con Bearer, y ahí el backend ata el token a la cuenta: es la
// única forma de que el socio reciba una notificación personal, y lo que lo
// hace aparecer en el selector de destinatario del admin. El id de usuario lo
// saca del token validado y de ningún otro lado — mandarlo en el body sería
// elegir nosotros a quién atar el token, así que `usuario_id` no va nunca.
//
// Sin sesión va anónimo, y eso **desata** el token de la cuenta que lo tenía:
// es lo que convierte el cierre de sesión en una baja de lo personal.
export async function registerPushToken({ token, plataforma, device_id }) {
  const body = { token, plataforma, device_id };
  if (!getSession()) return apiPost('/push/register', body);
  try {
    return await apiPostAuth('/push/register', body);
  } catch (e) {
    // Un Bearer vencido no cae acá: `apiPostAuth` refresca y reintenta solo. Un
    // 401 que llega hasta acá es la sesión perdida del todo, y el registro no
    // se cae con ella: se manda anónimo, que es lo que le corresponde a un
    // teléfono sin sesión. Nunca al revés — un register anónimo "por las
    // dudas" desataría un token que estaba bien atado.
    if (e?.status === 401 && !getSession()) return apiPost('/push/register', body);
    throw e;
  }
}

// Da de baja todos los tokens de este aparato. Se llama cuando el permiso de
// notificaciones no está concedido: sin permiso el token no entrega nada, y
// dejarlo activo hace que el backend siga contando a este teléfono entre los
// destinatarios.
//
// Va **sin** Bearer a propósito: la baja es del aparato, no de la cuenta, y
// tiene que poder mandarse con la sesión cerrada. Es idempotente y siempre
// contesta 200 {ok:true}, así que llamarla de más no hace daño.
export const bajaPushToken = ({ device_id }) => apiPost('/push/baja', { device_id });
