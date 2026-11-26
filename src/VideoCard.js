import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Icon, Card, F } from './components';
import { withAlpha } from './theme';

// Tarjeta de un video.
//
// Los de YouTube montan el player **de entrada**, sin miniatura propia
// adelante. Es a propósito: iOS no deja que un WebView recién montado
// arranque a sonar sin un gesto hecho adentro de él, así que una miniatura
// nuestra costaba dos toques —uno para montar el player y otro sobre el
// botón rojo de YouTube— para ver un video. Montado desde el arranque, el
// primer toque ya es el que reproduce. Lo que se ve en reposo es el poster
// de YouTube, que es la misma imagen que usábamos de miniatura.
//
// Lo que no es de YouTube —un canal, Facebook, un episodio de Spotify— no
// tiene player: la tarjeta abre `url` afuera, donde la app del proveedor ya
// tiene la sesión del usuario.
export default function VideoCard({ t, v, ancho, lineasTitulo = 3 }) {
  const alto = Math.round((ancho * 9) / 16);
  const esYoutube = !!v.youtubeId;

  return (
    <Card t={t}>
      {esYoutube ? (
        <View style={{ height: alto, backgroundColor: '#000' }}>
          <YoutubePlayer height={alto} width={ancho} videoId={v.youtubeId} play={false} />
        </View>
      ) : (
        <TouchableOpacity
          accessibilityLabel={`Abrir ${v.title}`}
          onPress={() => { if (v.url) Linking.openURL(v.url).catch(() => {}); }}
          activeOpacity={0.85}
        >
          {/* Sin foto (Spotify, Facebook, los links a canal): un tile con el
              color de la casa y una sola marca, la flecha de "se abre
              afuera". El ícono del tipo iría justo abajo de la flecha, así
              que no va: el rótulo ya dice si es video o podcast. */}
          <View style={{ height: alto, backgroundColor: withAlpha(t.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: withAlpha(t.accent, 0.9), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowUR" size={22} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>{v.tipoLabel}</Text>
          {!esYoutube && (
            <Text style={{ fontSize: 10.5, color: t.textMute }} numberOfLines={1}>Se abre afuera</Text>
          )}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 15.5, lineHeight: 20, color: t.text }} numberOfLines={lineasTitulo}>{v.title}</Text>
      </View>
    </Card>
  );
}
