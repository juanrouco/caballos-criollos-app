// Mock data for App Caballos Criollos prototype

const HORSES = [
  {
    id: 'h1', name: 'MALACARA REGENTE', sex: 'Macho', pelaje: 'Zaino', born: '12/10/2019',
    criador: 'SOLANET, CARLOS A.', criadero: 'CAB. EL CARDAL', rp: '847291', sba: '108837', criadorNum: '301',
    sire: {
      name: 'MALACARA SOBERANO', year: 2008, sex: 'M', color: 'ZAINO',
      sire: {
        name: 'EL CARDAL ALBORADA', year: 1998, sex: 'M', color: 'ZAINO',
        sire: { name: 'CARDAL DON RUFINO', year: 1988 },
        dam:  { name: 'ALBORADA TRADICIÓN', year: 1990 },
      },
      dam: {
        name: 'MALACARA LUZ', year: 2002, sex: 'H', color: 'BAYO',
        sire: { name: 'MALACARA AURELIO', year: 1992 },
        dam:  { name: 'LUZ DEL PAMPA', year: 1995 },
      },
    },
    dam: {
      name: 'CARDAL AURORA', year: 2010, sex: 'H', color: 'TORDILLO',
      sire: {
        name: 'CARDAL INDIO', year: 2001, sex: 'M', color: 'TORDILLO',
        sire: { name: 'INDIO BAGUAL', year: 1991 },
        dam:  { name: 'CARDAL FLOR', year: 1994 },
      },
      dam: {
        name: 'AURORA FLOR', year: 2005, sex: 'H', color: 'ALAZAN',
        sire: { name: 'AURORA SOL', year: 1995 },
        dam:  { name: 'FLOR DEL CAMPO', year: 1998 },
      },
    },
    titles: ['Gran Campeón Macho Palermo 2024', 'Campeón Freno de Oro 2023', '1° Aparte Cat. A 2023'],
    points: 1840,
  },
  {
    id: 'h2', name: 'LA INVERNADA MILONGA', sex: 'Hembra', pelaje: 'Alazán', born: '03/09/2020',
    criador: 'AGUIRRE, MARIANO M.', criadero: 'LA INVERNADA', rp: '551204', sba: '112384', criadorNum: '512',
    sire: {
      name: 'LA INVERNADA GAUCHO', year: 2010, sex: 'M', color: 'ALAZAN',
      sire: {
        name: 'GAUCHO PAYADOR', year: 2000, sex: 'M', color: 'ALAZAN',
        sire: { name: 'PAYADOR CRIOLLO', year: 1990 },
        dam:  { name: 'INVERNADA REINA', year: 1993 },
      },
      dam: {
        name: 'INVERNADA HUELLA', year: 2003, sex: 'H', color: 'BAYO',
        sire: { name: 'CARDAL RECUERDO', year: 1993 },
        dam:  { name: 'HUELLA DEL SUR', year: 1996 },
      },
    },
    dam: {
      name: 'PAMPA HUELLA', year: 2012, sex: 'H', color: 'BAYO',
      sire: {
        name: 'PAMPA MATRERO', year: 2002, sex: 'M', color: 'ZAINO',
        sire: { name: 'MATRERO SOL', year: 1992 },
        dam:  { name: 'PAMPA AURORA', year: 1995 },
      },
      dam: {
        name: 'HUELLA SOLITARIA', year: 2006, sex: 'H', color: 'BAYO',
        sire: { name: 'SOLITARIO CRIOLLO', year: 1996 },
        dam:  { name: 'HUELLA NEGRA', year: 1999 },
      },
    },
    titles: ['Campeona Hembra FICCC 2025'],
    points: 1320,
  },
  { id: 'h3', name: 'EL CARDAL CIMARRÓN', sex: 'Macho', pelaje: 'Tobiano', born: '20/04/2018', criador: 'PEREZ EGAN, JUAN A.', criadero: 'EL CARDAL', rp: '628117', sba: '109542', criadorNum: '301' },
  { id: 'h4', name: 'DON SEGUNDO LUCERO', sex: 'Macho', pelaje: 'Zaino', born: '08/11/2021', criador: 'BALLESTER, F.', criadero: 'LA VALENTINA', rp: '741850', sba: '115023', criadorNum: '88' },
  { id: 'h5', name: 'PAMPA HUELLA', sex: 'Hembra', pelaje: 'Bayo', born: '15/06/2017', criador: 'DECOTTO, R.', criadero: 'CHERENDA', rp: '432019', sba: '101876', criadorNum: '405' },
  { id: 'h6', name: 'TAPALQUÉ RELÁMPAGO', sex: 'Macho', pelaje: 'Moro', born: '02/02/2019', criador: 'TRONCONI, J.V.', criadero: 'LAS MULITAS', rp: '329415', sba: '107331', criadorNum: '672' },
  { id: 'h7', name: 'LA MARTITA AURORA', sex: 'Hembra', pelaje: 'Alazán', born: '24/08/2020', criador: 'AGUIRRE, M.M.', criadero: 'LA MARTITA', rp: '894732', sba: '120145', criadorNum: '512' },
  { id: 'h8', name: 'CARANDAI FLECHA', sex: 'Hembra', pelaje: 'Zaino', born: '11/12/2018', criador: 'SARCIAT, FELIPE', criadero: 'CARANDAI', rp: '602184', sba: '113789', criadorNum: '209' },
];

