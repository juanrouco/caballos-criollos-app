// Inscripciones del socio logueado: listado, detalle, certificado y baja.
//
// Todos protegidos, con la misma regla de pertenencia: una inscripción de otro
// socio da 404 `no_encontrada`, igual que un id que no existe. Contrato en
// docs/README.md §Inscripciones.

import { apiGetAuth, apiDeleteAuth, authedRequest, API_BASE, ApiError } from './client';
import { fixCp1252 } from '../format';

export function fetchInscripciones() {
  return apiGetAuth('/inscripciones');
}

export function fetchInscripcion(id) {
  return apiGetAuth(`/inscripciones/${encodeURIComponent(id)}`);
}

export function fetchCertificado(id) {
  return apiGetAuth(`/inscripciones/${encodeURIComponent(id)}/certificado`);
}

// La baja (#150). Va por el mismo núcleo que `expositores_inscripcion_del.php`
// de la web, y escribe en una transacción: la inscripción y sus pruebas quedan
// en `Estado = 0`, la habilitación de rehacer queda usada si la hubo, y se
// manda el certificado de baja por mail.
//
// No se pregunta antes si se puede: la regla ya viene en `puede_baja` del
// listado y del detalle. Pero el predicado se vuelve a evaluar del lado del
// servidor, así que la pantalla igual tiene que saber leer el 409 y el 422 —
// entre que se pintó la pantalla y el socio apretó pudo cerrarse el plazo, o
// alguien pudo cargar un resultado.
export function bajaInscripcion(id) {
  return apiDeleteAuth(`/inscripciones/${encodeURIComponent(id)}`);
}

const texto = (s) => (s ? fixCp1252(String(s)) : null);

function mapAnimal(a) {
  if (!a) return null;
  return {
    id: a.id || null,
    nombre: texto(a.nombre),
    sba: a.sba || null,
    rp: a.rp || null,
  };
}

function mapPrueba(p) {
  return {
    id: p?.prueba?.id ?? null,
    nombre: texto(p?.prueba?.nombre),
    categoria: texto(p?.categoria?.nombre),
    listaEspera: !!p?.lista_espera,
    // Sólo vienen en el detalle; en el listado quedan en null.
    jinete: texto(p?.jinete),
    domador: texto(p?.domador),
    yunta: p?.yunta ? mapAnimal(p.yunta) : null,
    equipo: texto(p?.equipo),
  };
}

export function mapInscripcion(i) {
  if (!i) return null;
  return {
    id: i.id,
    evento: i.evento
      ? {
          id: i.evento.id,
          nombre: texto(i.evento.nombre),
          fecha: i.evento.fecha || null,
          inscripcionHasta: i.evento.inscripcion_hasta || null,
        }
      : null,
    animal: mapAnimal(i.animal),
    estado: i.estado,
    estadoNombre: texto(i.estado_nombre),
    criaAjena: !!i.cria_ajena,
    sexoNombre: texto(i.sexo_nombre),
    presentacionNombre: texto(i.presentacion_nombre),
    condicionNombre: texto(i.condicion_nombre),
    // null es «No Participa», como en la web: lo decide la pantalla, no acá.
    morfologia: i.morfologia ? texto(i.morfologia.categoria) : null,
    tipoAptitud: i.tipo_aptitud ? texto(i.tipo_aptitud.categoria || i.tipo_aptitud.nombre) : null,
    pruebas: Array.isArray(i.pruebas) ? i.pruebas.map(mapPrueba) : [],
    expositor: texto(i.expositor),
    cabania: texto(i.cabania),
    puedeBaja: !!i.puede_baja,
    puedeRehacer: !!i.puede_rehacer,
    unidadesRelacionadas: mapUnidades(i.unidades_relacionadas),
  };
}

function mapUnidades(us) {
  if (!Array.isArray(us)) return [];
  return us.map((u) => ({
    inscripcion: u.inscripcion ?? null,
    animal: mapAnimal(u.animal),
    expositor: texto(u.expositor),
    cabania: texto(u.cabania),
    prueba: texto(u?.prueba?.nombre),
    categoria: texto(u?.categoria?.nombre),
    equipo: texto(u.equipo),
    // 'declarado' = lo nombra esta inscripción; 'declarante' = otra
    // inscripción del evento nombra a este animal.
    direccion: u.direccion || null,
  }));
}

// El 200 de la baja. `rehacer` dice que se gastó una habilitación de rehacer,
// y sólo entonces vienen las `unidades_relacionadas` — las yuntas y los equipos
// que quedaron tocados, leídos ANTES de la baja. Es la alerta que la web muestra
// después de eliminar, y el socio la necesita: esas otras inscripciones lo
// nombran y hay que rearmarlas.
export function mapBaja(r) {
  const i = r?.inscripcion || null;
  return {
    id: i?.id ?? null,
    estado: i?.estado ?? null,
    rehacer: r?.rehacer === true,
    unidadesRelacionadas: mapUnidades(r?.unidades_relacionadas),
  };
}

