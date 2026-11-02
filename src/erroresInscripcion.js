// Los códigos del 422 de POST /inscripciones, en castellano.
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
  EquipoOcupado: 'Ese equipo ya está anotado en esta prueba.',
  AnimalEnOtroEquipo: 'Un integrante del equipo ya está anotado en esta prueba con otro equipo.',
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
