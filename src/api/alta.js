// El alta de inscripción: las lecturas con que se arma el formulario y el POST
// que la confirma.
//
// Las 7 lecturas (#149) pasan por el mismo núcleo que la web, así que lo que
// ofrecen es lo que la web ofrece. Ninguna escribe y ninguna trae precios: el
// precio lo devuelve el 201 del POST.
//
// ⚠️ El `evento` del alta NO es el id de `GET /eventos` (ese lista los eventos
// del sitio, otra base). Es el `IdEvento` de inscripciones, y el único lugar de
// donde sacarlo es `fetchEventosAlta()`.
//
// Las reglas de negocio NO están acá: las valida el servidor antes de escribir
// (ver docs/README.md §Inscripciones). Estas lecturas existen para que el socio
// elija bien, no para decidir si puede.

import { apiGetAuth, apiPostAuth } from './client';
import { fixCp1252 } from '../format';

const texto = (s) => (s ? fixCp1252(String(s)) : null);

// A1 — los eventos donde el socio puede inscribir hoy (ventana abierta, más los
// cerrados con un «rehacer» habilitado).
export function fetchEventosAlta() {
  return apiGetAuth('/inscripciones/eventos');
}

export function mapEventoAlta(e) {
  return {
    id: e.id,
    nombre: texto(e.nombre),
    inscripcionHasta: e.inscripcion_hasta || null,
    eventoDesde: e.evento_desde || null,
    porRehacer: !!e.por_rehacer,
    // Si el evento no lo pide, el campo Renspa ni se muestra.
    pideRenspa: !!e.pide_renspa,
    // Condiciones del evento (tblEventos.Alerta2 / Alerta3): el HTML de
    // expositores_alerta2.php y alerta3.php, las páginas que la web muestra
    // después de elegir el evento. String o null.
    alerta2: e.alerta2 || null,
    alerta3: e.alerta3 || null,
    // Avisos del evento, con título: los popups. HTML crudo, como el resto.
    alertas: Array.isArray(e.alertas)
      ? e.alertas.map((a) => ({ titulo: texto(a.titulo), html: a.texto || null }))
      : [],
  };
}

// Las alertas generales que la web muestra ANTES de elegir el evento
// (expositores_alerta1.php). Sin nada que mostrar devuelve
// {terminos: null, alertas: []} con 200, y ahí la app saltea la pantalla, como
// la web, que redirige directo al paso 1.
export function fetchAlertasAlta() {
  return apiGetAuth('/inscripciones/alertas');
}

export function mapAlertas(r) {
  const alertas = Array.isArray(r?.alertas)
    ? r.alertas.map((a) => ({ titulo: texto(a.titulo), html: a.texto || null }))
    : [];
  return {
    alertas,
    // ⚠️ `terminos` NO es necesariamente el texto de términos y condiciones: la
    // web imprime ahí el cuerpo de la ÚLTIMA alerta por un defecto del bucle de
    // popups, y la API lo replica a propósito para que los dos muestren lo
    // mismo. Por eso se muestra tal cual y sin rotularlo como términos.
    terminos: r?.terminos || null,
    hayAlgo: alertas.length > 0 || !!r?.terminos,
  };
}

// Las cabañas que este usuario ya usó en sus inscripciones: las del select del
// paso 4 de la web. Son STRINGS, no objetos — no es un catálogo de cabañas, y
// por eso una cabaña nueva tipeada en el alta aparece sola la próxima vez (sale
// de las inscripciones, no de una tabla aparte). Sin ninguna: [].
export function fetchCabanias() {
  return apiGetAuth('/inscripciones/cabanias');
}

// A2 — candidatos por S.B.A. y/o R.P. Hace falta al menos uno de los dos.
export function buscarAnimalesAlta({ sba, rp, sexo, evento }) {
  return apiGetAuth('/inscripciones/animales', { sba, rp, sexo, evento });
}

export function mapAnimalAlta(a) {
  return {
    id: a.id,
    nombre: texto(a.nombre),
    sba: a.sba || null,
    rp: a.rp || null,
    sexo: a.sexo,
    fechaNacimiento: a.fecha_nacimiento || null,
    pelo: texto(a.pelo),
    // Tri-estado a propósito. `false` es «no figura a tu nombre» y el alta lo
    // bloquea (#248); ausente es «no lo sé» y no bloquea nada. Si un deploy
    // dejara de mandar el campo, el alta vuelve a lo de antes —el 422
    // `Pertenencia` al confirmar— en vez de quedarse sin ningún animal
    // elegible.
    propio: a.propio ?? null,
    // null si la búsqueda fue sin evento. Con una inscripción rechazada también
    // es true: el rechazo es definitivo para ese evento.
    yaInscripto: a.ya_inscripto ?? null,
  };
}