const EVENTS = [
  {
    id: 'e1', date: '31 Mar', dateFull: '31 de Marzo, 2026', dayShort: 'MAR',
    name: 'Expo Otoño 2026', location: 'Palermo · Buenos Aires',
    disciplines: ['Morfología'], status: 'live', type: 'Exposición Nacional',
    photo: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026033105542099399.jpg',
  },
  {
    id: 'e2', date: '16 May', dateFull: '16 de Mayo, 2026', dayShort: 'SAB',
    name: 'Cabaña Aljosoay', location: 'Toro Pujio · Córdoba',
    disciplines: ['Morfología'], status: 'soon', type: 'Expo B Pasaporte',
  },
  {
    id: 'e3', date: '16 May', dateFull: '16 de Mayo, 2026', dayShort: 'SAB',
    name: 'Los Nietitos', location: 'Pedro Luro · Buenos Aires',
    disciplines: ['Rodeos', 'Marcha'], status: 'soon', type: 'Expo Regional',
  },
  {
    id: 'e4', date: '22 May', dateFull: '22 de Mayo, 2026', dayShort: 'VIE',
    name: 'Expo Trenque Lauquen', location: 'Trenque Lauquen · BA',
    disciplines: ['Morfología', 'Freno de Oro', 'Tipo y Aptitud'], status: 'soon', type: 'Expo Nacional',
  },
  {
    id: 'e5', date: '30 May', dateFull: '30 de Mayo, 2026', dayShort: 'SAB',
    name: 'Cumbre de Campeones', location: 'Jesús María · Córdoba',
    disciplines: ['Felipe Z. Ballester', 'Corral', 'Incentivo de Oro'], status: 'soon', type: 'Final Nacional',
  },
  {
    id: 'e6', date: '12 Jun', dateFull: '12 de Junio, 2026', dayShort: 'VIE',
    name: 'Remate Especial Otoño', location: 'Pilar · Buenos Aires',
    disciplines: ['Remate'], status: 'soon', type: 'Remate',
  },
];

const DISCIPLINES = [
  { id: 'aparte',     name: 'Aparte Campero', short: 'Aparte',     color: '#aebf1b', count: 184 },
  { id: 'corral',     name: 'Corral de Aparte', short: 'Corral',   color: '#00a7f7', count: 220 },
  { id: 'rienda',     name: 'Rienda',         short: 'Rienda',     color: '#f6402c', count: 88  },
  { id: 'freno',      name: 'Freno de Oro',   short: 'Freno',      color: '#0d121f', count: 96  },
  { id: 'morfologia', name: 'Morfología',     short: 'Morfología', color: '#9d1db2', count: 1240 },
  { id: 'marcha',     name: 'Marcha y Enduro', short: 'Marcha',    color: '#049787', count: 64  },
  { id: 'rodeos',     name: 'Rodeos',         short: 'Rodeos',     color: '#fe9903', count: 240 },
  { id: 'paleteada',  name: 'Paleteada',      short: 'Paleteada',  color: '#03507e', count: 110 },
  { id: 'incentivo',  name: 'Copa Incentivo', short: 'Incentivo',  color: '#7271fb', count: 48  },
  { id: 'tipo',       name: 'Tipo y Aptitud', short: 'Tipo Aptitud', color: '#ffcd00', count: 156 },
];

// Rankings — Premio Solanet (most important) + por disciplina con categorías.
// Categorías con kind: 'view' muestran tabla in-app; kind: 'pdf' linkean a documento.
const PREMIO_SOLANET = {
  name: 'Premio "Emilio Solanet"',
  description: 'Máxima distinción a un criador por su trayectoria en la cría del Caballo Criollo.',
  season: '2024 — 2025',
  winner: { name: 'CABAÑA "EL CARDAL"', owner: 'Familia Solanet', city: 'Ayacucho · Buenos Aires' },
  topCriadores: [
    { rank: 1, name: 'CAB. EL CARDAL',    owner: 'Solanet, Carlos',  points: 4280 },
    { rank: 2, name: 'LA INVERNADA',      owner: 'Aguirre, Mariano', points: 3950 },
    { rank: 3, name: 'LA MARTITA',        owner: 'Aguirre, M.M.',    points: 3120 },
    { rank: 4, name: 'CARANDAI',          owner: 'Sarciat, Felipe',  points: 2880 },
    { rank: 5, name: 'CHERENDA',          owner: 'Decotto, R.',      points: 2540 },
  ],
};

