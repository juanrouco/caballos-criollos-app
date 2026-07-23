import React from 'react';
import { View, Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Icon, F } from './components';

// Barrita global de "sin conexión". Aparece sola cuando no hay internet y se
// oculta al volver — no bloquea la app (a diferencia de un Alert): el usuario
// sigue viendo lo que ya cargó en memoria (pedigrees, eventos abiertos).
//
// Criterio anti-parpadeo: sólo se muestra cuando la conexión es *claramente*
// inexistente. `isInternetReachable` arranca en null mientras NetInfo sondea;
// tratamos null como "todavía no sabemos" y no mostramos nada, así no titila
// en el arranque ni en microcortes de reachability.
export function isOffline(state) {
  if (!state) return false;
  if (state.isConnected === false) return true;          // sin interfaz (avión, wifi off)
  if (state.isInternetReachable === false) return true;  // conectado pero sin salida
  return false;
}

export default function ConnectionBanner({ t }) {
  const state = useNetInfo();
  if (!isOffline(state)) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="Sin conexión a internet"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: t.text,
      }}
    >
      <Icon name="wifiOff" size={15} color={t.bg} stroke={2} />
      <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 12.5, letterSpacing: 0.2 }}>
        Sin conexión a internet
      </Text>
    </View>
  );
}