// A3 — lo que el evento ofrece para ESE animal: morfología, tipo y aptitud, y
// las pruebas con sus categorías.
export function fetchOpcionesAlta(evento, { animal, sexo, presentacion }) {
  return apiGetAuth(`/inscripciones/eventos/${encodeURIComponent(evento)}/opciones`, {
    animal, sexo, presentacion,
  });
}

function mapCategoria(c) {
  return {
    id: c.id,
    nombre: texto(c.nombre),
    // Si tiene su propio SI/NO: varias `propia` de la misma prueba se eligen
    // juntas, las comunes se reemplazan entre sí (ver src/reglasAlta.js). Lo
    // calcula la misma función que el POST usa para el 422
    // PruebaCategoriaUnica, con el evento de la consulta.
    propia: !!c.propia,
    habilitada: !!c.habilitada,
    cupo: c.cupo ?? null,
    ocupacion: c.ocupacion ?? null,
    // La prueba 5 (Freno de Oro) es lista de espera y no bloquea por cupo.
    listaEspera: !!c.lista_espera,
  };
}

export function mapOpciones(r) {
  const participacion = (p) =>
    p ? { categoria: p.categoria ? { id: p.categoria.id, nombre: texto(p.categoria.nombre) } : null, habilitada: !!p.habilitada } : null;
  return {
    morfologia: participacion(r?.morfologia),
    tipoAptitud: participacion(r?.tipo_aptitud),
    pruebas: Array.isArray(r?.pruebas)
      ? r.pruebas.map((p) => ({
          id: p?.prueba?.id,
          nombre: texto(p?.prueba?.nombre),
          // 'individual' | 'yunta' | 'equipo'
          modalidad: p?.modalidad || 'individual',
          categorias: Array.isArray(p?.categorias) ? p.categorias.map(mapCategoria) : [],
        }))
      : [],
  };
}

// A4 — jinetes disponibles y validados. `tiene_deuda` se evalúa a la fecha del
// evento, no a la de hoy, y un jinete con deuda no se puede elegir.
export function buscarJinetes({ nombre, apellido, documento, evento }) {
  return apiGetAuth('/jinetes', { nombre, apellido, documento, evento });
}

export function mapJinete(j) {
  return {
    id: j.id,
    nombre: texto(j.nombre),
    apellido: texto(j.apellido),
    documento: j.documento || null,
    tieneDeuda: !!j.tiene_deuda,
  };
}

// A6 — compañeros de yunta por SBA: hembra se busca en Exis, el resto en Pdre, y
// en los dos casos también en Extr. `permitido` es la regla J-1: false cuando
// ese animal YA está inscripto en esa prueba y categoría con otro compañero.
// Sólo se evalúa con evento, prueba y categoría, como la web.
//
// ⚠️ El POST no cubre J-1 salvo de rebote, así que un `permitido: false` que la
// app ignore se inscribe igual y deja una yunta cruzada.
export function buscarYuntaCandidatos({ sba, sexo, evento, prueba, categoria, animal }) {
  return apiGetAuth('/inscripciones/yunta-candidatos', { sba, sexo, evento, prueba, categoria, animal });
}

export function mapYuntaCandidato(c) {
  return {
    id: c.id,
    nombre: texto(c.nombre),
    sba: c.sba || null,
    rp: c.rp || null,
    sexo: c.sexo,
    permitido: c.permitido !== false,
  };
}

// A7 — los equipos donde figura este animal, del año en curso. La lista ES la
// garantía de que el animal pertenece al equipo (J-2): el POST sólo verifica
// que el equipo exista.
//
// `animales` trae el padrón con el jinete de cada uno: de ahí salen los dos
// compañeros y el jinete del propio animal (J-3), que el socio no elige.
// `habilitado` es false con algún jinete con deuda (sus nombres vienen en
// `jinetes_inhabilitados`); `bloqueado` es true si un integrante ya está en
// OTRO equipo en esa prueba y categoría, y sólo se evalúa con las dos.
export function fetchEquipos({ animal, evento, prueba, categoria }) {
  return apiGetAuth('/equipos', { animal, evento, prueba, categoria });
}

export function mapEquipo(e) {
  return {
    id: e.id,
    nombre: texto(e.nombre),
    anio: e.anio ?? null,
    animales: Array.isArray(e.animales)
      ? e.animales.map((a) => ({
          id: a.id,
          nombre: texto(a.nombre),
          sba: a.sba || null,
          rp: a.rp || null,
          sexo: a.sexo,
          jinete: a.jinete
            ? { id: a.jinete.id, nombre: texto(a.jinete.nombre), apellido: texto(a.jinete.apellido) }
            : null,
        }))
      : [],
    habilitado: e.habilitado !== false,
    jinetesInhabilitados: Array.isArray(e.jinetes_inhabilitados) ? e.jinetes_inhabilitados.map(texto) : [],
    bloqueado: e.bloqueado === true,
    bloqueadoPor: texto(e.bloqueado_por),
  };
}

