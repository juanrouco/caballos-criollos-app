// Los códigos del 422 de POST /inscripciones y de POST /equipos, en castellano.
//
// La API manda `errores: [{codigo, campo, prueba, categoria}]` SIN texto, a
// propósito: el mensaje que lee el socio lo pone la app. Son las reglas del
// validador de la web (docs/README.md §Inscripciones y, del lado del backend,
// `plan-inscripcionvalidator.md` §1.2).
//
// Cómo están redactados:
// - Dicen qué pasa y, cuando se puede, qué hacer. "Elegí un jinete" sirve;
//   "JineteFaltante" no.
// - Nada de jerga del backend: el socio no sabe qué es una tabla ni un cupo
//   calculado al renderizar.
// - En segunda persona, como el resto de la app.

const TEXTOS = {
  // ── Reglas del validador (las que la web evaluaba en JS o al renderizar) ──
  VentanaCerrada: 'La inscripción a este evento ya está cerrada.',
  EventoInvalido: 'Este evento no admite inscripciones.',
  ParticipacionVacia: 'Elegí al menos una participación: morfología, tipo y aptitud, o una prueba.',
  JineteFaltante: 'Falta elegir el jinete de esta prueba.',
  JineteMorfologia: 'Falta elegir el jinete para la morfología.',
  JineteImpago: 'Este jinete tiene la cuota impaga a la fecha del evento. Elegí otro o regularizá el pago.',
  CupoLleno: 'Esta categoría ya no tiene cupo.',
  YuntaIncompleta: 'Falta elegir el compañero de yunta.',
  YuntaInvalida: 'El compañero de yunta no es válido para esta prueba.',
  YuntaOcupada: 'Ese compañero ya fue elegido por otra inscripción en esta categoría.',
  EquipoFaltante: 'Falta elegir el equipo.',
  // Las dos son por prueba + categoría, no por prueba: un equipo anotado en
  // otra categoría de la misma prueba no molesta. (En Aparte, las categorías
  // 15 y 29 cuentan como una sola porque comparten el cupo.)
  EquipoOcupado: 'Ese equipo ya está anotado en esta categoría.',
  AnimalEnOtroEquipo: 'Un integrante del equipo ya está anotado en esta categoría con otro equipo.',
  PruebaNoHabilitada: 'Esta prueba no está habilitada en el evento.',
  MorfologiaNoHabilitada: 'La morfología no está habilitada en el evento.',
  OtonioRegla: 'Esta inscripción no cumple las reglas del evento.',
  Pertenencia: 'Este animal no figura a tu nombre.',

  // ── Las que la web resolvía con la interfaz y el servidor ahora verifica ──
  AnimalInexistente: 'No encontramos este animal en el stud book.',
  TablaSexo: 'El sexo no coincide con el registro del animal.',
  SexoCastrado: 'Un animal castrado no puede inscribirse en esta participación.',
  ExpositorInexistente: 'No pudimos identificar al expositor de la inscripción.',
  CabaniaFaltante: 'Falta el nombre de la cabaña.',
  UbicacionFaltante: 'Faltan la provincia y la localidad.',
  RenspaFaltante: 'Este evento pide el Renspa y quedó vacío.',
  RenspaInvalido: 'El Renspa tiene que quedar como 00.000.0.00000/00: 13 números.',
  CategoriaSinCalcular: 'No pudimos calcular la categoría morfológica de este animal.',
  JineteNoDisponible: 'Este jinete no está disponible.',
  EquipoInexistente: 'El equipo elegido ya no existe.',
  PruebaNoOfrecida: 'Esta prueba no se ofrece para este animal.',
  // Dos categorías «comunes» de la misma prueba: se elige una sola. Las
  // «propias» sí se acumulan (ver src/reglasAlta.js).
  PruebaCategoriaUnica: 'De esta prueba se puede elegir una sola de estas categorías.',
};

// Para un código que no conocemos, un texto honesto antes que uno inventado: la
// lista de la API puede crecer y un mensaje equivocado es peor que uno vago.
const GENERICO = 'Esta inscripción no cumple una regla del evento.';

export function textoErrorInscripcion(codigo) {
  return TEXTOS[codigo] || GENERICO;
}

// Los errores del 422, listos para mostrar: el texto más de qué prueba habla,
// cuando la regla es de una prueba y no del formulario entero.
export function describirErrores(errores) {
  if (!Array.isArray(errores)) return [];
  return errores.map((e) => ({
    codigo: e?.codigo || null,
    texto: textoErrorInscripcion(e?.codigo),
    campo: e?.campo || null,
    prueba: e?.prueba ?? null,
    categoria: e?.categoria ?? null,
  }));
}