// `abiertas` viene agrupada por evento y trae TAMBIÉN los eventos con la
// inscripción abierta donde el socio no anotó nada (lista vacía), igual que la
// web. `cerradas` es una lista plana de inscripciones. Son dos formas
// distintas: la pantalla las renderiza como dos secciones, no las concatena.
export function mapListado(r) {
  return {
    abiertas: Array.isArray(r?.abiertas)
      ? r.abiertas.map((g) => ({
          evento: {
            id: g?.evento?.id,
            nombre: texto(g?.evento?.nombre),
            inscripcionHasta: g?.evento?.inscripcion_hasta || null,
          },
          inscripciones: Array.isArray(g?.inscripciones) ? g.inscripciones.map(mapInscripcion) : [],
        }))
      : [],
    cerradas: Array.isArray(r?.cerradas) ? r.cerradas.map(mapInscripcion) : [],
  };
}

export function mapCertificado(c) {
  if (!c) return null;
  const ficha = (a) =>
    a ? { nombre: texto(a.nombre), sba: a.sba || null, gen: texto(a.gen), pelo: texto(a.pelo) } : null;
  return {
    numero: c.numero,
    tipo: texto(c.tipo),
    lugar: texto(c.lugar),
    fecha: c.fecha || null,
    estadoNombre: texto(c.estado_nombre),
    evento: c.evento ? { id: c.evento.id, nombre: texto(c.evento.nombre) } : null,
    animal: c.animal
      ? {
          ...mapAnimal(c.animal),
          nacimiento: c.animal.nacimiento || null,
          sexo: texto(c.animal.sexo),
          presentacion: texto(c.animal.presentacion),
          gen: texto(c.animal.gen),
          pelo: texto(c.animal.pelo),
        }
      : null,
    pedigri: c.pedigri
      ? {
          padre: ficha(c.pedigri.padre),
          madre: ficha(c.pedigri.madre),
        }
      : null,
    condicion: texto(c.condicion),
    criador: texto(c.criador),
    propietario: texto(c.propietario),
    expositor: texto(c.expositor),
    cabania: texto(c.cabania),
    ubicacion: c.ubicacion
      ? [texto(c.ubicacion.localidad), texto(c.ubicacion.provincia)].filter(Boolean).join(', ') || null
      : null,
    morfologia: c.morfologia ? texto(c.morfologia.categoria) : null,
    // El animal corre funcionales sin inspección aprobada. No frena nada — la
    // inscripción queda Definitiva igual — pero el PDF lo imprime y el socio
    // tiene que verlo antes de presentarse. El texto lo pone el backend
    // (TextosCertificado::NO_INSPECCIONADO), no la app: es la redacción oficial.
    noInspeccionado: !!c.no_inspeccionado,
    avisoNoInspeccionado: texto(c?.textos?.no_inspeccionado),
    pruebas: Array.isArray(c.pruebas)
      ? c.pruebas.map((p) => ({
          nombre: texto(p.prueba),
          categoria: texto(p.categoria),
          listaEspera: !!p.lista_espera,
          jinete: texto(p.jinete),
          domador: texto(p.domador),
          yunta: texto(p?.yunta?.nombre),
          equipo: texto(p.equipo),
        }))
      : [],
  };
}

// El PDF del certificado no tiene URL pública ni link firmado: se baja con el
// token y se comparte como archivo.
//
// La descarga la hace el downloader nativo, no fetch, así que va envuelta en
// authedRequest para entrar con un access fresco y compartir el refresh de un
// solo vuelo. Lo que el downloader NO expone es el status, así que un 401 que
// apareciera igual no se distingue de otra falla y no se reintenta; como
// acabamos de asegurar el token, esa ventana es de 60 minutos.
//
// `descargar(url, headers)` se inyecta en vez de importar expo-file-system acá:
// src/api/ no toca módulos nativos (misma razón que session.js), y así esto se
// testea sin mocks. La implementación real vive en src/descargas.js.
export async function descargarCertificadoPdf(id, descargar) {
  const path = `/inscripciones/${encodeURIComponent(id)}/certificado.pdf`;
  return authedRequest(path, async (token) => {
    const archivo = await descargar(`${API_BASE}${path}`, {
      Authorization: `Bearer ${token}`,
    });
    if (!archivo) {
      throw new ApiError({ path, status: 0, detail: 'No se pudo bajar el certificado' });
    }
    return archivo;
  });
}
