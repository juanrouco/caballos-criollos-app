// Perfil del socio logueado: los datos de la pantalla Mi cuenta.
//
// Protegido: devuelve sólo los datos del usuario del access token (no recibe
// id). La API no informa si el socio está al día — no hay cuota, deuda ni
// estado de cuenta. Contrato en docs/README.md §Perfil.

import { apiGetAuth } from './client';
import { fixCp1252 } from '../format';

export function fetchPerfil() {
  return apiGetAuth('/perfil');
}

// Los teléfonos vienen partidos en país / área / número, y el objeto entero es
// null si las tres partes están vacías. Lo armamos como un solo string para
// mostrar; si no hay número, no hay teléfono que mostrar.
function formatTelefono(tel) {
  if (!tel?.numero) return null;
  const pais = tel.cod_pais ? `+${tel.cod_pais} ` : '';
  const area = tel.cod_area ? `(${tel.cod_area}) ` : '';
  return `${pais}${area}${tel.numero}`.trim();
}

export function mapPerfil(p) {
  if (!p) return null;
  const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ').trim();
  return {
    id: p.id,
    // Nombres legacy pueden traer bytes de control de cp1252, como en los
    // resultados; mismo parche defensivo que en el resto de la app.
    nombre: nombre ? fixCp1252(nombre) : null,
    email: p.email || null,
    telefono: formatTelefono(p.telefono),
    celular: formatTelefono(p.celular),
    socio: p.socio
      ? {
          numero: p.socio.numero || null,
          // ⚠️ Es la CATEGORÍA del socio (Activo, Adherente, Vitalicio...), no
          // una vigencia: "Activo" no quiere decir "al día". Se rotula como
          // categoría en la pantalla.
          categoria: p.socio.categoria ? fixCp1252(p.socio.categoria) : null,
          nombrePadron: p.socio.nombre_padron ? fixCp1252(p.socio.nombre_padron) : null,
        }
      : null,
  };
}
