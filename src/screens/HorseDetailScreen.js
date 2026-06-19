import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, Crest, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { fetchAnimalPedigree, mapAnimalPedigree } from '../api';

// Cache por id de animal — mismo patrón que EventDetailScreen: evita re-fetch
// y spinner al volver al mismo caballo dentro de la sesión.
const animalCache = new Map();

// 4-gen pedigree tree: 3 columns × 8 rows.
function PedigreeNode({ parent, t, level }) {
  const accent = level === 1;
  const fontSize = level === 1 ? 13 : level === 2 ? 11.5 : 10.5;
  if (!parent || !parent.name) {
    return <View style={{ flex: 1, backgroundColor: withAlpha(t.surface2, 0.35), borderRadius: 6 }} />;
  }
  const sub = [parent.year, parent.sex].filter(Boolean).join(' · ');
  return (
    <View style={{ flex: 1, backgroundColor: accent ? t.surface2 : t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 6, padding: level === 1 ? 10 : 7, justifyContent: 'center' }}>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize, color: accent ? t.accent : t.text }}>{parent.name}</Text>
      {!!sub && <Text style={{ fontSize: level === 1 ? 10 : 9, color: t.textMute, marginTop: 3, fontFamily: F.mono }}>{sub}</Text>}
    </View>
  );
}

function PedigreeTree({ h, t }) {
  const sire = h.sire || {}, dam = h.dam || {};
  const ss = sire.sire || {}, sd = sire.dam || {}, ds = dam.sire || {}, dd = dam.dam || {};
  const ROW = 46, GAP = 5;
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

function BackButton({ t, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
      <Icon name="arrowL" size={18} color={t.text} />
    </TouchableOpacity>
  );
}

export default function HorseDetailScreen({ t, navigation, route }) {
  const id = route.params?.id;
  const [horse, setHorse] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (id == null) { setError('Falta el id del animal.'); return; }
    let cancelled = false;
    const cached = animalCache.get(String(id));
    if (cached) { setHorse(cached); setError(null); return; }
    setHorse(null); setError(null);
    fetchAnimalPedigree(id)
      .then((payload) => {
        if (cancelled) return;
        const mapped = mapAnimalPedigree(payload);
        animalCache.set(String(id), mapped);
        setHorse(mapped);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'No se pudo cargar el animal.'); });
    return () => { cancelled = true; };
  }, [id]);

  const onBack = () => navigation.goBack();

  if (error) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <BackButton t={t} onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 14 }}>{error}</Text>
          <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
            <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!horse) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <BackButton t={t} onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      </View>
    );
  }

  const idLine = [horse.rp ? `R.P. ${horse.rp}` : '', horse.sba ? `S.B.A. ${horse.sba}` : '']
    .filter(Boolean).join(' · ');
  const metaFields = [
    ['Nacimiento', formatDate(horse.born)],
    ['Sexo',       horse.sex],
    ['Pelaje',     horse.pelaje],
  ].filter(([, v]) => v);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <BackButton t={t} onPress={onBack} />

        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 22 }}>
          <Crest size={76} color={t.accent} bg={withAlpha(t.accent, 0.07)} ring={withAlpha(t.accent, 0.33)} horse />
          <View style={{ flex: 1, paddingTop: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>{horse.name}</Text>
            {!!idLine && (
              <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 6, fontFamily: F.bodyBold }}>{idLine}</Text>
            )}
          </View>
        </View>

        {metaFields.length > 0 && (
          <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
            {metaFields.map(([k, v], i) => (
              <View key={k} style={{ flex: 1, padding: 12, borderRightWidth: i < metaFields.length - 1 ? 1 : 0, borderRightColor: t.border }}>
                <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {!!horse.propietario && (
          <View style={{ marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Propietario</Text>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{horse.propietario}</Text>
            {!!horse.propietarioNum && (
              <Text style={{ fontSize: 12, color: t.accent, marginTop: 4, fontFamily: F.bodyMed }}>N° {horse.propietarioNum}</Text>
            )}
          </View>
        )}
      </View>

      <SectionLabel t={t}>Pedigree · 4 generaciones</SectionLabel>
      <View style={{ paddingHorizontal: 20 }}><PedigreeTree h={horse} t={t} /></View>
    </ScrollView>
  );
}