// A8 — crear un equipo: el `equipo_agregar.php` de la web, que es de donde
// salen todas las reglas de abajo. Queda a nombre del usuario del token y en el
// año en curso (`anio` no se manda).
//
// Exactamente 3 animales, en orden, cada uno con su jinete — también el animal
// que se está inscribiendo, cuyo jinete acá SÍ lo elige el socio (distinto del
// alta, donde sale del padrón del equipo: regla J-3).
//
// `evento` es obligatorio y conviene mandar también `prueba` y `categoria`: el
// 201 es el mismo elemento que daría `GET /equipos` con esos parámetros, y
// `habilitado` / `bloqueado` sólo se evalúan con ellos. Un equipo recién creado
// puede venir bloqueado (un integrante ya está en otro equipo de esa prueba).
//
// El 422 es `code: equipo_invalido` — NO `inscripcion_invalida` — con
// `errores: [{codigo, campo}]` sin texto (src/erroresInscripcion.js los
// traduce). Un `animal` o `jinete` faltante también es 422, no 400.
export function crearEquipo(payload) {
  return apiPostAuth('/equipos', payload);
}

// El equipo creado, listo para dejarlo elegido sin volver a pedir la lista.
//
// ⚠️ Si el equipo se creó pero la lectura posterior falló, el 201 trae sólo
// `{equipo: {id}}`. Eso NO se puede mapear como un equipo vacío — `mapEquipo`
// devolvería un trío sin integrantes y habilitado —, así que se marca
// `incompleto` y la pantalla refresca con `GET /equipos`.
export function mapEquipoCreado(r) {
  const e = r?.equipo;
  if (!e?.id) return null;
  if (!Array.isArray(e.animales)) return { id: e.id, incompleto: true };
  return { ...mapEquipo(e), incompleto: false };
}

// El integrante como lo pide el payload.
//
// ⚠️ El `sexo` NO es el de la yunta: es la etiqueta que eligió el socio al
// buscar el animal (el `data-sexo` del popup de la web), y admite el 0 —
// `IdExis` 2; `IdPdre` 1 o 0 (castrado); `IdExtr` 0, 1 o 2. Los castrados en
// `IdPdre` son cuatro de cada diez integrantes reales, así que forzar 1 como
// hace `companieroAPayload` dejaría la mayoría afuera.
export function integranteAPayload(animal, sexo) {
  const base = animalAPayload(animal?.id);
  if (!base) return null;
  // Sin castear: `Number(null)` es 0, y 0 es un sexo válido (castrado), así que
  // un casillero sin sexo se mandaría como castrado en vez de fallar.
  const s = base.tabla === 'IdExis' ? 2 : sexo;
  if (s !== 0 && s !== 1 && s !== 2) return null;
  return { ...base, sexo: s };
}

// A5 — domadores.
export function buscarDomadores({ nombre, apellido, documento }) {
  return apiGetAuth('/domadores', { nombre, apellido, documento });
}

// El id compuesto de `GET /animales` ("exis:9059010") → el par {tabla, id} que
// pide el POST. Es la única traducción de ids que hace el alta.
const TABLA_POR_FUENTE = { pdre: 'IdPdre', exis: 'IdExis', extr: 'IdExtr' };

export function animalAPayload(id) {
  const [fuente, local] = String(id || '').split(':');
  const tabla = TABLA_POR_FUENTE[fuente];
  if (!tabla || !local) return null;
  return { tabla, id: Number(local) };
}

// El compañero como lo pide el payload. `tabla` y `sexo` tienen que ser
// coherentes (IdExis ⇔ 2, IdPdre ⇔ 1; IdExtr admite los dos) o el POST da 400,
// así que el sexo sale del propio candidato y no de lo que se tipeó.
export function companieroAPayload(candidato) {
  const base = animalAPayload(candidato?.id);
  if (!base) return null;
  const sexo = base.tabla === 'IdExis' ? 2 : base.tabla === 'IdPdre' ? 1 : Number(candidato.sexo);
  if (sexo !== 1 && sexo !== 2) return null;
  return { ...base, sexo };
}

// POST — el único endpoint que escribe. Un 201 es un alta confirmada SIEMPRE,
// incluso si viene con `pruebas: null`: reintentar daría 409.
export function crearInscripcion(payload) {
  return apiPostAuth('/inscripciones', payload);
}

export function mapAltaCreada(r) {
  const i = r?.inscripcion;
  if (!i) return null;
  return {
    id: i.id,
    estado: i.estado,
    estadoNombre: texto(i.estado_nombre),
    rechazoFuncional: !!i.rechazo_funcional,
    // Puede ser null con un tipo de socio raro: la pantalla no muestra "0".
    precio: i.precio ?? null,
    // null cuando la lectura posterior al alta falló; el alta se hizo igual.
    pruebas: Array.isArray(i.pruebas)
      ? i.pruebas.map((p) => ({
          prueba: p.prueba, categoria: p.categoria,
          listaEspera: !!p.lista_espera, precio: p.precio ?? null,
        }))
      : null,
  };
}
