import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Icon, Crest, Divider, SectionLabel, F } from '../components';
import { withAlpha, DISCIPLINE_ICONS } from '../theme';
import { PREMIO_SOLANET, DISCIPLINE_RANKINGS } from '../data';

export default function RankingsScreen({ t, navigation }) {
  const [year, setYear] = React.useState('2025');
  const [open, setOpen] = React.useState('freno');
  const ps = PREMIO_SOLANET;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Temporada</Text>
        <Text style={{ fontFamily: F.display, fontSize: 38, color: t.text }}>Rankings</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: t.border, marginBottom: 22 }}>
        {['2025', '2024', '2023'].map((y) => (
          <TouchableOpacity key={y} onPress={() => setYear(y)} style={{ paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: year === y ? t.accent : 'transparent', marginBottom: -1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: year === y ? t.accent : t.textMute }}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Premio Solanet */}
      <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
        <TouchableOpacity onPress={() => navigation.navigate('RankingCat', { disc: 'solanet', cat: 'solanet' })}>
          <View style={{ backgroundColor: t.surface2, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.accent, 0.4), overflow: 'hidden' }}>
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trophy" size={26} color={t.bg} stroke={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 22, color: t.text }}>Premio E. Solanet</Text>
                  <Text style={{ fontSize: 12, color: t.textMute, marginTop: 5, fontFamily: F.mono }}>Edición {ps.season}</Text>
                </View>
              </View>
              <Divider t={t} style={{ marginHorizontal: -18, marginBottom: 14 }} />
              <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyMed, marginBottom: 6 }}>1° puesto · Criador</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: t.accent }}>{ps.winner.name}</Text>
                  <Text style={{ fontSize: 12, color: t.textMute, marginTop: 3 }}>{ps.winner.owner} · {ps.winner.city}</Text>
                </View>
                <View style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 12 }}>Ranking</Text>
                  <Icon name="arrow" size={13} color={t.bg} stroke={2.2} />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <SectionLabel t={t}>Por disciplina</SectionLabel>
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {DISCIPLINE_RANKINGS.map((d) => {
          const isOpen = open === d.id;
          return (
            <View key={d.id} style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: isOpen ? withAlpha(d.color, 0.7) : t.border, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => setOpen(isOpen ? null : d.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: d.color, alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={DISCIPLINE_ICONS[d.id]} style={{ width: 26, height: 26, tintColor: '#fff' }} resizeMode="contain" />
                </View>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }}>{d.name}</Text>
                <Icon name="arrow" size={16} color={t.textMute} />
              </TouchableOpacity>
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
                  {d.categories.map((c, i) => (
                    <View key={c.id}>
                      <TouchableOpacity onPress={() => c.kind === 'view' && navigation.navigate('RankingCat', { disc: d.id, cat: c.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 18, paddingRight: 14 }}>
                        <View style={{ width: 3, height: 22, backgroundColor: d.color, borderRadius: 2 }} />
                        <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: t.text }}>{c.name}</Text>
                        {c.kind === 'view' ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: withAlpha(d.color, 0.15) }}>
                            <Text style={{ color: d.color === '#0d121f' ? t.text : d.color, fontSize: 10.5, fontFamily: F.bodyBold, textTransform: 'uppercase' }}>Ver</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: t.border }}>
                            <Icon name="pdf" size={11} color={t.textMute} stroke={2} />
                            <Text style={{ color: t.textMute, fontSize: 10.5, fontFamily: F.bodyBold }}>PDF</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {i < d.categories.length - 1 && <Divider t={t} style={{ marginLeft: 18 }} />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
