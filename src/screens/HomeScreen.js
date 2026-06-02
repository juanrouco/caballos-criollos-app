import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Icon, Crest, Card, Medal, Divider, SectionLabel, F } from '../components';
import { withAlpha, DISCIPLINE_COLORS, DISCIPLINE_ICONS } from '../theme';
import { DISCIPLINES, RESULTS, NEWS } from '../data';
import { fetchEventos, mapEvent, todayISO } from '../api';
import { useLive } from '../LiveContext';

const EVENT_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026033105542099399.jpg' };
const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };

export default function HomeScreen({ t, navigation }) {
  const { live } = useLive();
  const [events, setEvents] = React.useState(null); // null = loading, [] = vacío, [...] = ok
  const [error, setError] = React.useState(null);

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
        <TouchableOpacity style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={18} color={t.textMute} />
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
          <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { id: live.evento.id })}>
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
            <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { id: e.id })} style={{ width: 230 }}>
              <Card t={t}>
                <Image source={EVENT_PHOTO} style={{ width: '100%', height: 110 }} resizeMode="cover" />
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
        {DISCIPLINES.map((d) => (
          <View key={d.id} style={{ width: 108, borderRadius: 14, backgroundColor: d.color, overflow: 'hidden' }}>
            <View style={{ height: 78, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={DISCIPLINE_ICONS[d.id]} style={{ width: 52, height: 52, tintColor: '#fff' }} resizeMode="contain" />
            </View>
            <View style={{ padding: 11, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: '#fff', textAlign: 'center' }}>{d.short}</Text>
              <Text style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{d.count}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Últimos resultados */}
      <SectionLabel t={t}>Últimos resultados</SectionLabel>
      <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
        <Card t={t}>
          {RESULTS.map((r, i) => (
            <View key={r.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <Medal size={26} t={t} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase' }}>{r.cat}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text, marginTop: 2 }}>{r.winner}</Text>
                  <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3 }}>{r.event} · {r.criador}</Text>
                </View>
                <Text style={{ fontSize: 11, color: t.textDim, fontFamily: F.mono }}>{r.date}</Text>
              </View>
              {i < RESULTS.length - 1 && <Divider t={t} style={{ marginLeft: 16 }} />}
            </View>
          ))}
        </Card>
      </View>

      {/* Noticias */}
      <SectionLabel t={t}>Noticias</SectionLabel>
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {NEWS.map((n) => (
          <Card key={n.id} t={t}>
            <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
              <Image source={NEWS_PHOTO} style={{ width: 72, height: 72, borderRadius: 8 }} resizeMode="cover" />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase' }}>{n.tag}</Text>
                  <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono }}>{n.date}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{n.title}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
