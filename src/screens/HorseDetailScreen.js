import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Icon, Crest, Card, Medal, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { HORSES } from '../data';

// 4-gen pedigree tree: 3 columns × 8 rows.
function PedigreeNode({ parent, t, level }) {
  const accent = level === 1;
  const fontSize = level === 1 ? 13 : level === 2 ? 11.5 : 10.5;
  if (!parent || !parent.name) {
    return <View style={{ flex: 1, backgroundColor: withAlpha(t.surface2, 0.35), borderRadius: 6 }} />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: accent ? t.surface2 : t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 6, padding: level === 1 ? 10 : 7, justifyContent: 'center' }}>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize, color: accent ? t.accent : t.text }}>{parent.name}</Text>
      {parent.year ? <Text style={{ fontSize: level === 1 ? 10 : 9, color: t.textMute, marginTop: 3, fontFamily: F.mono }}>{parent.year}{parent.sex ? ` · ${parent.sex}` : ''}</Text> : null}
    </View>
  );
}

function PedigreeTree({ h, t }) {
  const sire = h.sire || {}, dam = h.dam || {};
  const ss = sire.sire || {}, sd = sire.dam || {}, ds = dam.sire || {}, dd = dam.dam || {};
  const ROW = 46, GAP = 5;
  // column heights: col1 nodes span 4 rows, col2 span 2, col3 span 1
  const h4 = ROW * 4 + GAP * 3;
  const h2 = ROW * 2 + GAP;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {/* Col 1: parents */}
      <View style={{ flex: 1.05, gap: GAP }}>
        <View style={{ height: h4 }}><PedigreeNode parent={h.sire} t={t} level={1} /></View>
        <View style={{ height: h4 }}><PedigreeNode parent={h.dam} t={t} level={1} /></View>
      </View>
      {/* Col 2: grandparents */}
      <View style={{ flex: 0.97, gap: GAP }}>
        <View style={{ height: h2 }}><PedigreeNode parent={sire.sire} t={t} level={2} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={sire.dam} t={t} level={2} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={dam.sire} t={t} level={2} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={dam.dam} t={t} level={2} /></View>
      </View>
      {/* Col 3: great-grandparents */}
      <View style={{ flex: 0.97, gap: GAP }}>
        {[ss.sire, ss.dam, sd.sire, sd.dam, ds.sire, ds.dam, dd.sire, dd.dam].map((p, i) => (
          <View key={i} style={{ height: ROW }}><PedigreeNode parent={p} t={t} level={3} /></View>
        ))}
      </View>
    </View>
  );
}

export default function HorseDetailScreen({ t, navigation, route }) {
  const h = HORSES.find((x) => x.id === route.params?.id) || HORSES[0];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 22 }}>
          <Crest size={76} color={t.accent} bg={withAlpha(t.accent, 0.07)} ring={withAlpha(t.accent, 0.33)} horse />
          <View style={{ flex: 1, paddingTop: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>{h.name}</Text>
            <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 6, fontFamily: F.bodyBold }}>R.P. {h.rp || '—'} · S.B.A. {h.sba || '—'}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
          {[['Nacimiento', h.born], ['Sexo', h.sex], ['Pelaje', h.pelaje]].map(([k, v], i) => (
            <View key={k} style={{ flex: 1, padding: 12, borderRightWidth: i < 2 ? 1 : 0, borderRightColor: t.border }}>
              <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k}</Text>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Criador</Text>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{h.criador}</Text>
          <Text style={{ fontSize: 12, color: t.accent, marginTop: 4, fontFamily: F.bodyMed }}>{h.criadero}</Text>
        </View>
      </View>

      <SectionLabel t={t}>Pedigree · 4 generaciones</SectionLabel>
      <View style={{ paddingHorizontal: 20 }}><PedigreeTree h={h} t={t} /></View>

      {h.titles && h.titles.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <SectionLabel t={t}>Palmarés</SectionLabel>
          <View style={{ paddingHorizontal: 20 }}>
            <Card t={t}>
              {h.titles.map((title, i) => (
                <View key={i}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                    <Medal size={22} t={t} />
                    <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text, flex: 1 }}>{title}</Text>
                  </View>
                  {i < h.titles.length - 1 && <Divider t={t} style={{ marginLeft: 16 }} />}
                </View>
              ))}
            </Card>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
