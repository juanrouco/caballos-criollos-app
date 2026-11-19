import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Linking, Alert, Animated, PanResponder } from 'react-native';
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

// Cuánto se corre la tarjeta para dejar ver «Borrar», y los dos umbrales del
// gesto: a partir del primero queda abierta al soltar; pasado el segundo se
// borra de un tirón, sin tocar el botón.
const ABIERTO = -96;
const UMBRAL_ABRIR = -44;
const UMBRAL_BORRAR = -200;

// Qué hacer al soltar, según cuánto se corrió la tarjeta en total. Sale del
// PanResponder para poder probarlo: el gesto en sí no se puede simular en los
// tests, pero la decisión sí.
export function decidirGesto(total) {
  if (total <= UMBRAL_BORRAR) return 'borrar';
  if (total <= UMBRAL_ABRIR) return 'abrir';
  return 'cerrar';
}

// Fila que se desliza a la izquierda para borrar. Va con PanResponder y
// Animated, que son del core: un solo eje no justifica sumarle al proyecto un
// módulo nativo como react-native-gesture-handler.
//
// El botón vive DETRÁS de la tarjeta y siempre está montado. Eso es lo que lo
// hace alcanzable para VoiceOver, que no sabe deslizar, y para los tests.
function FilaDeslizable({ t, abierta, onAbrir, onCerrar, onBorrar, etiqueta, children }) {
  const x = React.useRef(new Animated.Value(0)).current;
  const desde = React.useRef(0);
  // El PanResponder se crea una sola vez, así que los callbacks se leen de un
  // ref: tomarlos del closure dejaría los de la primera renderizada.
  const cb = React.useRef(null);
  cb.current = { onAbrir, onCerrar, onBorrar };

  const animar = React.useCallback(
    (hasta) => Animated.spring(x, { toValue: hasta, useNativeDriver: true, speed: 20, bounciness: 0 }).start(),
    [x],
  );

  // Sólo una fila abierta a la vez: cuando el padre abre otra, ésta se cierra.
  React.useEffect(() => {
    if (!abierta) { desde.current = 0; animar(0); }
  }, [abierta, animar]);

  const pan = React.useRef(
    PanResponder.create({
      // Tomamos el gesto sólo si es claramente horizontal, para no robarle el
      // scroll a la lista ni el tap a la tarjeta.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => x.setValue(Math.min(0, Math.max(-320, desde.current + g.dx))),
      onPanResponderRelease: (_e, g) => {
        const gesto = decidirGesto(desde.current + g.dx);
        if (gesto === 'borrar') { cb.current.onBorrar(); return; }
        if (gesto === 'abrir') { desde.current = ABIERTO; animar(ABIERTO); cb.current.onAbrir(); }
        else { desde.current = 0; animar(0); cb.current.onCerrar(); }
      },
      // Si la lista intenta quedarse con el gesto a mitad de camino, no se lo
      // cedemos: ya decidimos que era horizontal.
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View>
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => cb.current.onBorrar()}
          accessibilityLabel={etiqueta}
          style={{ width: -ABIERTO, height: '100%', borderRadius: 14, backgroundColor: t.live, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: '#fff' }}>Borrar</Text>
        </TouchableOpacity>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen({ t, navigation }) {
  const { markAllSeen, deletedIds, deleteNotifs } = useNotifications();
  const [items, setItems]   = React.useState(null); // null = loading, [] = vacío/error, [...] = ok
  const [error, setError]   = React.useState(null);
  // Snapshot del lastSeenAt previo a marcar todo como visto — se usa
  // para resaltar en la lista las notifs que llegaron después del
  // último check. Queda fijo mientras la pantalla está montada.
  const [seenSnapshot, setSeenSnapshot] = React.useState(null);
  // Qué fila quedó deslizada: una sola a la vez, como en Mail.
  const [abiertaId, setAbiertaId] = React.useState(null);

  // La API no borra notifs: el borrado es local (ids en el contexto), así
  // que la lista se deriva filtrando lo traído. Derivar en vez de sacar el
  // item del state hace que un borrado se refleje incluso si `deletedIds`
  // llega del AsyncStorage después de que resolvió el fetch.
  const visibles = React.useMemo(
    () => (items || []).filter((n) => !deletedIds.has(String(n.id))),
    [items, deletedIds],
  );

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

  const onDelete = (n) => { setAbiertaId(null); deleteNotifs(n.id); };

  const onDeleteAll = () => {
    const ids = visibles.map((n) => n.id);
    if (!ids.length) return;
    Alert.alert(
      'Borrar todas',
      'Se borran las notificaciones de este teléfono. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => deleteNotifs(ids) },
      ],
    );
  };

  const renderItem = ({ item: n }) => {
    const isNew = isUnreadSince(n.fecha, seenSnapshot);
    return (
      <FilaDeslizable
        t={t}
        abierta={abiertaId === n.id}
        onAbrir={() => setAbiertaId(n.id)}
        onCerrar={() => setAbiertaId((a) => (a === n.id ? null : a))}
        onBorrar={() => onDelete(n)}
        etiqueta={`Borrar notificación: ${n.titulo}`}
      >
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
      </FilaDeslizable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>Notificaciones</Text>
        <View style={{ flex: 1 }} />
        {visibles.length > 0 && (
          <TouchableOpacity onPress={onDeleteAll} accessibilityLabel="Borrar todas">
            <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: t.textMute, letterSpacing: 0.6 }}>Borrar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {items === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error && visibles.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : visibles.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>No hay notificaciones.</Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
