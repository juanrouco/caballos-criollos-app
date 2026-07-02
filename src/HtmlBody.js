import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

// Render de HTML crudo (el `cuerpo` de una noticia / reglamento) en un WebView
// que se autoajusta de alto. La API devuelve HTML con imágenes embebidas, así
// que pintarlo como texto plano perdería formato. El injectedJavaScript postea
// el scrollHeight al montar y cuando terminan de cargar las imágenes.
export default function HtmlBody({ html, t }) {
  const { width } = useWindowDimensions();
  const [height, setHeight] = React.useState(200);
  const wrapped = `<!doctype html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      html, body { margin: 0; padding: 0; background: ${t.bg}; color: ${t.text}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.55; }
      img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block; }
      h1, h2, h3 { font-family: "Inter Tight", -apple-system, sans-serif; line-height: 1.25; margin: 18px 0 8px; color: ${t.text}; }
      h1 { font-size: 22px; }
      h2 { font-size: 20px; }
      h3 { font-size: 16px; }
      p { margin: 0 0 12px; }
      a { color: ${t.accent}; text-decoration: none; }
      ul, ol { padding-left: 20px; margin: 0 0 12px; }
      blockquote { border-left: 3px solid ${t.accent}; padding-left: 12px; margin: 12px 0; color: ${t.textMute}; }
    </style></head><body>${html}</body></html>`;
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: wrapped }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={{ width: width - 40, height, backgroundColor: 'transparent' }}
        injectedJavaScript={`
          (function() {
            function post() {
              var h = document.body ? document.body.scrollHeight : 0;
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
            }
            if (document.readyState === 'complete') post();
            else window.addEventListener('load', post);
            Array.prototype.slice.call(document.images || []).forEach(function(img) {
              if (!img.complete) img.addEventListener('load', post);
            });
          })();
          true;
        `}
        onMessage={(e) => {
          const h = parseInt(e.nativeEvent.data, 10);
          if (Number.isFinite(h) && h > 0 && Math.abs(h - height) > 2) setHeight(h);
        }}
      />
    </View>
  );
}
