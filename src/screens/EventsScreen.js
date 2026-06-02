import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, Card, F } from '../components';
import { withAlpha } from '../theme';
import { fetchEventos, mapEvent, todayISO } from '../api';
import { useLive } from '../LiveContext';

export default function EventsScreen({ t, navigation }) {
  const [filter, setFilter] = React.useState('proximos');
  const [events, setEvents] = React.useState(null); // null = loading, [] = vacío, [...] = ok
  const [error, setError] = React.useState(null);
  const { live } = useLive();

  const load = React.useCallback(async (f) => {
    if (f === 'remates') {
      setEvents([]);
      setError(null);
      return;
    }
    setEvents(null);
    setError(null);
    try {
      // Próximos: más cercanos primero. Pasados: más recientes primero
      // (es el default de la API, así que no hace falta pasar sort).
      const params = f === 'proximos'
        ? { fecha_desde: todayISO(), sort: 'fecha_asc', limit: 50 }
        : { fecha_hasta: todayISO(), limit: 50 };
      const r = await fetchEventos(params);
      const mapped = (r.data || []).map(mapEvent).filter((e) => !e.suspendido);
      setEvents(mapped);
    } catch (e) {
      setEvents([]);
      setError(e.message || 'No se pudieron cargar los eventos.');
    }
  }, []);

  React.useEffect(() => { load(filter); }, [filter, load]);

  // Agrupar por fecha exacta (YYYY-MM-DD) preservando el orden del array.
  const groups = React.useMemo(() => {
    const map = new Map();
    (events || []).forEach((e) => {
      const key = e.fecha || 'sin-fecha';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
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

      {filter === 'remates' ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Card t={t}>
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginBottom: 6 }}>Próximamente</Text>
              <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', lineHeight: 19 }}>La sección de Remates todavía no está conectada.</Text>
            </View>
          </Card>
        </View>
      ) : events === null ? (
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => load(filter)}>
            <Card t={t}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los eventos.</Text>
                <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Card t={t}>
            <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>
              {filter === 'proximos' ? 'No hay eventos próximos.' : 'No hay eventos pasados.'}
            </Text>
          </Card>
        </View>
      ) : (
        groups.map(([fecha, items]) => {
          const head = items[0];
          return (
            <View key={fecha} style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 20, paddingBottom: 12 }}>
                <Text style={{ fontFamily: F.display, fontSize: 26, color: t.accent }}>{head.date.split(' ')[0]}</Text>
                <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {head.date.split(' ')[1]}{head.dayShort ? ` · ${head.dayShort}` : ''}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              </View>
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {items.map((e) => {
                  const isLive = !!live && live.evento?.id === e.id;
                  return (
                    <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { id: e.id })}>
                      <Card t={t}>
                        <View style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: isLive ? t.live : withAlpha(t.accent, 0.33), backgroundColor: isLive ? t.live : 'transparent' }}>
                                <Text style={{ fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.6, color: isLive ? '#fff' : t.accent }}>{isLive ? '● EN VIVO' : e.type}</Text>
                              </View>
                            </View>
                            <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text }} numberOfLines={2}>{e.name}</Text>
                            {!!e.location && (
                              <Text style={{ fontSize: 12, color: t.textMute, marginTop: 4 }} numberOfLines={1}>{e.location}</Text>
                            )}
                            {e.disciplines.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                                {e.disciplines.map((d) => (
                                  <View key={d} style={{ backgroundColor: t.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
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
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