const RANKING_TOP_GENERIC = [
  { rank: 1, name: 'CASÍN, HORACIO',     owner: 'Cab. El Cardal',   points: 1620 },
  { rank: 2, name: 'BARALE, GERMÁN',     owner: 'La Invernada',     points: 1480 },
  { rank: 3, name: 'BALLESTER, FELIPE',  owner: 'La Valentina',     points: 1240 },
  { rank: 4, name: 'AGUIRRE, MARIANO',   owner: 'La Martita',       points: 1180 },
  { rank: 5, name: 'TRONCONI, J.V.',     owner: 'Las Mulitas',      points: 1090 },
];

const DISCIPLINE_RANKINGS = [
  {
    id: 'aparte', name: 'Aparte Campero', color: '#aebf1b',
    categories: [
      { id: 'a-mixto', name: 'Categoría A · Equipo Mixto', kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'a-fem',   name: 'Categoría A · Femenino',     kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'b',       name: 'Categoría B',                kind: 'pdf' },
      { id: 'c',       name: 'Categoría C',                kind: 'pdf' },
    ],
  },
  {
    id: 'corral', name: 'Corral de Aparte', color: '#00a7f7',
    categories: [
      { id: 'a', name: 'Categoría A', kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'b', name: 'Categoría B', kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'c', name: 'Categoría C', kind: 'pdf' },
    ],
  },
  {
    id: 'rienda', name: 'Rienda', color: '#f6402c',
    categories: [
      { id: 'rj-dowdall', name: 'R. J. Dowdall · Mayores', kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'menores',    name: 'Menores',                 kind: 'pdf' },
      { id: 'jovenes',    name: 'Jóvenes',                 kind: 'pdf' },
    ],
  },
  {
    id: 'freno', name: 'Freno de Oro', color: '#0d121f',
    categories: [
      { id: 'fzb-a',       name: 'F.Z.B. · Categoría A',     kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'fzb-b',       name: 'F.Z.B. · Categoría B',     kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'fzb-c',       name: 'F.Z.B. · Categoría C',     kind: 'pdf' },
      { id: 'preliminar',  name: 'F.Z.B. · Preliminar',      kind: 'pdf' },
      { id: 'novicios',    name: 'F.Z.B. · Novicios',        kind: 'pdf' },
      { id: 'menores-a',   name: 'F.Z.B. · Menores A',       kind: 'pdf' },
      { id: 'menores-b',   name: 'F.Z.B. · Menores B',       kind: 'pdf' },
    ],
  },
  {
    id: 'marcha', name: 'Marcha y Enduro', color: '#049787',
    categories: [
      { id: 'enduro', name: 'Enduro · 80 km',        kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'marcha', name: 'Marcha · Resistencia',  kind: 'pdf' },
    ],
  },
  {
    id: 'rodeos', name: 'Rodeos', color: '#fe9903',
    categories: [
      { id: 'open',     name: 'Open',     kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'handicap', name: 'Handicap', kind: 'view', top: RANKING_TOP_GENERIC },
    ],
  },
  {
    id: 'paleteada', name: 'Paleteada Campera', color: '#03507e',
    categories: [
      { id: 'final-nacional', name: 'Final Nacional', kind: 'view', top: RANKING_TOP_GENERIC },
    ],
  },
  {
    id: 'tipo', name: 'Tipo y Aptitud', color: '#ffcd00',
    categories: [
      { id: 'machos',  name: 'Machos',  kind: 'view', top: RANKING_TOP_GENERIC },
      { id: 'hembras', name: 'Hembras', kind: 'view', top: RANKING_TOP_GENERIC },
    ],
  },
];

export {
  PREMIO_SOLANET,
  DISCIPLINE_RANKINGS,
};

const NEWS = [
  { id: 'n1', date: '27 Abr', tag: 'Institucional', title: '103 años de genética cruzando la frontera: FICCC 2026', img: 'news1' },
  { id: 'n2', date: '17 Abr', tag: 'Institucional', title: 'Plazos de inscripción para Palermo 2026', img: 'news2' },
  { id: 'n3', date: '10 Abr', tag: 'Morfología', title: 'Expo "C" en La Marcelina, Córdoba — Resultados', img: 'news3' },
];

const RESULTS = [
  { id: 'r1', event: 'FICCC 2026', cat: 'Gran Campeón Macho', winner: 'MALACARA REGENTE', criador: 'EL CARDAL', date: '27 Abr' },
  { id: 'r2', event: 'FICCC 2026', cat: 'Gran Campeón Hembra', winner: 'LA INVERNADA MILONGA', criador: 'LA INVERNADA', date: '27 Abr' },
  { id: 'r3', event: 'Final Aparte Cat. A', cat: '1° Puesto', winner: 'EQUIPO LA MARTITA', criador: 'M. Aguirre', date: '01 Abr' },
];

const LOTES = [
  { lote: '0124', name: 'EL CARDAL DON SEGUNDO', sex: 'Macho', born: '2022', pelaje: 'Zaino', medal: true },
  { lote: '0125', name: 'EL CARDAL VIENTO SUR', sex: 'Macho', born: '2022', pelaje: 'Alazán' },
  { lote: '0126', name: 'LA INVERNADA AURORA', sex: 'Hembra', born: '2021', pelaje: 'Tordillo' },
  { lote: '0127', name: 'CARANDAI CIMARRÓN', sex: 'Macho', born: '2023', pelaje: 'Zaino' },
  { lote: '0128', name: 'CHERENDA LUNA', sex: 'Hembra', born: '2022', pelaje: 'Moro', medal: true },
  { lote: '0129', name: 'LAS MULITAS GAUCHO', sex: 'Macho', born: '2023', pelaje: 'Bayo' },
];

