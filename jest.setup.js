/* eslint-disable global-require */
// Mocks de módulos nativos para que las screens monten en jsdom.

// react-native-svg: stubeamos cada componente como un View para que el
// árbol de render se monte sin tocar nada nativo.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (name) => {
    const Comp = React.forwardRef((props, ref) =>
      React.createElement(View, { ref, accessibilityLabel: name, ...props }, props.children),
    );
    Comp.displayName = name;
    return Comp;
  };
  const Svg = make('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Defs: make('Defs'),
    LinearGradient: make('LinearGradient'),
    Stop: make('Stop'),
    Rect: make('Rect'),
    Circle: make('Circle'),
    Path: make('Path'),
    G: make('G'),
    Polygon: make('Polygon'),
    Polyline: make('Polyline'),
    Line: make('Line'),
    Ellipse: make('Ellipse'),
    Text: make('SvgText'),
  };
});

// react-native-webview: View con el mismo prop surface mínimo. Atrapamos
// `injectedJavaScript` y `onMessage` para que el body de NewsDetail no
// rompa al montar.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) =>
    React.createElement(View, { ref, accessibilityLabel: 'WebView' }, null),
  );
  return { __esModule: true, WebView };
});

// react-native-youtube-iframe: idem.
jest.mock('react-native-youtube-iframe', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, { accessibilityLabel: 'YoutubePlayer', ...props }),
  };
});

// react-native-safe-area-context: insets en 0 + passthrough en test.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => inset,
    SafeAreaInsetsContext: React.createContext(inset),
  };
});

// expo-splash-screen: no-ops en test.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// expo-notifications: stub mínimo. Cada test puede override con
// jest.spyOn si necesita controlar el resultado.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: '' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
}));

// expo-application: stub para resolveDeviceId (los IDs nativos no
// existen en jest, así que devolvemos null por default).
jest.mock('expo-application', () => ({
  getIosIdForVendorAsync: jest.fn(() => Promise.resolve(null)),
  getAndroidId: jest.fn(() => null),
}));

// expo-device: por default simulamos device físico para que los tests
// del hook entren al flow de registro.
jest.mock('expo-device', () => ({ isDevice: true }));

// expo-constants: projectId no seteado por default y executionEnvironment
// = 'bare' (cualquier valor distinto de 'storeClient' deja el flow
// completo de registro activo en los tests).
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'bare',
    expoConfig: { extra: { eas: { projectId: null } } },
  },
}));

// @react-native-community/netinfo: por default reportamos "online" en test
// (isConnected true, isInternetReachable true) para que el banner no aparezca.
// Los tests del banner override `useNetInfo` con jest.spyOn / mockReturnValue.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  default: { addEventListener: jest.fn(() => jest.fn()), fetch: jest.fn() },
}));

// AsyncStorage: el mock oficial expone una in-memory store que reinicia
// solo entre tests si llamás AsyncStorage.clear(). Suficiente para el
// NotificationsContext (lee/escribe la key `notifs:lastSeenAt`).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-font / google fonts: no necesitamos cargar nada en test.
jest.mock('@expo-google-fonts/roboto', () => ({
  useFonts: () => [true],
  Roboto_400Regular: 'Roboto_400Regular',
  Roboto_500Medium: 'Roboto_500Medium',
  Roboto_700Bold: 'Roboto_700Bold',
}));
jest.mock('@expo-google-fonts/inter-tight', () => ({
  InterTight_600SemiBold: 'InterTight_600SemiBold',
  InterTight_700Bold: 'InterTight_700Bold',
}));
