// Corre con el entorno de test ya armado (setupFilesAfterEnv), que es lo que
// @testing-library/react-native necesita para configurarse.
//
// El default de waitFor / findBy* es 1s, y con las 35 suites en paralelo eso
// alcanza para que una pantalla con varios awaits encadenados (hidratar la
// sesión → pedir el perfil → pintar) falle por carga de la máquina y no por lo
// que afirma. Subirlo no esconde un test roto: sólo espera más antes de darlo
// por perdido.
const { configure } = require('@testing-library/react-native');

configure({ asyncUtilTimeout: 5000 });