const CATALOG_CATEGORIES = [
  {
    id: 'c1', name: 'Categ. 1 — Potrillo — Menor Cabestro',
    lotes: [
      { name: 'EL CARDAL DON SEGUNDO',   sex: 'Macho', born: '2023', pelaje: 'Zaino',    medal: true },
      { name: 'EL CARDAL VIENTO SUR',    sex: 'Macho', born: '2023', pelaje: 'Alazán' },
      { name: 'LAS MULITAS GAUCHO',      sex: 'Macho', born: '2023', pelaje: 'Bayo' },
      { name: 'CARANDAI BRASA',          sex: 'Macho', born: '2023', pelaje: 'Tordillo' },
    ],
  },
  {
    id: 'c2', name: 'Categ. 2 — Potrillo — Mayor Cabestro',
    lotes: [
      { name: 'LA INVERNADA AURORA',     sex: 'Macho', born: '2022', pelaje: 'Tordillo' },
      { name: 'CARANDAI CIMARRÓN',       sex: 'Macho', born: '2022', pelaje: 'Zaino' },
      { name: 'CHERENDA RELÁMPAGO',      sex: 'Macho', born: '2022', pelaje: 'Moro',     medal: true },
      { name: 'LA MARTITA NUBLADO',      sex: 'Macho', born: '2022', pelaje: 'Tordillo' },
      { name: 'EL CARDAL SOBERANO',      sex: 'Macho', born: '2022', pelaje: 'Zaino' },
    ],
  },
  {
    id: 'c3', name: 'Categ. 3 — Padrillo — 3 años Cabestro',
    lotes: [
      { name: 'MALACARA REGENTE',        sex: 'Macho', born: '2021', pelaje: 'Zaino',    medal: true },
      { name: 'DON SEGUNDO LUCERO',      sex: 'Macho', born: '2021', pelaje: 'Zaino' },
      { name: 'TAPALQUÉ DON ZOILO',      sex: 'Macho', born: '2021', pelaje: 'Bayo' },
    ],
  },
  {
    id: 'c4', name: 'Categ. 4 — Padrillo — 3 años Montado',
    lotes: [
      { name: 'CARANDAI BAGUAL',         sex: 'Macho', born: '2021', pelaje: 'Alazán' },
      { name: 'LA INVERNADA GAUCHO',     sex: 'Macho', born: '2021', pelaje: 'Alazán',   medal: true },
      { name: 'TAPALQUÉ RELÁMPAGO',      sex: 'Macho', born: '2021', pelaje: 'Moro' },
      { name: 'EL CARDAL CIMARRÓN',      sex: 'Macho', born: '2021', pelaje: 'Tobiano' },
    ],
  },
];

// Number lotes sequentially across all categories (1, 2, 3, ...)
let __lotN = 0;
CATALOG_CATEGORIES.forEach(c => {
  c.lotes = c.lotes.map(l => ({ ...l, lote: String(++__lotN).padStart(3, '0') }));
});

// Morfología results — Expo Otoño 2026 (IdNoticia 2200)
// Placement builder: rank, pos label, name, box, [sireName, ssire, sdam], [damName, dsire, ddam], expositor, rp, sba, nac
const P = (rank, pos, name, box, sireF, damF, expositor, rp, sba, nac) => ({
  pos, rank, status: 'placed', name, box: String(box),
  sire: { name: sireF[0], sire: sireF[1], dam: sireF[2] },
  dam:  { name: damF[0],  sire: damF[1],  dam: damF[2]  },
  expositor, rp: String(rp), sba: String(sba), nac,
});

