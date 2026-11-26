// Cucardas (las escarapelas de la ACCC) para los resultados.
//
// Son los PNG originales del diseño, bajados a 192px (se dibujan a ~20px, así
// que alcanza y sobra). No se tiñen: cada cucarda ES su color — el aro y la
// cinta juntos son lo que distingue un premio de otro, así que no hay un ícono
// con `tintColor` como en las disciplinas, sino un archivo por premio.
//
// Tres juegos, los mismos que mandó el diseño:
//   · jura        → los premios y menciones de categoría (tipo_id 3 y 4)
//   · campeonato  → Campeón / Reservado / 3er / 4to mejor (tipo_id 2)
//   · gran camp.  → los mismos cuatro de la expo entera (tipo_id 1), que se
//                   distinguen por la cinta blanca del medio
//   · funcionales → Campeón / Sub Campeón / 3er / 4to, sólo en las finales
//
// «Sin Premio» (premio 17) no lleva cucarda: no premió.

const DEF = {
  // Jura (categorías)
  'premio-1':  { src: require('../assets/cuc-premio-1.png'),  label: 'Primer Premio' },
  'premio-2':  { src: require('../assets/cuc-premio-2.png'),  label: 'Segundo Premio' },
  'premio-3':  { src: require('../assets/cuc-premio-3.png'),  label: 'Tercer Premio' },
  'premio-4':  { src: require('../assets/cuc-premio-4.png'),  label: 'Cuarto Premio' },
  'mencion-1': { src: require('../assets/cuc-mencion-1.png'), label: 'Primera Mención' },
  'mencion-2': { src: require('../assets/cuc-mencion-2.png'), label: 'Segunda Mención' },
  // Campeonato
  'campeon':      { src: require('../assets/cuc-campeon.png'),      label: 'Campeón' },
  'reservado':    { src: require('../assets/cuc-reservado.png'),    label: 'Reservado Campeón' },
  'tercer-mejor': { src: require('../assets/cuc-tercer-mejor.png'), label: 'Tercer Mejor' },
  'cuarto-mejor': { src: require('../assets/cuc-cuarto-mejor.png'), label: 'Cuarto Mejor' },
  // Gran campeonato
  'gran-campeon':      { src: require('../assets/cuc-gran-campeon.png'),      label: 'Gran Campeón' },
  'gran-reservado':    { src: require('../assets/cuc-gran-reservado.png'),    label: 'Reservado Gran Campeón' },
  'gran-tercer-mejor': { src: require('../assets/cuc-gran-tercer-mejor.png'), label: 'Tercer Mejor de la expo' },
  'gran-cuarto-mejor': { src: require('../assets/cuc-gran-cuarto-mejor.png'), label: 'Cuarto Mejor de la expo' },
  // Funcionales
  'func-campeon':    { src: require('../assets/cuc-func-campeon.png'),    label: 'Campeón' },
  'func-subcampeon': { src: require('../assets/cuc-func-subcampeon.png'), label: 'Sub Campeón' },
  'func-tercero':    { src: require('../assets/cuc-func-tercero.png'),    label: 'Tercer Mejor' },
  'func-cuarto':     { src: require('../assets/cuc-func-cuarto.png'),     label: 'Cuarto Mejor' },
};

export const CUCARDAS = DEF;

export function cucarda(slug) {
  if (!slug) return null;
  const d = DEF[slug];
  return d ? { slug, ...d } : null;
}

// `premio.id` es el id del catálogo de premios del sistema (tblPremios), el
// mismo en todos los eventos y en las dos disciplinas de jura: es la clave más
// firme que da la API, mucho mejor que el nombre (que viene con el typo
// «Resevado Campeón» y repite «Tercer Mejor» en campeonato y gran campeonato).
const POR_ID = {
  1: 'gran-campeon', 2: 'gran-reservado', 3: 'gran-tercer-mejor', 4: 'gran-cuarto-mejor',
  5: 'campeon',      6: 'reservado',      7: 'tercer-mejor',      8: 'cuarto-mejor',
  9: 'premio-1',    10: 'premio-2',      11: 'premio-3',         12: 'premio-4',
  13: 'mencion-1',  14: 'mencion-2',
  // 17 = Sin Premio → sin cucarda.
};

