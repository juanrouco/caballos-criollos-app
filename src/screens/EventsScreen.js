import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Icon, Card, F } from '../components';
import { withAlpha } from '../theme';
import {
  fetchEventos, mapEvent, todayISO,
  fetchNoticias, mapNoticia,
} from '../api';
import { useLive } from '../LiveContext';

const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };
// IdCategoria fijo de "Remates" en el backend. Si se mueve, también se
// actualiza el hardcode (no hay endpoint que mapee disciplinas → categoría).
const REMATES_CATEGORIA_ID = 13;
const PAGE_EVENTS  = 20;
const PAGE_REMATES = 12;

export default function EventsScreen({ t, navigation }) {
  const [filter, setFilter] = React.useState('proximos');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Calendario</Text>
        <Text style={{ fontFamily: F.display, fontSize: 38, color: t.text }}>Eventos</Text>
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 20 }}>
        {[['proximos', 'Próximos'], ['pasados', 'Pasados'], ['remates', 'Remates']].map(([id, label]) => {
          const on = filter === id;
          return (
            <TouchableOpacity key={id} onPress={() => setFilter(id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}>
              <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filter === 'remates'
        ? <RematesList t={t} navigation={navigation} />
        : <EventsList  t={t} navigation={navigation} filter={filter} />
      }
    </View>
  );
}

// ── Eventos (próximos / pasados) ─────────────────────────────────

function EventsList({ t, navigation, filter }) {
  const { live } = useLive();
  const [items, setItems]             = React.useState(null); // null = loading inicial
  const [error, setError]             = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reachedEnd, setReachedEnd]   = React.useState(false);
  const offsetRef = React.useRef(0);
  const reqIdRef  = React.useRef(0);

  const fetchPage = React.useCallback(async (reset) => {
    const myId = ++reqIdRef.current;
    if (reset) { offsetRef.current = 0; setItems(null); setError(null); setReachedEnd(false); }
    else       { setLoadingMore(true); setError(null); }
    const offset = reset ? 0 : offsetRef.current;
    const params = filter === 'proximos'
      ? { fecha_desde: todayISO(), sort: 'fecha_asc', limit: PAGE_EVENTS, offset }
      : { fecha_hasta: todayISO(), limit: PAGE_EVENTS, offset };
    try {
      const r = await fetchEventos(params);
      if (myId !== reqIdRef.current) return;
      const raw  = r.data || [];
      const page = raw.map(mapEvent).filter((e) => !e.suspendido);
      offsetRef.current = offset + raw.length;
      setItems((prev) => (reset ? page : [...(prev || []), ...page]));
      if (raw.length < PAGE_EVENTS) setReachedEnd(true);
      setLoadingMore(false);
    } catch (e) {
      if (myId !== reqIdRef.current) return;
      setError(e.message || 'No se pudieron cargar los eventos.');
      setLoadingMore(false);
      if (reset) setItems([]);
    }
  }, [filter]);

  React.useEffect(() => { fetchPage(true); }, [fetchPage]);

  // Datos planos para FlatList: filas de fecha intercaladas con eventos.
  const rows = React.useMemo(() => {
    const out = [];
    let lastFecha = null;
    (items || []).forEach((e) => {
      const fecha = e.fecha || 'sin-fecha';
      if (fecha !== lastFecha) {
        out.push({ type: 'header', key: `h-${fecha}`, date: e.date, dayShort: e.dayShort });
        lastFecha = fecha;
      }
      out.push({ type: 'event', key: `e-${e.id}`, event: e });
    });
    return out;
  }, [items]);

  const onEndReached = () => {
    if (loadingMore || reachedEnd || error) return;
    if (items === null || items.length === 0) return;
    fetchPage(false);
  };

  if (items === null) {
    return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (error && items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => fetchPage(true)}>
          <Card t={t}>
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los eventos.</Text>
              <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <Card t={t}>
          <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>
            {filter === 'proximos' ? 'No hay eventos próximos.' : 'No hay eventos pasados.'}
          </Text>
        </Card>
      </View>
    );
  }

  const renderRow = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontFamily: F.display, fontSize: 26, color: t.accent }}>{(item.date || '').split(' ')[0]}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase' }}>
            {(item.date || '').split(' ')[1]}{item.dayShort ? ` · ${item.dayShort}` : ''}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        </View>
      );
    }
    const e = item.event;
    const isLive = !!live && live.evento?.id === e.id;
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { id: e.id })}>
          <Card t={t}>
            <View style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: isLive ? t.live : withAlpha(t.accent, 0.33), backgroundColor: isLive ? t.live : 'transparent' }}>
                    <Text style={{ fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.6, color: isLive ? '#fff' : t.accent }}>{isLive ? '● AHORA' : e.type}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text }} numberOfLines={2}>{e.name}</Text>
                {!!e.location && (
                  <Text style={{ fontSize: 12, color: t.textMute, marginTop: 4 }} numberOfLines={1}>{e.location}</Text>
                )}
                {e.disciplines.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                    {e.disciplines.map((d, i) => (
                      <View key={`${d}-${i}`} style={{ backgroundColor: t.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, color: t.textMute }}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Icon name="arrow" size={18} color={t.textDim} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={<ListFooter t={t} loadingMore={loadingMore} error={error} hasItems={items.length > 0} reachedEnd={reachedEnd} pageSize={PAGE_EVENTS} totalLoaded={items.length} onRetry={() => fetchPage(false)} />}
    />
  );
}

// ── Remates (noticias categoría 13) ──────────────────────────────

function RematesList({ t, navigation }) {
  const [items, setItems]             = React.useState(null);
  const [error, setError]             = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reachedEnd, setReachedEnd]   = React.useState(false);
  const offsetRef = React.useRef(0);
  const reqIdRef  = React.useRef(0);

  const fetchPage = React.useCallback(async (reset) => {
    const myId = ++reqIdRef.current;
    if (reset) { offsetRef.current = 0; setItems(null); setError(null); setReachedEnd(false); }
    else       { setLoadingMore(true); setError(null); }
    const offset = reset ? 0 : offsetRef.current;
    try {
      const r = await fetchNoticias({
        categoria: REMATES_CATEGORIA_ID,
        sort: 'fecha_desc',
        limit: PAGE_REMATES,
        offset,
      });
      if (myId !== reqIdRef.current) return;
      const page = (r.data || []).map(mapNoticia);
      offsetRef.current = offset + page.length;
      setItems((prev) => (reset ? page : [...(prev || []), ...page]));
      if (page.length < PAGE_REMATES) setReachedEnd(true);
      setLoadingMore(false);
    } catch (e) {
      if (myId !== reqIdRef.current) return;
      setError(e.message || 'No se pudieron cargar los remates.');
      setLoadingMore(false);
      if (reset) setItems([]);
    }
  }, []);

  React.useEffect(() => { fetchPage(true); }, [fetchPage]);

  const onEndReached = () => {
    if (loadingMore || reachedEnd || error) return;
    if (items === null || items.length === 0) return;
    fetchPage(false);
  };

  if (items === null) {
    return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (error && items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => fetchPage(true)}>
          <Card t={t}>
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los remates.</Text>
              <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <Card t={t}>
          <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>No hay remates próximos.</Text>
        </Card>
      </View>
    );
  }

  const renderRow = ({ item: n }) => (
    <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
      <TouchableOpacity onPress={() => navigation.navigate('NewsDetail', { id: n.id, tag: n.tag })}>
        <Card t={t}>
          <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
            <Image source={n.thumb ? { uri: n.thumb } : NEWS_PHOTO} style={{ width: 72, height: 72, borderRadius: 8 }} resizeMode="cover" />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {!!n.dateYear && (
                <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono, marginBottom: 4 }}>{n.dateYear}</Text>
              )}
              <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{n.title}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      renderItem={renderRow}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={<ListFooter t={t} loadingMore={loadingMore} error={error} hasItems={items.length > 0} reachedEnd={reachedEnd} pageSize={PAGE_REMATES} totalLoaded={items.length} onRetry={() => fetchPage(false)} />}
    />
  );
}

// ── Footer compartido ────────────────────────────────────────────

function ListFooter({ t, loadingMore, error, hasItems, reachedEnd, pageSize, totalLoaded, onRetry }) {
  if (loadingMore) {
    return <View style={{ paddingVertical: 18, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (error && hasItems) {
    return (
      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: t.textMute, marginBottom: 6 }}>No se pudo cargar más.</Text>
        <TouchableOpacity onPress={onRetry}>
          <Text style={{ color: t.accent, fontFamily: F.bodyBold, fontSize: 12 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (reachedEnd && totalLoaded > pageSize) {
    return (
      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: t.textMute }}>Llegaste al final.</Text>
      </View>
    );
  }
  return null;
}
