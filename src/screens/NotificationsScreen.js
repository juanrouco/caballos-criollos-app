import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { Icon, Card, F } from '../components';
import { fetchNotificaciones, mapNotificacion, isUnreadSince } from '../api';
import { useNotifications } from '../NotificationsContext';
import { navigateOnNotificationTap } from '../navigation';

const PAGE_SIZE = 20;

// Iconito por tipo — match con el set de Icon en components.js.
const TIPO_ICON = {
  vivo:     'tv',
  evento:   'calendar',
  noticia:  'bell',
  generico: 'bell',
};

export default function NotificationsScreen({ t, navigation }) {
  const { markAllSeen } = useNotifications();
  const [items, setItems]   = React.useState(null); // null = loading, [] = vacío/error, [...] = ok
  const [error, setError]   = React.useState(null);
  // Snapshot del lastSeenAt previo a marcar todo como visto — se usa
  // para resaltar en la lista las notifs que llegaron después del
  // último check. Queda fijo mientras la pantalla está montada.
  const [seenSnapshot, setSeenSnapshot] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchNotificaciones({ limit: PAGE_SIZE })
      .then((r) => {
        if (cancelled) return;
        setItems((r.data || []).map(mapNotificacion));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'No se pudieron cargar las notificaciones.');
        setItems([]);
      });
    markAllSeen().then((prev) => {
      if (!cancelled) setSeenSnapshot(prev || null);
    });
    return () => { cancelled = true; };
  }, [markAllSeen]);

  const onItemPress = (n) => {
    const tgt = n.target;
    if (!tgt) return;
    if (tgt.url) { Linking.openURL(tgt.url).catch(() => {}); return; }
    if (!tgt.tipo || tgt.id == null) return;
    if (tgt.tipo === 'noticia') {
      // NewsDetail vive en este mismo stack (InicioStack, donde también está
      // esta lista). Pusheamos normal en vez de resetear el tab: así el back
      // vuelve a la lista de notificaciones, no al Home.
      navigation.navigate('NewsDetail', { id: tgt.id });
      return;
    }
    // vivo / evento viven en EventosTab. Usamos el ruteo de deep-link
    // (resetea EventosTab); su back con `from:'home'` vuelve a InicioTab, que
    // sigue mostrando esta lista en el tope. Mapeamos `tipo`→`kind` y duplicamos
    // `id` en `evento_id`.
    navigateOnNotificationTap({ kind: tgt.tipo, id: tgt.id, evento_id: tgt.id });
  };

  const renderItem = ({ item: n }) => {
    const isNew = isUnreadSince(n.fecha, seenSnapshot);
    return (
      <TouchableOpacity onPress={() => onItemPress(n)} disabled={!n.target}>
        <Card t={t} style={isNew ? { borderColor: t.live, backgroundColor: t.surface2 } : null}>
          <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
            {n.imagen ? (
              <Image source={{ uri: n.imagen }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TIPO_ICON[n.tipo] || 'bell'} size={22} color={t.textMute} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {isNew && (
                  <View accessibilityLabel="nueva" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.live }} />
                )}
                <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase' }} numberOfLines={1}>{n.tipo}</Text>
                {!!n.fechaLabel && (
                  <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono }}>{n.fechaLabel}</Text>
                )}
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{n.titulo}</Text>
              {!!n.cuerpo && (
                <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textDim, marginTop: 2 }} numberOfLines={3}>{n.cuerpo}</Text>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>Notificaciones</Text>
      </View>

      {items === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>No hay notificaciones.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
