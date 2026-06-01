import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Icon, Crest, Card, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { PREMIO_SOLANET, DISCIPLINE_RANKINGS } from '../data';

const TOP_GENERIC = [
  { rank: 1, name: 'CASÍN, HORACIO', owner: 'Cab. El Cardal', points: 1620 },
  { rank: 2, name: 'BARALE, GERMÁN', owner: 'La Invernada', points: 1480 },
  { rank: 3, name: 'BALLESTER, FELIPE', owner: 'La Valentina', points: 1240 },
  { rank: 4, name: 'AGUIRRE, MARIANO', owner: 'La Martita', points: 1180 },
  { rank: 5, name: 'TRONCONI, J.V.', owner: 'Las Mulitas', points: 1090 },
];

export default function RankingCatScreen({ t, navigation, route }) {
  const { disc, cat } = route.params || {};
  const isSolanet = disc === 'solanet';
  const d = !isSolanet ? DISCIPLINE_RANKINGS.find((x) => x.id === disc) : null;
  const c = !isSolanet ? d?.categories.find((x) => x.id === cat) : null;
  const list = isSolanet ? PREMIO_SOLANET.topCriadores : (c?.top || TOP_GENERIC);
  const title = isSolanet ? 'Premio E. Solanet' : c?.name;
  const subtitle = isSolanet ? 'Edición ' + PREMIO_SOLANET.season : d?.name;
  const accent = isSolanet ? t.accent : (d?.color === '#0d121f' ? t.accent : d?.color || t.accent);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: accent, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 8 }}>{subtitle}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>{title}</Text>
      </View>

      {/* Podium */}
      <View style={{ paddingHorizontal: 20, marginBottom: 18, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        {[list[1], list[0], list[2]].map((r, i) => {
          if (!r) return <View key={i} style={{ flex: 1 }} />;
          const place = r.rank;
          const pc = place === 1 ? accent : place === 2 ? t.textMute : t.accentDeep;
          return (
            <View key={r.rank} style={{ flex: place === 1 ? 1.15 : 1, backgroundColor: place === 1 ? t.surface2 : t.surface, borderWidth: 1, borderColor: place === 1 ? withAlpha(accent, 0.6) : t.border, borderRadius: 12, padding: 12, paddingVertical: place === 1 ? 18 : 14, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: pc, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: t.bg }}>{place}</Text>
              </View>
              <Crest size={place === 1 ? 38 : 32} color={accent} bg={withAlpha(accent, 0.1)} ring={withAlpha(accent, 0.25)} horse />
              <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: place === 1 ? 13 : 12, color: t.text, textAlign: 'center' }}>{r.name}</Text>
              <Text style={{ fontFamily: F.mono, fontSize: place === 1 ? 14 : 12, color: accent }}>{r.points}</Text>
            </View>
          );
        })}
      </View>

      <SectionLabel t={t}>Tabla completa</SectionLabel>
      <View style={{ paddingHorizontal: 20 }}>
        <Card t={t}>
          {list.map((r, i) => (
            <View key={r.rank}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <Text style={{ width: 26, fontFamily: F.display, fontSize: 18, color: r.rank <= 3 ? accent : t.textMute, textAlign: 'center' }}>{r.rank}</Text>
                <Crest size={32} color={accent} bg={withAlpha(accent, 0.1)} ring={withAlpha(accent, 0.25)} horse />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{r.name}</Text>
                  <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3 }}>{r.owner}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 14, color: t.text }}>{r.points}</Text>
                  <Text style={{ fontSize: 10, color: t.textDim, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>pts</Text>
                </View>
              </View>
              {i < list.length - 1 && <Divider t={t} style={{ marginLeft: 16 }} />}
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}
