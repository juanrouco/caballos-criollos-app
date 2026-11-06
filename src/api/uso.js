// POST /uso — el registro anónimo de cómo se usa la App.
//
// Es el único endpoint del contrato que **no** manda nada que identifique: ni
// Bearer, ni `device_id`. La hora sí viaja —el contrato exige `cuando` completo—
// pero el backend se queda sólo con el día. Y es estricto de a lote: cualquier
// clave de más —`device_id` incluida— hace que rechace el lote entero con un
// 400, así que el cuerpo se arma acá y en ningún otro lado.
//
// Quién junta los eventos y cuándo se mandan está en `src/uso.js`; acá sólo
// viajan. La respuesta se ignora a propósito: esto es fire-and-forget y no tiene
// que poder romper ni demorar una pantalla.
import { apiPost } from './client';

export const USO_PATH = '/uso';

export function enviarUso({ plataforma, version, eventos }) {
  return apiPost(USO_PATH, { plataforma, version, eventos });
}
