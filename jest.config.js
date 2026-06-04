// jest-expo trae los transforms/mocks de RN. Agregamos el patrón de
// transformIgnore para los paquetes ESM que usamos (svg, webview,
// youtube-iframe, fonts, react-navigation) y un setup file con mocks
// de los nativos que no andan en jsdom.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-webview|react-native-youtube-iframe))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/__tests__/helpers\\.js$'],
};
