// El carnet de socio con QR y la verificación pública (#63/#64).
// Contrato en docs/README.md §Carnet de socio y verificación.
//
// Hay un solo token vivo por cuenta y el QR lleva `{base}/v/{token}`. El token
// NO viaja suelto en ningún campo: sólo dentro de esa URL, así que la app no
// lo manipula ni lo guarda aparte.
//
// Quién tiene carnet lo decide el servidor (cuenta habilitada y con número de
// socio) y lo vuelve a mirar EN CADA ESCANEO: una cuenta que deja de calificar
// hace que su QR deje de validar sin que nadie rote nada.

import { apiGet, apiPostAuth, authedRequest, API_BASE, ApiError } from './client';
import { fixCp1252 } from '../format';

const texto = (s) => (s ? fixCp1252(String(s)) : null);

// Emite el carnet, o devuelve el que ya existe. Es idempotente: la app lo
// llama cada vez que se abre la pantalla, que es la ÚNICA forma de enterarse
// de una rotación hecha desde otro teléfono o por la ACCC — no hay push ni
// evento para eso.
export function emitirCarnet() {
  return apiPostAuth('/perfil/carnet');
}

// Token nuevo: el QR anterior deja de validar en el acto, incluido el impreso
// y el que muestre otro teléfono. No se avisa a nadie.
export function rotarCarnet() {
  return apiPostAuth('/perfil/carnet/rotar');
}

export function mapCarnet(r) {
  const c = r?.carnet || null;
  if (!c?.url) return null;
  return {
    // Lo que codifica el QR. Es también lo único que lleva el token.
    url: c.url,
    // Desde cuándo vale ESTE token: la última rotación, o la emisión si nunca
    // se rotó. Viene como la guarda la base, sin zona horaria.
    emitido: c.emitido || null,
  };
}

// El PDF tamaño tarjeta. Mismo camino que el certificado de inscripción: lo
// baja el downloader nativo con el Bearer, porque no hay URL pública.
//
// La diferencia con el certificado: éste sólo LEE. Si la cuenta todavía no
// tiene token da 404 `sin_carnet`, así que hay que emitir antes.
export async function descargarCarnetPdf(descargar) {
  const path = '/perfil/carnet.pdf';
  return authedRequest(path, async (token) => {
    const archivo = await descargar(`${API_BASE}${path}`, {
      Authorization: `Bearer ${token}`,
    });
    if (!archivo) {
      throw new ApiError({ path, status: 0, detail: 'No se pudo bajar el carnet' });
    }
    return archivo;
  });
}

// ── La verificación pública ─────────────────────────────────────────
//
// Sin token de sesión: la consulta cualquiera que escanee. Devuelve sólo
// nombre, número y categoría — ni email, ni documento, ni nada de vigencia o
// cuota.
//
// Un token mal formado, inexistente, rotado o de una cuenta que ya no califica
// dan la MISMA respuesta byte a byte: 404 con `{"valido": false}` y sin el
// envelope de error. Por eso ese 404 no es una falla sino un veredicto, y se
// devuelve como dato en vez de tirar.
//
// Lo que sí son fallas y siguen tirando: el 429 (demasiadas verificaciones
// inválidas desde esa IP, que en el predio pueden ser de otros teléfonos), y
// el 503/500 del servidor. La app las distingue por status, porque estas dos
// rutas no traen `code`.
export async function verificarSocio(token) {
  try {
    const r = await apiGet(`/socios/verificacion/${encodeURIComponent(token)}`);
    return mapVerificacion(r);
  } catch (e) {
    if (e?.status === 404) return { valido: false, socio: null };
    throw e;
  }
}

export function mapVerificacion(r) {
  if (!r?.valido) return { valido: false, socio: null };
  const s = r.socio || {};
  return {
    valido: true,
    socio: {
      // El de la CUENTA, no el del padrón.
      nombre: texto(s.nombre),
      numero: s.numero || null,
      // Puede venir null: ahí la pantalla no muestra el renglón.
      categoria: texto(s.categoria),
    },
  };
}
