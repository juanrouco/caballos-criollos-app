import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Icon, Crest, Card, SectionLabel, F } from '../components';
import { withAlpha, DISCIPLINE_COLORS, DISCIPLINE_ICONS } from '../theme';
import { DISCIPLINES } from '../data';
import { fetchEventos, mapEvent, fetchNoticias, mapNoticia, fetchNoticiaCategorias, todayISO, imgUrl } from '../api';
import { useLive } from '../LiveContext';
import { useNotifications } from '../NotificationsContext';

const EVENT_PHOTO = { uri: 'https://caballoscriollos.com/web/assets/images/accc.jpg' };
const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };

export default function HomeScreen({ t, navigation }) {
  const { live } = useLive();
  const { unreadCount } = useNotifications();
  const [events, setEvents] = React.useState(null); // null = loading, [] = vacío, [...] = ok
  const [error, setError] = React.useState(null);
  const [news, setNews] = React.useState(null);
  const [newsError, setNewsError] = React.useState(null);

  // Navega al detalle de un evento abriéndolo en el stack de EventosTab.
  // En vez de `navigate('EventosTab', { screen, params })` — que no fuerza
  // re-render cuando ya hay un EventDetail en el stack — reescribimos el
  // state del Tab Navigator dejando EventosTab con [EventsList, EventDetail].
  // El EventDetail nuevo monta limpio con los params correctos.
  const openEventDetail = (eventId) => {
    const tabNav = navigation.getParent();
    if (!tabNav) return;
    const tabState = tabNav.getState();
    const eventosIdx = tabState.routes.findIndex((r) => r.name === 'EventosTab');
    if (eventosIdx < 0) return;
    const routes = tabState.routes.map((r) =>
      r.name === 'EventosTab'
        ? {
            name: 'EventosTab',
            state: {
              index: 1,
              routes: [
                { name: 'EventsList' },
                { name: 'EventDetail', params: { id: eventId, from: 'home' } },
              ],
            },
          }
        : (r.state ? { name: r.name, state: r.state } : { name: r.name })
    );
    tabNav.dispatch(CommonActions.reset({ index: eventosIdx, routes }));
  };

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const r = await fetchEventos({ fecha_desde: todayISO(), sort: 'fecha_asc', limit: 10 });
      const mapped = (r.data || [])
        .map(mapEvent)
        .filter((e) => !e.suspendido);
      setEvents(mapped);
    } catch (e) {
      setEvents([]);
      setError(e.message || 'No se pudieron cargar los eventos.');
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Noticias: fetch independiente del de eventos para que un fallo no
  // arrastre al otro. El listado del backend ya viene ordenado por
  // Fijo DESC, Fecha DESC.
  const loadNews = React.useCallback(() => {
    setNewsError(null);
    fetchNoticias({ limit: 3 })
      .then((r) => setNews((r.data || []).map(mapNoticia)))
      .catch((e) => { setNews([]); setNewsError(e.message || 'No se pudieron cargar las noticias.'); });
  }, []);

  React.useEffect(() => { loadNews(); }, [loadNews]);

  // Categorías de noticias: se cachean en memoria para mapear cada tile
  // de DISCIPLINES al filtro de /noticias. Si falla, los tiles quedan sin
  // link (silencioso) — no es bloqueante para el resto de la home.
  const [newsCategorias, setNewsCategorias] = React.useState([]);
  React.useEffect(() => {
    let cancelled = false;
    fetchNoticiaCategorias()
      .then((r) => { if (!cancelled) setNewsCategorias(r.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Match contra el nombre que devuelve /noticias/categorias. Primero
  // exacto (case-insensitive); si no, prefijo — el backend a veces
  // tiene sufijos extra ("Paleteada Campera" ↔ "Paleteada",
  // "Copa Incentivo de Oro" ↔ "Copa Incentivo"). Para casos más raros
  // conviene anotar el id explícito en DISCIPLINES y saltearse esto.
  const findCategoriaForDiscipline = React.useCallback((d) => {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const candidates = [norm(d.name), norm(d.short)].filter(Boolean);
    const exact = newsCategorias.find((c) => candidates.includes(norm(c.nombre)));
    if (exact) return exact;
    return newsCategorias.find((c) => candidates.some((cand) => norm(c.nombre).startsWith(cand))) || null;
  }, [newsCategorias]);

  // Buscar el evento del vivo dentro del listado (puede no estar si su fecha
  // ya pasó pero la transmisión sigue en aire — fallback a los datos del vivo).
  const liveEvent = live ? events?.find((e) => e.id === live.evento.id) || null : null;
  const upcoming = (events || []).filter((e) => !live || e.id !== live.evento.id).slice(0, 5);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Crest size={42} color={t.text} bg={t.surface} ring={withAlpha(t.accent, 0.4)} horse />
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 22, color: t.text }}>Caballos Criollos</Text>
            <Text style={{ fontFamily: F.body, fontSize: 10, color: t.textMute, letterSpacing: 2, marginTop: 4 }}>ASOC. CRIADORES · ACCC</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="bell" size={18} color={t.textMute} />
          {unreadCount > 0 && (
            <View
              accessibilityLabel={`${unreadCount} notificaciones sin leer`}
              style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
                backgroundColor: t.live, borderWidth: 2, borderColor: t.bg,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyBold, lineHeight: 12 }}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search → Pedigree */}
      <TouchableOpacity onPress={() => navigation.navigate('PedigreeTab')} style={{ marginHorizontal: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
        <Icon name="search" size={18} color={t.textMute} />
        <Text style={{ color: t.textDim, fontFamily: F.body, fontSize: 14 }}>Buscar pedigree de caballos…</Text>
      </TouchableOpacity>

      {/* Live banner */}
      {live && (
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <TouchableOpacity onPress={() => openEventDetail(live.evento.id)}>
            <Card t={t} style={{ borderColor: withAlpha(t.live, 0.4) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: withAlpha(t.live, 0.13), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="tv" size={22} color={t.live} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: t.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.6 }}>● EN VIVO</Text>
                    </View>
                    {!!live.titulo && (
                      <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.body }} numberOfLines={1}>{live.titulo}</Text>
                    )}
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text }} numberOfLines={2}>{live.evento?.titulo || ''}</Text>
                  {!!liveEvent?.location && (
                    <Text style={{ fontSize: 12, color: t.textMute, marginTop: 3, fontFamily: F.body }} numberOfLines={1}>{liveEvent.location}</Text>
                  )}
                </View>
                <Icon name="arrow" size={18} color={t.textMute} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      )}

      {/* Próximos eventos */}
      <SectionLabel t={t}>Próximos eventos</SectionLabel>
      {events === null ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 28 }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <TouchableOpacity onPress={load}>
            <Card t={t}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los eventos.</Text>
                <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      ) : upcoming.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
          <Card t={t}>
            <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>No hay eventos próximos.</Text>
          </Card>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 28 }}>
          {upcoming.map((e) => (
            <TouchableOpacity key={e.id} onPress={() => openEventDetail(e.id)} style={{ width: 230 }}>
              <Card t={t}>
                <Image source={e.image ? { uri: imgUrl(e.image, 700) } : EVENT_PHOTO} style={{ width: '100%', height: 110 }} resizeMode="cover" />
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 22, color: t.accent }}>{e.date.split(' ')[0]}</Text>
                    <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase' }}>{e.date.split(' ')[1]}</Text>
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 20, color: t.text, minHeight: 40 }} numberOfLines={2}>{e.name}</Text>
                  <Text style={{ fontSize: 11, color: t.textMute, marginTop: 4 }} numberOfLines={1}>{e.location}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Disciplinas */}
      <SectionLabel t={t}>Disciplinas</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 28 }}>
        {DISCIPLINES.map((d) => {
          const cat = findCategoriaForDiscipline(d);
          return (
            <TouchableOpacity
              key={d.id}
              disabled={!cat}
              activeOpacity={cat ? 0.7 : 1}
              onPress={() => cat && navigation.navigate('NewsList', { categoria: cat.id, categoriaNombre: cat.nombre })}
              style={{ width: 108, borderRadius: 14, backgroundColor: d.color, overflow: 'hidden' }}
            >
              <View style={{ height: 78, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={DISCIPLINE_ICONS[d.id]} style={{ width: 52, height: 52, tintColor: '#fff' }} resizeMode="contain" />
              </View>
              <View style={{ padding: 11, alignItems: 'center' }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: '#fff', textAlign: 'center' }}>{d.short}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Noticias */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase' }}>Noticias</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewsList')}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: t.accent, letterSpacing: 1.2, textTransform: 'uppercase' }}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      {news === null ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 24 }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : newsError ? (
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={loadNews}>
            <Card t={t}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar las noticias.</Text>
                <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      ) : news.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Card t={t}>
            <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>No hay noticias.</Text>
          </Card>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {news.map((n) => (
            <TouchableOpacity key={n.id} onPress={() => navigation.navigate('NewsDetail', { id: n.id, tag: n.tag })}>
              <Card t={t}>
                <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
                  <Image source={n.thumb ? { uri: n.thumb } : NEWS_PHOTO} style={{ width: 72, height: 72, borderRadius: 8 }} resizeMode="cover" />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    {(!!n.tag || !!n.date) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {!!n.tag && (
                          <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase' }} numberOfLines={1}>{n.tag}</Text>
                        )}
                        {!!n.date && (
                          <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono }}>{n.date}</Text>
                        )}
                      </View>
                    )}
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{n.title}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
