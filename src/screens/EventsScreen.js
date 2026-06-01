import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Icon, Card, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { EVENTS } from '../data';

export default function EventsScreen({ t, navigation }) {
  const [filter, setFilter] = React.useState('proximos');

  // group by date
  const grouped = {};
  EVENTS.forEach((e) => { (grouped[e.date] = grouped[e.date] || []).push(e); });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Calendario · Otoño 2026</Text>
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

      {Object.keys(grouped).map((date) => (
        <View key={date} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: t.accent }}>{date.split(' ')[0]}</Text>
            <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase' }}>{date.split(' ')[1]} · {grouped[date][0].dayShort}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
          </View>
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {grouped[date].map((e) => (
              <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { id: e.id })}>
                <Card t={t}>
                  <View style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: e.status === 'live' ? t.live : withAlpha(t.accent, 0.33), backgroundColor: e.status === 'live' ? t.live : 'transparent' }}>
                          <Text style={{ fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.6, color: e.status === 'live' ? '#fff' : t.accent }}>{e.status === 'live' ? '● EN VIVO' : e.type}</Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text }}>{e.name}</Text>
                      <Text style={{ fontSize: 12, color: t.textMute, marginTop: 4 }}>{e.location}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                        {e.disciplines.map((d) => (
                          <View key={d} style={{ backgroundColor: t.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10.5, color: t.textMute }}>{d}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Icon name="arrow" size={18} color={t.textDim} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
