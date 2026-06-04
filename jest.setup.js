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