export const CODIGOS_CONOCIDOS = Object.keys(TEXTOS);

// ── El 400 `entrada_invalida` ───────────────────────────────────────
//
// El borde de apiv2 rechaza parámetros que no cumplen el contrato y contesta
// 400 con `{code: 'entrada_invalida', campo, message}`. Ese `message` está
// escrito para quien programa —«se esperaba un entero positivo», «rp en blanco
// o '0'»— y no se le muestra al socio.
//
// Traducimos por `campo` y nunca por el texto ni por el valor: así, cuando el
// backend cambie una regla (al #240 ya le pasó dos veces en un día), la app no
// se entera y el socio no ve jerga. La contra es que perdemos el detalle, pero
// el detalle de un `entrada_invalida` no le sirve a nadie que no programe.
//
// La distinción que importa: hay campos que el socio escribió y puede corregir,
// y hay campos que arma la app sola (el evento, la prueba, la categoría, el
// animal). Pedirle que «revise» algo que nunca tipeó lo manda a buscar un error
// que no cometió — ahí el texto dice que el problema es nuestro.
const CAMPOS_DEL_SOCIO = {
  sba: 'Revisá el S.B.A.: es un número, sin letras, sin espacios y sin ceros adelante.',
  rp: 'Revisá el R.P. que escribiste.',
  renspa: 'Revisá el Renspa: son 13 números, con el formato 00.000.0.00000/00.',
  nombre: 'Revisá el nombre que escribiste.',
  apellido: 'Revisá el apellido que escribiste.',
  documento: 'Revisá el número de documento.',
  cabania: 'Revisá el nombre de la cabaña.',
  provincia: 'Revisá la provincia.',
  localidad: 'Revisá la localidad.',
};

// Un `entrada_invalida` en un campo que el socio no tipeó es un error nuestro:
// la app mandó algo que el contrato no acepta. Se dice así, sin echarle la
// culpa, y sin el texto del backend.
const ENTRADA_INVALIDA_APP = 'No pudimos hacer esta consulta. Probá de nuevo y, si sigue, avisanos.';

export function textoEntradaInvalida(campo) {
  return CAMPOS_DEL_SOCIO[campo] || ENTRADA_INVALIDA_APP;
}

export const CAMPOS_ENTRADA_INVALIDA = Object.keys(CAMPOS_DEL_SOCIO);

// ── Los 503 del servicio ────────────────────────────────────────────
//
// `mantenimiento` y `base_no_disponible` también traen un `message` de sistema
// («Base de datos no disponible», «No se pudo escribir la inscripción», «No se
// pudo tomar el lock de equipos»): dicen qué falló por dentro, no qué puede
// hacer el socio. Desde #241 el alta contesta `base_no_disponible` también
// cuando no consigue el lock del evento en 5 segundos — o sea, cuando hay otra
// alta del mismo evento en curso, que es lo más probable de los tres. En todos
// los casos la base no escribió nada y reintentar es seguro.
const TEXTOS_SERVICIO = {
  mantenimiento: 'La inscripción está cerrada por mantenimiento. Probá más tarde.',
  base_no_disponible: 'No pudimos completar la operación. Probá de nuevo en un rato.',
};

// En el alta se agrega lo único que el socio necesita saber para animarse a
// reintentar: que no quedó anotado. Sin eso, el que vuelve a confirmar teme
// inscribir dos veces el mismo animal.
export const SERVICIO_ALTA = 'No pudimos guardar la inscripción y no quedó nada anotado. Probá de nuevo en un rato.';

export function textoServicio(code) {
  return TEXTOS_SERVICIO[code] || null;
}

export const CODIGOS_SERVICIO = Object.keys(TEXTOS_SERVICIO);

// ── El 422 de POST /equipos ─────────────────────────────────────────
//
// Otro `code` (`equipo_invalido`, no `inscripcion_invalida`) y otros códigos,
// así que otra tabla: acá `JineteFaltante` habla de un integrante del equipo y
// no de la prueba, y los dos textos no pueden ser el mismo. Son las
// validaciones de `equipo_agregar.php`, más las tres que la web no hacía
// (`AnimalInexistente`, `AnimalRepetido`, `AnimalAjeno`).
const TEXTOS_EQUIPO = {
  NombreFaltante: 'Ponele un nombre al equipo.',
  NombreRepetido: 'Ya hay un equipo con ese nombre este año. Elegí otro.',
  AnimalFaltante: 'El equipo lleva tres animales: falta elegir alguno.',
  JineteFaltante: 'Cada animal del equipo necesita su jinete.',
  AnimalInexistente: 'No encontramos uno de los animales en el stud book.',
  JineteNoDisponible: 'Uno de los jinetes no está disponible.',
  AnimalRepetido: 'Hay un animal repetido: el equipo lleva tres distintos.',
  EquipoDuplicado: 'Ya existe un equipo de este año con estos tres animales y estos tres jinetes.',
  // Alcanza con uno propio: exigir los tres dejaría afuera a la mayoría de los
  // equipos reales.
  AnimalAjeno: 'Al menos uno de los tres animales tiene que figurar a tu nombre.',
};

