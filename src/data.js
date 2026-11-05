// El catálogo de disciplinas: lo único que sobrevivió de los mocks del
// prototipo. Todo lo demás (caballos, eventos, noticias, resultados, lotes,
// morfología, rankings) ya viene de la API — ver `src/api/`.
//
// Esto no sale de la API, y no debería: `id` es la clave con la que
// `src/theme.js` resuelve el color y el PNG de cada tile
// (`DISCIPLINE_COLORS`, `DISCIPLINE_ICONS`), y `short` es el rótulo que entra
// en los 108px del tile de la home. Son decisiones de diseño de la app, no
// datos del sistema.
//
// `name` sí se usa contra la API: la home lo matchea por prefijo con las
// categorías de `/noticias` para saber a qué filtro lleva cada tile
// (`findCategoriaForDiscipline` en HomeScreen).
export const DISCIPLINES = [
  { id: 'aparte',     name: 'Aparte Campero',  short: 'Aparte' },
  { id: 'corral',     name: 'Corral de Aparte', short: 'Corral' },
  { id: 'rienda',     name: 'Rienda',          short: 'Rienda' },
  { id: 'freno',      name: 'Freno de Oro',    short: 'Freno' },
  { id: 'morfologia', name: 'Morfología',      short: 'Morfología' },
  { id: 'marcha',     name: 'Marcha y Enduro', short: 'Marcha' },
  { id: 'rodeos',     name: 'Rodeos',          short: 'Rodeos' },
  { id: 'paleteada',  name: 'Paleteada',       short: 'Paleteada' },
  { id: 'incentivo',  name: 'Copa Incentivo',  short: 'Incentivo' },
  { id: 'tipo',       name: 'Tipo y Aptitud',  short: 'Tipo Aptitud' },
];
