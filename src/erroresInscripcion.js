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
  RenspaInvalido: 'El Renspa no tiene un formato válido.',
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