const MORFOLOGIA_RESULTS = {
  info: {
    categoria: 'GRANDES CAMPEONES',
    fecha: '31 / 03 / 2026',
    region: 'Buenos Aires',
    lugar: 'Expo Otoño 2026 · Palermo',
    jurado: 'R. Díaz de Vivar · L. Bellocq (M) / C. Castaño · R. Matho Meabe (H)',
    secretarios: 'ACCC',
  },
  categorias: [
    // ── Gran Campeonato Machos ──
    { id: 'gc-machos', title: 'Gran Campeonato Machos', kind: 'gran', placements: [
      P(1, 'Gran Campeón Macho', 'DEL OESTE PAMPERO', 28,
        ['DEL OESTE ZORRINO', 'DEL OESTE CHIFLIDO', 'DEL OESTE ZARANDA'],
        ['DEL OESTE PAMPEANA', 'DEL OESTE MUTANTE', 'DEL OESTE PITUCA II'],
        'La Esperanza de Ballester SRL', 3033, 108837, '30-10-2021'),
      P(2, 'Reservado Gran Campeón Macho', 'TRES AR ANARQUISTA', 9,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TRES AR ARTESANA', 'TRES AR ÑANDUBAY', 'TAÑIDO RESACA'],
        'ARGÜELLES, MARCELO', 777, 117109, '20-09-2023'),
      P(3, 'Tercer Mejor Macho', 'VELETA EL VIRREY', 32,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TAÑIDO NEBLINA', 'DEL OESTE MUTANTE', 'BT NOVIDADE'],
        'DE OTO, LUCIANA SOLEDAD', 145, 105162, '30-10-2020'),
      P(4, 'Cuarto Mejor Macho', 'YANCA LIBERTADOR', 27,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['COSCOJERA SORTIJA', 'CALFIAO A LA CARGA', 'COSCOJERA ALLA LEJOS'],
        'MARIANI, JULIO JAVIER', 183, 110567, '20-11-2021'),
    ]},
    // ── Gran Campeonato Hembras ──
    { id: 'gc-hembras', title: 'Gran Campeonato Hembras', kind: 'gran', placements: [
      P(1, 'Gran Campeón Hembra', 'DON ROMEO CAIPIROSKA', 65,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['MANEADORA CAIPIRA', 'BRAVO DE SAO PEDRO', 'MANEADORA CAPRICHOSA'],
        'SPINELLA, ALEJANDRO E.', 89, 122741, '06-12-2022'),
      P(2, 'Reservado Gran Campeón Hembra', 'TRES AR RESFRIADA', 80,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TRES AR ALMA BLANCA', 'TRES AR MISERABLE', 'MANEADORA CORNADA'],
        'ARGÜELLES, MARCELO', 728, 119792, '08-11-2021'),
      P(3, 'Tercer Mejor Hembra', 'YUNGAY LA MINGA', 42,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['YUNGAY LA DISCORDIA', 'NOCHERO CHIQUITO', 'DEL BAJO MILONGA'],
        'MONTE, PABLO ANDRES', 45, 124567, '08-12-2023'),
      P(4, 'Cuarto Mejor Hembra', 'LA FUNDA LIBERTAD', 58,
        ['VELETA EMBAJADOR', 'DEL OESTE ZORRINO', 'QUELU CORONA'],
        ['MERCACHIFLE LA CARIOCA', 'YANCAMIL CAHUEL', 'CHUSCO DIOSA COQUETA'],
        'LA FUNDADORA S.A.', 122, 123136, '10-09-2023'),
    ]},
    // ── Machos por categoría ──
    { id: 'm-potrillo-menor', title: 'Potrillo Menor', kind: 'cat-macho', placements: [
      P(1, 'Campeón', 'PINGAZO EL PRESAGIO', 3,
        ['GUIRITA FARSANTE', 'GUACHIGO NO TE ACHIQUES', 'CHARQUE ZAMBULLADA'],
        ['PINGAZA FLOR DE PAGO', 'DORMIDO ATAJENLO', 'CUCHILLERA DIAGUITA'],
        'DE ACHAVAL, HUGO JORGE', 839, 115353, '09-12-2023'),
      P(2, 'Reservado Campeón', 'DEL OESTE BAQUEANO', 5,
        ['VISTA PAMPA CAPITAN', 'DEL OESTE CHIFLIDO', 'DEL OESTE CAPELINA'],
        ['DEL OESTE BUENA ONDA', 'DEL OESTE MUTANTE', 'DEL OESTE PURA VIDA'],
        'LA ESPERANZA DE BALLESTER S.R.L.', 3104, 115268, '23-11-2023'),
      P(3, 'Tercer Mejor', 'DEL MATE FORASTERO', 4,
        ['YANCA NEHUEN', 'YANCAMIL CAHUEL', 'YANCA ESMERALDA'],
        ['BALLENERA NIÑA II', 'CALFIAO ADELANTE', 'BALLENERA NIÑA PANCHA'],
        'BOLATTI, ALEJANDRO', 65, 117211, '08-12-2023'),
      P(4, 'Cuarto Mejor', 'DEL NERECO SABANDIJA', 1,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['GOYAZ CHICO PECHUGA', 'EL PROGRESO', '—'],
        'BOLATTI, ALEJANDRO', 224, 113973, '31-01-2024'),
    ]},
    { id: 'm-potrillo-mayor', title: 'Potrillo Mayor', kind: 'cat-macho', placements: [
      P(1, 'Campeón', 'TRES AR ANARQUISTA', 9,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TRES AR ARTESANA', 'TRES AR ÑANDUBAY', 'TAÑIDO RESACA'],
        'ARGÜELLES, MARCELO', 777, 117109, '20-09-2023'),
      P(2, 'Reservado Campeón', 'LA FUNDA PISTACHO', 10,
        ['LA FUNDA DORMILON', 'MERCACHIFLE DORMILON', 'DESOBEDIENTE MONEDA'],
        ['ENTABLADA HERIDA', 'TT MIDAS', 'ENTABLADA LA DULCE'],
        'LA FUNDADORA S.A.', 81, 114365, '12-09-2023'),
      P(3, 'Tercer Mejor', 'DEL MEDANO INTEGRO', 7,
        ['DEL GOYAZ CANUTO', 'ÑANDU PUELCHE', 'DEL GOYAZ ALPARGATA'],
        ['DEL MEDANO ENGOLADA', 'TAÑIDO TIMOTEO', 'DEL MEDANO ENGREIDA'],
        'KEDZIERSKI, MARIA SUSANA', 501, 114392, '21-10-2023'),
      P(4, 'Cuarto Mejor', 'DE MI JUANA VISTOSO', 8,
        ['LINCE DA ALIANCA', 'HARMONICO DE STA EDWIGES', 'ESTAMPA DA ALIANCA'],
        ['CHARQUE VIZCACHA', 'CHARQUE LEOPARDO', 'CHARQUE FERIA'],
        'AMALGAMAR S.R.L.', 91, 114381, '18-10-2023'),
    ]},
    { id: 'm-padrillo-3', title: 'Padrillo 3 Años', kind: 'cat-macho', placements: [
      P(1, 'Campeón', 'TRES AR CODICIADO', 14,
        ['TAÑIDO INDIO PAMPA', 'DEL OESTE ZORRINO', 'TAÑIDO MAÑANITA'],
        ['TRES AR ALMA BLANCA', 'TRES AR MISERABLE', 'MANEADORA CORNADA'],
        'ARGÜELLES, MARCELO', 760, 116432, '05-11-2022'),
      P(2, 'Reservado Campeón', 'CO GUACHO', 18,
        ['DEL OESTE PAMPERITO', 'DEL OESTE MUTANTE', 'DEL OESTE PEQUEÑA'],
        ['CO AVESTRUZ REPETIDA', 'ÑANDU PUELCHE', 'ÑI CAPICUA'],
        'DOWDALL, CLAUDIO ROBERTO', 545, 112644, '22-09-2022'),
      P(3, 'Tercer Mejor', 'VELETA EL FARAON', 17,
        ['SIETE BENDITO', 'TINAJERA YAGUARON', 'DEL SIETE BELLEZA'],
        ['QUELU CORONA', 'DEL OESTE MUTANTE', 'QUELU IGUANA'],
        'DE OTO, LUCIANA SOLEDAD', 198, 111582, '05-10-2022'),
      P(4, 'Cuarto Mejor', 'DEL GOYAZ ESTRIBO', 16,
        ['TAÑIDO MACHETE', 'DEL OESTE FIERRO', 'TAÑIDO MADRILEÑA'],
        ['DEL GOYAZ PIRAGUA', 'IKO PUMA', 'DEL GOYAZ GALANA'],
        'EL GOYAZ CHICO S.R.L.', 651, 111281, '25-10-2022'),
    ]},
    { id: 'm-padrillo-menor', title: 'Padrillo Adulto Menor', kind: 'cat-macho', placements: [
      P(1, 'Campeón', 'DEL OESTE PAMPERO', 28,
        ['DEL OESTE ZORRINO', 'DEL OESTE CHIFLIDO', 'DEL OESTE ZARANDA'],
        ['DEL OESTE PAMPEANA', 'DEL OESTE MUTANTE', 'DEL OESTE PITUCA II'],
        'LA ESPERANZA DE BALLESTER S.R.L.', 3033, 108837, '30-10-2021'),
      P(2, 'Reservado Campeón', 'YANCA LIBERTADOR', 27,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['COSCOJERA SORTIJA', 'CALFIAO A LA CARGA', 'COSCOJERA ALLA LEJOS'],
        'MARIANI, JULIO JAVIER', 193, 110567, '20-11-2021'),
      P(3, 'Tercer Mejor', 'DEL OESTE EXTRANJERO', 24,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['DEL OESTE ESPINITA', 'DEL OESTE FIERRO', 'DEL OESTE ESPINOSA'],
        'CRIOLLOS SANTA ELENA S.A.U.', 3046, 109164, '20-12-2021'),
      P(4, 'Cuarto Mejor', 'GOLILLA MALON', 29,
        ['GOLILLA CHULENGO', 'MAQUENA CHUCHOCA', 'GOLILLA NEGRA LINDA'],
        ['GOLILLA AIROSA', 'GOLILLA GUASITO', 'COSCOJERA PATRONCITA'],
        'TRONCONI BALLESTER, JUAN VICTOR', 2064, 107475, '21-10-2021'),
    ]},
    { id: 'm-padrillo-mayor', title: 'Padrillo Adulto Mayor', kind: 'cat-macho', placements: [
      P(1, 'Campeón', 'VELETA EL VIRREY', 32,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TAÑIDO NEBLINA', 'DEL OESTE MUTANTE', 'BT NOVIDADE'],
        'DE OTO, LUCIANA SOLEDAD', 145, 105162, '30-10-2020'),
      P(2, 'Reservado Campeón', 'TAÑIDO LIBERTADOR', 34,
        ['AUTENTICO DA AWS', 'SR NEVOEIRO', 'VODKA DO IC'],
        ['DEL OESTE FAROLA', 'DEL OESTE MUTANTE', 'DEL OESTE FATIGA'],
        'BRANNAN, GUSTAVO ROQUE', 1184, 92814, '08-11-2016'),
      P(3, 'Tercer Mejor', 'TRANQUEADOR CONQUISTADOR', 31,
        ['DEL OESTE ZORRINO', 'DEL OESTE CHIFLIDO', 'DEL OESTE ZARANDA'],
        ['TRANQUEADORA HASTA PRONTO', 'CHARQUE FANTASMA', 'PATRON CHICO A RAJA'],
        'CASIN, FLORENCIO DANIEL', 329, 106039, '22-11-2020'),
      P(4, 'Cuarto Mejor', 'LUNANCO CHURRO', 33,
        ['GUAMPA EL 4700', 'GUMEX DA RECONQUISTA', 'GUAMPA CARTA ABIERTA'],
        ['DESCOBERTA DO CAPAO REDONDO', 'FARANDOLA DO ITAPORORO', 'UTOPIA DE CAPAO REDONDO'],
        'BALLESTER, FELIPE ALBERTO', 294, 102368, '21-12-2019'),
    ]},
    // ── Hembras por categoría ──
    { id: 'h-potranca-menor', title: 'Potranca Menor', kind: 'cat-hembra', placements: [
      P(1, 'Campeón', 'YUNGAY LA MINGA', 42,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['YUNGAY LA DISCORDIA', 'NOCHERO CHIQUITO', 'DEL BAJO MILONGA'],
        'MONTE, PABLO ANDRES', 45, 124567, '08-12-2023'),
      P(2, 'Reservado Campeón', 'AFIANZADO MISTERIOSA', 44,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['AFIANZADO MAGICA', 'AFIANZADO REFORZADO', 'AFIANZADO MONJITA'],
        'FERNANDEZ, PABLO GABRIEL', 332, 125108, '02-12-2023'),
      P(3, 'Tercer Mejor', 'DEL COIRON LEÑITA SECA', 43,
        ['NAPALEOFU ZUMBIDO', 'ESCAPE CALA BASSA', 'MAÑANERO REGUERA'],
        ['LA FUNDA PRINCESA', 'CHERAPE CAMPECHANO', 'CHUSCO PRINCESA SOÑADA'],
        'GRAMISU, MARIO OSCAR', 77, 125620, '07-12-2023'),
      P(4, 'Cuarto Mejor', 'DEL GOYAZ COMPARSA T/E', 47,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['DEL GOYAZ CHACARERA', 'IKO PUMA', 'DEL GOYAZ CUECA'],
        'ROCHA, GRACIELA JOSEFINA', 677, 124486, '08-11-2023'),
    ]},
    { id: 'h-potranca-mayor', title: 'Potranca Mayor', kind: 'cat-hembra', placements: [
      P(1, 'Campeón', 'LA FUNDA LIBERTAD', 58,
        ['VELETA EMBAJADOR', 'DEL OESTE ZORRINO', 'QUELU CORONA'],
        ['MERCACHIFLE LA CARIOCA', 'YANCAMIL CAHUEL', 'CHUSCO DIOSA COQUETA'],
        'LA FUNDADORA S.A.', 122, 1236136, '10-09-2023'),
      P(2, 'Reservado Campeón', 'MERCACHIFLE LA MOTOSIERRA T/E', 55,
        ['MERCACHIFLE EL DOLAR', 'YANCAMIL CAHUEL', 'YANCAMIL CUYAN'],
        ['MERCACHIFLE LA MAESTRA', 'SIETE BENDITO', 'MERCACHIFLE CHACARERA'],
        'DE OTO, RICARDO', 736, 122879, '15-10-2023'),
      P(3, 'Tercer Mejor', 'LA BRAVA MELINKA', 59,
        ['YANCA NAPALEOFU', 'YANCAMIL CAHUEL', 'BALLENERA RESERVADA'],
        ['LA BRAVA OSTRA', 'JAGUEL FLORETE', 'LA BRAVA CARAMBOLA'],
        'S.A. BARTOLOME GINOCCHIO E HIJOS', 2479, 122159, '07-09-2023'),
      P(4, 'Cuarto Mejor', 'COSCOJERA TAIMADA', 52,
        ['PILERO LADINO', 'MAPUCHE GORRION', 'COSCOJERA CUARTETERA'],
        ['COSCOJERA LAVANDERA', 'MAÑANERO MONARCA', 'COSCOJERA LLAMARADA'],
        'AGUERRE S.A.A.G.I.C.', 1100, 123616, '23-10-2023'),
    ]},
    { id: 'h-yegua-3', title: 'Yegua 3 Años', kind: 'cat-hembra', placements: [
      P(1, 'Campeón', 'DON ROMEO CAIPIROSKA', 65,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['MANEADORA CAIPIRA', 'BRAVO DE SAO PEDRO', 'MANEADORA CAPRICHOSA'],
        'SPINELLA, ALEJANDRO E.', 89, 122741, '06-12-2022'),
      P(2, 'Reservado Campeón', 'VELETA TRAICIONERA', 67,
        ['VELETA EMBAJADOR', 'DEL OESTE ZORRINO', 'QUELU CORONA'],
        ['MERCACHIFLE LA CRISTINA', 'CHARQUE CHIQUILIN', 'YANCAMIL PIUQUE'],
        'DE OTO, LUCIANA SOLEDAD', 213, 120100, '28-11-2022'),
      P(3, 'Tercer Mejor', 'TRES AR MEDUSA', 71,
        ['DEL OESTE PILCHERO', 'DEL OESTE MUTANTE', 'DEL OESTE PILCHA BARATA'],
        ['CINCO-AR PAJA MANSA', 'TRES AR ÑANDUBAY', 'ÑI GARZA FILOSA'],
        'ARGÜELLES, MARCELO', 757, 124841, '27-10-2022'),
      P(4, 'Cuarto Mejor', 'AÑORANZA SOBERANA', 60,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['MANEADORA TIRANA', 'CHARQUE CAPRICHO', 'MANEADORA MEU BEM'],
        'RUSSO, ALEJANDRO JOSE', 41, 121551, '08-03-2023'),
    ]},
    { id: 'h-yegua-menor', title: 'Yegua Adulta Menor', kind: 'cat-hembra', placements: [
      P(1, 'Campeón', 'TRES AR RESFRIADA', 80,
        ['YANCAMIL CAHUEL', 'YANCA BANDONEON', 'YANCAMIL VILLAMAN'],
        ['TRES AR ALMA BLANCA', 'TRES AR MISERABLE', 'MANEADORA CORNADA'],
        'ARGÜELLES, MARCELO', 728, 119792, '08-11-2021'),
      P(2, 'Reservado Campeón', 'GUACHIGO MADRILEÑA', 79,
        ['GUACHIGO CALLEJON', 'GUACHIGO NO TE ACHIQUES', 'BALLENERA GALANA'],
        ['GUACHIGO MECHENGA', 'MAÑANERO CHUPETIN', 'BALLENERA PINDONGUERA'],
        'AMADEO LASTRA, FELIPE SINFOROSO', 513, 117449, '09-11-2021'),
      P(3, 'Tercer Mejor', 'VELETA LA VILLERITA', 84,
        ['VELETA EMBAJADOR', 'DEL OESTE ZORRINO', 'QUELU CORONA'],
        ['AGENCIADA EUSTAQUIA', 'PATRON VIEJO CORRION', 'VILCUN SEÑORITA'],
        'DE OTO, SOFIA ANTONELLA', 160, 114914, '05-10-2021'),
      P(4, 'Cuarto Mejor', 'GUIRITA HERMOSA', 82,
        ['AS MALKE SEDUTOR', '—', '—'],
        ['GUACHIGO GUAPA', 'MAÑANERO DESPRECIADO', 'BALLENERA LOLA CLAVIJO'],
        'LA VICTORIA S.A.', 144, 114884, '25-10-2021'),
    ]},
    { id: 'h-yegua-mayor', title: 'Yegua Adulta Mayor', kind: 'cat-hembra', placements: [
      P(1, 'Campeón', 'MERCACHIFLE MILONGUERA', 97,
        ['MERCACHIFLE DORMILON', 'CHARQUE CHIQUILIN', 'GUAMPA PICARONA'],
        ['MERCACHIFLE FANATICA', 'NOCHERO REGUERO', 'DEL OESTE DOÑA ROSA'],
        'DE OTO, RICARDO', 490, 99899, '08-10-2017'),
      P(2, 'Reservado Campeón', 'TAÑIDO NAFTERA', 90,
        ['TAÑIDO MORTERO', 'AGUA DE LOS C.', 'MAQUENA AGUA FIES'],
        ['TAÑIDO NAZARENA', 'FACUNDO DA CHARQUEADA', 'TAÑIDO NATIVA'],
        'BALLESTER, FELIPE JUAN', 1309, 108759, '30-12-2019'),
      P(3, 'Tercer Mejor', 'TAÑIDO MARAVILLA', 86,
        ['TAÑIDO OJO ALEGRE', 'TAÑIDO MALULITO', 'VISTA VOLCAN OJOS NEGROS'],
        ['TAÑIDO MARGARITA', 'DEL OESTE MUTANTE', 'BT MARAVILHA DO JUNCO'],
        'BALLESTER, FELIPE JUAN', 1343, 112484, '27-12-2020'),
      P(4, 'Cuarto Mejor', 'GUIRITA FORTUNA T/E', 92,
        ['AS MALKE SEDUTOR', '—', '—'],
        ['CHARQUE SERENATA', 'HERMANO DA RECONQUISTA', 'GOLILLA PRESUMIDA'],
        'LA VICTORIA S.A.', 90, 113764, '04-12-2019'),
    ]},
  ],
};


export {
  HORSES,
  EVENTS,
  DISCIPLINES,
  NEWS,
  RESULTS,
  LOTES,
  CATALOG_CATEGORIES,
  MORFOLOGIA_RESULTS,
};