const GENERICO_EQUIPO = 'Este equipo no cumple una regla del sistema.';

export function textoErrorEquipo(codigo) {
  return TEXTOS_EQUIPO[codigo] || GENERICO_EQUIPO;
}

// Los errores del 422 de equipos, listos para mostrar. Vienen todos juntos y en
// el orden de la web, así que se listan tal cual.
export function describirErroresEquipo(errores) {
  if (!Array.isArray(errores)) return [];
  return errores.map((e) => ({
    codigo: e?.codigo || null,
    texto: textoErrorEquipo(e?.codigo),
    campo: e?.campo || null,
  }));
}

// ── Los 403 de la cuenta ────────────────────────────────────────────
//
// Dos códigos que puede dar CUALQUIER endpoint protegido que escriba o lea lo
// del socio: el alta, eliminar, los equipos, el certificado, el perfil. Por eso
// viven acá sueltos y no dentro de la tabla de una operación.
//
// El `detail` del backend para éstos está en castellano, así que algo se veía.
// Pero «El usuario no está habilitado» deja al socio sin saber qué hacer ni a
// quién recurrir, y es el peor de los dos momentos para eso: `usuario_no_habilitado`
// significa que el access le sobrevivió al estado de la cuenta —hace una hora
// podía y ahora no—, así que el socio no cambió nada y no entiende por qué dejó
// de andar. Además, elegir por `code` es la regla de toda esta tabla: el texto
// del backend puede cambiar sin avisar.
const TEXTOS_USUARIO = {
  // Las dos cuentas operativas de la ACCC (1278 y 1610).
  usuario_solo_web: 'Esta cuenta opera sus inscripciones sólo desde caballoscriollos.com.',
  usuario_no_habilitado: 'Tu cuenta no está habilitada para esta operación. Consultá con la Asociación.',
};

export function textoUsuario(code) {
  return TEXTOS_USUARIO[code] || null;
}

export const CODIGOS_USUARIO = Object.keys(TEXTOS_USUARIO);

// ── Eliminar una inscripción (DELETE /inscripciones/{id}) ───────────
//
// En la API esto es «la baja», y así se llaman el endpoint y estas funciones.
// De cara al socio es «eliminar», que es lo que dice la web en el mismo lugar.
//
// Acá el socio ya decidió y apretó: el texto tiene que decirle si quedó dada de
// baja o no, y qué hacer si no. Son códigos sueltos (no una lista `errores`
// como el 422 del alta), y el 422 trae además un `motivo` aparte.
//
// La app no pregunta antes si se puede —`puede_baja` ya viene en el listado y
// en el detalle, y el botón sólo aparece con `true`—, así que todo esto se ve
// únicamente cuando la respuesta contradice lo que la pantalla mostraba: entre
// que se pintó y el socio apretó se cerró el plazo, se cargó un resultado, o
// alguien dio de baja la misma inscripción. Por eso los textos empiezan por el
// cambio, no por el error.
const TEXTOS_BAJA = {
  // 409: el estado ya no admite eliminarla. Cubre DOS casos —ya cancelada, o
  // rechazada por la Asociación—, así que el texto no puede decir «ya estaba
  // eliminada»: sería falso para la rechazada. «Ya no está activa» vale para
  // las dos. También salta cuando otra baja ganó la carrera, y ahí el socio
  // igual quiere lo mismo: mirar cómo quedó la lista.
  estado_no_permite_baja: 'Esta inscripción ya no está activa. Actualizá la lista para ver cómo quedó.',
  // 409: la habilitación de rehacer se usó o venció entre la lectura y la
  // escritura. La única salida es pedir otra a la Asociación.
  habilitacion_usada: 'La habilitación para rehacer esta inscripción ya se usó o venció. Consultá con la Asociación.',
  // 404: no existe, o no es del socio — la API no distingue, y la app tampoco.
  no_encontrada: 'No encontramos esta inscripción.',
  // Los dos 403 de la cuenta no están acá: son de cualquier endpoint, no de
  // esta operación, y salen de TEXTOS_USUARIO.
};

