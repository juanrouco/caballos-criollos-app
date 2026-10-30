// jest-expo trae los transforms/mocks de RN. Agregamos el patrón de
// transformIgnore para los paquetes ESM que usamos (svg, webview,
// youtube-iframe, fonts, react-navigation) y un setup file con mocks
// de los nativos que no andan en jsdom.
//
// `.claude/worktrees/` queda afuera por las dos puntas: ahí viven los worktrees
// de las sesiones paralelas, que son copias enteras del proyecto. Sin excluirlos,
// jest corre los tests de cada worktree además de los de este checkout (y los de
// una rama a medio hacer fallan acá, que no es lo que `npm test` tiene que
// medir), y jest-haste-map avisa por los package.json repetidos.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.after.js'],
  // Los 5s de default se quedaban cortos con toda la suite en paralelo: tests
  // que pasan solos fallaban por tiempo y no por lo que afirman. El límite
  // sigue existiendo para atajar un test colgado, con más aire.
  testTimeout: 20000,
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-webview|react-native-youtube-iframe))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/.claude/', '/__tests__/helpers\\.js$'],
};