// Acentos a mano: Hermes no garantiza `String.prototype.normalize`, y esto es
// un puñado de letras.
const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => ACENTOS[c])
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Nombres de la jura. «Resevado» es el typo del catálogo, no un descuido acá.
const POR_NOMBRE = {
  'gran campeon': 'gran-campeon',
  'reservado gran campeon': 'gran-reservado',
  'campeon': 'campeon',
  'reservado campeon': 'reservado',
  'resevado campeon': 'reservado',
  'tercer mejor': 'tercer-mejor',
  'cuarto mejor': 'cuarto-mejor',
  'primer premio': 'premio-1',
  'segundo premio': 'premio-2',
  'tercer premio': 'premio-3',
  'cuarto premio': 'premio-4',
  'primer mencion': 'mencion-1',
  'primera mencion': 'mencion-1',
  'segunda mencion': 'mencion-2',
  'segundo mencion': 'mencion-2',
};

// Nombres de las funcionales, tal como los guarda la tabla de méritos.
const POR_NOMBRE_FUNCIONAL = {
  'campeon': 'func-campeon',
  'subcampeon': 'func-subcampeon',
  'sub campeon': 'func-subcampeon',
  'tercero': 'func-tercero',
  'cuarto': 'func-cuarto',
  // «Finalista», «Semifinalista» y «Fin B» no llevan cucarda.
};

// Un entry de resultados de jura (morfología o tipo y aptitud). Se resuelve por
// id y, si el id no está en el catálogo, por nombre — que alcanza salvo para
// «Tercer/Cuarto Mejor», donde sin el id no se sabe si es del campeonato o del
// gran campeonato y se usa el del campeonato.
export function cucardaDePremio(premio) {
  if (!premio) return null;
  const porId = POR_ID[premio.id];
  if (porId) return cucarda(porId);
  return cucarda(POR_NOMBRE[norm(premio.nombre)]);
}

const ES_JURA = /morfolog|tipo y aptitud/;

// Un mérito del Premio Solanet (ficha del animal y detalle del propietario).
// Ahí no hay id de premio: sólo el nombre del logro y el de la prueba. La
// prueba decide el juego de cucardas, porque «Campeón» existe en los dos.
//
// Dos límites conocidos del dato:
//   · «Tercer Mejor» / «Cuarto Mejor» no dicen si son del campeonato o del gran
//     campeonato — se usa la del campeonato, que es el caso común;
//   · la cucarda de cuarto funcional es, según el diseño, sólo del Freno de Oro.
export function cucardaDeLogro(logro, prueba) {
  const l = norm(logro);
  if (!l) return null;
  if (ES_JURA.test(norm(prueba))) return cucarda(POR_NOMBRE[l]);
  const slug = POR_NOMBRE_FUNCIONAL[l];
  if (slug === 'func-cuarto' && !/freno/.test(norm(prueba))) return null;
  return cucarda(slug);
}

const FUNC_POR_PUESTO = { 1: 'func-campeon', 2: 'func-subcampeon', 3: 'func-tercero', 4: 'func-cuarto' };

// Resultado de una prueba funcional en un evento. Dos reglas del diseño:
// la cucarda va **sólo en las finales** (ni clasificatoria ni tercio final), y
// la de cuarto es sólo del Freno de Oro.
export function cucardaFuncional({ puesto, clasificacion, pruebaKey } = {}) {
  if (clasificacion !== 'Final') return null;
  const slug = FUNC_POR_PUESTO[puesto];
  if (!slug) return null;
  if (slug === 'func-cuarto' && pruebaKey !== 'freno_oro') return null;
  return cucarda(slug);
}