// El `motivo` del 422: por qué esta baja no se puede. Gana sobre el texto del
// `code`, que sería el genérico.
const MOTIVOS_BAJA = {
  plazo_cerrado: 'La inscripción a este evento ya está cerrada. Para eliminarla, pedile a la Asociación una habilitación para rehacer.',
  no_propietario: 'Este animal ya no figura a tu nombre, así que la inscripción la tiene que eliminar la Asociación.',
  con_resultados: 'Esta inscripción ya tiene resultados cargados y no se puede eliminar.',
  piso_no_medible: 'No pudimos verificar el plazo de este evento. Consultá con la Asociación.',
  sin_evento: 'No pudimos identificar el evento de esta inscripción. Consultá con la Asociación.',
};

const GENERICO_BAJA = 'No pudimos eliminar la inscripción.';

export function textoErrorBaja(e) {
  if (e?.motivo && MOTIVOS_BAJA[e.motivo]) return MOTIVOS_BAJA[e.motivo];
  if (e?.code && TEXTOS_BAJA[e.code]) return TEXTOS_BAJA[e.code];
  const usuario = textoUsuario(e?.code);
  if (usuario) return usuario;
  // El 503 del servicio: el mismo texto que el resto de la app. Acá no hace
  // falta aclarar que «no quedó anotado» como en el alta — la transacción se
  // deshizo y la inscripción sigue viva, que es lo que el socio ya ve.
  return textoServicio(e?.code) || e?.detail || GENERICO_BAJA;
}

export const CODIGOS_BAJA = Object.keys(TEXTOS_BAJA);
export const MOTIVOS_BAJA_CONOCIDOS = Object.keys(MOTIVOS_BAJA);

// ── El carnet de socio (#63) ────────────────────────────────────────
//
// Las tres rutas `/perfil/carnet*` traen `code` estable. `sin_carnet` es el
// que más se va a ver y el que peor se explica solo: la API lo usa tanto para
// «esta cuenta no califica» (sin número de socio, o no habilitada) como para
// «todavía no emitiste» en el PDF. Como la app emite antes de bajar el PDF, en
// la práctica el socio que ve esto es el que no califica.
//
// Ojo con una asimetría del contrato: acá una cuenta no habilitada NO da el
// 403 `usuario_no_habilitado` de los otros endpoints, da este 404. Por eso el
// texto tiene que valerse solo y no apoyarse en TEXTOS_USUARIO.
// Dos desenlaces, y sólo dos, porque son los dos que el socio puede
// distinguir: o no le corresponde un carnet, o algo falló en el camino.
//
// `sin_carnet` es el primero y NO se arregla reintentando: la cuenta no
// califica hoy y no va a calificar en diez segundos. Todo lo demás —el 503 de
// la base, el `error_escritura`, quedarse sin red— sí es pasajero.
//
// Por eso esto devuelve el texto Y si se puede reintentar juntos: separarlos
// invita a usar uno sin el otro, que es justo el error que hubo acá (un botón
// de reintentar debajo de «no sos socio»).
const SIN_CARNET = 'No se encuentra registrado como socio.';
const CARNET_FALLO = 'No se ha podido obtener el carnet. Por favor, reintente.';

export function errorCarnet(e) {
  if (e?.code === 'sin_carnet') return { texto: SIN_CARNET, reintentable: false };
  return { texto: CARNET_FALLO, reintentable: true };
}

// ── La verificación pública (#64) ───────────────────────────────────
//
// Estas dos rutas NO traen `code`: la app decide por el status.
//
// El 429 es el que importa acertar. Cuenta las verificaciones inválidas por
// IP, y en el predio muchos teléfonos salen por la misma (CGNAT), así que a
// uno le puede tocar por lo que escanearon otros. No significa que el carnet
// esté mal, y confundirlo con «no vale» sería dejar a un socio afuera por un
// problema de red ajeno. Tampoco se le dice que espere diez minutos: en una
// cola, eso no es una respuesta.
export function textoVerificacion(status) {
  if (status === 429) return 'No pudimos verificar este carnet ahora. No quiere decir que no valga: probá de nuevo.';
  // La base caída da hoy 500 y no 503 (anotado como seguimiento del backend),
  // así que los dos van al mismo texto.
  if (status === 503 || status === 500) return 'No pudimos verificar el carnet: el servicio no responde. Probá de nuevo en un rato.';
  return 'No pudimos verificar el carnet.';
}
