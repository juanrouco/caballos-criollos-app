import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon, Card, Divider, Medal, F } from '../components';
import { withAlpha } from '../theme';
import { EVENTS, CATALOG_CATEGORIES, MORFOLOGIA_RESULTS } from '../data';

const EVENT_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026033105542099399.jpg' };
const YT_EMBED = 'https://www.youtube.com/embed/arn1sPqGpfY?list=PLNLsNZeZ08iiNXi3OQtKIX3sQur4A3sBe&playsinline=1';

export default function EventDetailScreen({ t, navigation, route }) {
  const e = EVENTS.find((x) => x.id === route.params?.id) || EVENTS[0];
  const [tab, setTab] = React.useState('catalogo');

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={{ height: 200 }}>
        <Image source={EVENT_PHOTO} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: withAlpha(t.bg, 0.8), borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {e.status === 'live' && (
            <View style={{ backgroundColor: t.live, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyBold }}>● EN VIVO</Text>
            </View>
          )}
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: withAlpha(t.accent, 0.33) }}>
            <Text style={{ color: t.accent, fontSize: 10, fontFamily: F.bodyBold }}>{e.type}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: t.text }}>{e.name}</Text>
        <Text style={{ fontSize: 13, color: t.textMute, marginTop: 10 }}>{e.dateFull} · {e.location}</Text>

        {/* Inline live video */}
        {e.status === 'live' ? (
          <View style={{ marginTop: 18, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: withAlpha(t.live, 0.4), aspectRatio: 16 / 9, backgroundColor: '#000' }}>
            <WebView
              source={{ uri: YT_EMBED }}
              style={{ flex: 1, backgroundColor: '#000' }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction
              javaScriptEnabled
            />
          </View>
        ) : (
          <TouchableOpacity style={{ marginTop: 18, padding: 13, borderRadius: 12, backgroundColor: t.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="tv" size={16} color={t.bg} />
            <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 14 }}>Transmisión</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 28, borderBottomWidth: 1, borderBottomColor: t.border }}>
          {[['catalogo', 'Catálogo'], ['resultados', 'Resultados'], ['info', 'Info']].map(([id, label]) => {
            const on = tab === id;
            return (
              <TouchableOpacity key={id} onPress={() => setTab(id)} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: on ? t.accent : 'transparent', marginBottom: -1 }}>
                <Text style={{ color: on ? t.text : t.textMute, fontFamily: F.bodyBold, fontSize: 14 }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'catalogo' && <CatalogoTab t={t} navigation={navigation} />}
        {tab === 'resultados' && <ResultsTab t={t} navigation={navigation} />}
        {tab === 'info' && <InfoTab t={t} e={e} />}
      </View>
    </ScrollView>
  );
}

function CatalogoTab({ t, navigation }) {
  const [open, setOpen] = React.useState(null);
  const total = CATALOG_CATEGORIES.reduce((s, c) => s + c.lotes.length, 0);
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 14 }}>{CATALOG_CATEGORIES.length} categorías · {total} lotes</Text>
      <View style={{ gap: 8 }}>
        {CATALOG_CATEGORIES.map((cat) => {
          const isOpen = open === cat.id;
          return (
            <View key={cat.id} style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: isOpen ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => setOpen(isOpen ? null : cat.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: isOpen ? t.accent : withAlpha(t.accent, 0.12), borderWidth: 1, borderColor: withAlpha(t.accent, 0.35), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.display, fontSize: 17, color: isOpen ? t.bg : t.accent }}>{cat.id.slice(1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }}>{cat.name}</Text>
                  <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{cat.lotes.length} lotes</Text>
                </View>
                <Icon name="arrow" size={15} color={t.textMute} />
              </TouchableOpacity>
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
                  {cat.lotes.map((l, i) => (
                    <View key={l.lote}>
                      <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: 'h1' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                        <Text style={{ width: 34, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{l.lote}</Text>
                        <View style={{ width: 1, height: 28, backgroundColor: t.border }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                            <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{l.name}</Text>
                            {l.medal && <Medal size={16} t={t} />}
                          </View>
                          <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 3 }}>{l.sex} · {l.born} · {l.pelaje}</Text>
                        </View>
                        <Icon name="arrow" size={15} color={t.textDim} />
                      </TouchableOpacity>
                      {i < cat.lotes.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ResultsTab({ t, navigation }) {
  const r = MORFOLOGIA_RESULTS;
  const firstGran = r.categorias.find((c) => c.kind === 'gran') || r.categorias[0];
  const [open, setOpen] = React.useState(firstGran.id);
  const sections = [
    { kind: 'gran', label: 'Grandes Campeones' },
    { kind: 'cat-macho', label: 'Categorías · Machos' },
    { kind: 'cat-hembra', label: 'Categorías · Hembras' },
  ];
  return (
    <View style={{ marginTop: 18, gap: 18 }}>
      {/* Info card */}
      <Card t={t}>
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Resultados · {r.info.categoria}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text, marginTop: 4 }}>{r.info.lugar}</Text>
          {[['Fecha', r.info.fecha], ['Región', r.info.region], ['Jurado', r.info.jurado]].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border, marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: t.textMute }}>{k}</Text>
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: t.text, flex: 1, textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
        </View>
      </Card>

      {sections.map((sec) => {
        const items = r.categorias.filter((c) => c.kind === sec.kind);
        if (!items.length) return null;
        return (
          <View key={sec.kind}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 10 }}>{sec.label}</Text>
            <View style={{ gap: 8 }}>
              {items.map((c) => {
                const isOpen = open === c.id;
                const isGran = c.kind === 'gran';
                return (
                  <View key={c.id} style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: isOpen ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
                    <TouchableOpacity onPress={() => setOpen(isOpen ? null : c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 }}>
                      {isGran && (
                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="trophy" size={15} color={t.bg} stroke={2.4} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{c.title}</Text>
                        <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{c.placements.length} puestos</Text>
                      </View>
                      <Icon name="arrow" size={15} color={t.textMute} />
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={{ borderTopWidth: 1, borderTopColor: t.border, padding: 12, gap: 10, backgroundColor: withAlpha(t.surface2, 0.4) }}>
                        {c.placements.map((p, i) => <PlacementCard key={i} p={p} t={t} navigation={navigation} />)}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const STATUS_META = {
  'sin-premio': { label: 'Sin premio', color: '#94a3b8' },
  rechazado: { label: 'Rechazado', color: '#e1503a' },
  'no-asistio': { label: 'No asistió', color: '#64748b' },
};

function PlacementCard({ p, t, navigation }) {
  const isPlaced = p.status === 'placed';
  if (!isPlaced) {
    const s = STATUS_META[p.status];
    return (
      <Card t={t} style={{ backgroundColor: withAlpha(t.surface, 0.6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.textMute }}>Box {p.box} · {p.name}</Text>
            <Text style={{ fontSize: 10.5, color: t.textDim, marginTop: 4, fontFamily: F.mono }}>R.P. {p.rp} · S.B.A. {p.sba} · {p.expositor}</Text>
          </View>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: withAlpha(s.color, 0.4), backgroundColor: withAlpha(s.color, 0.1) }}>
            <Text style={{ color: s.color, fontFamily: F.bodyBold, fontSize: 10.5, textTransform: 'uppercase' }}>{s.label}</Text>
          </View>
        </View>
      </Card>
    );
  }
  return (
    <Card t={t} style={{ borderColor: p.rank === 1 ? withAlpha(t.accent, 0.5) : t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: p.rank === 1 ? withAlpha(t.accent, 0.1) : 'transparent' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.rank === 1 ? t.accent : t.textMute, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: t.bg }}>{p.rank}°</Text>
        </View>
        <Text style={{ fontSize: 11, fontFamily: F.bodyBold, color: p.rank === 1 ? t.accent : t.text, letterSpacing: 1.4, textTransform: 'uppercase' }}>{p.pos}</Text>
      </View>
      <View style={{ padding: 14 }}>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: withAlpha(t.accent, 0.13), borderWidth: 1, borderColor: withAlpha(t.accent, 0.32), marginBottom: 6 }}>
          <Text style={{ color: t.accent, fontFamily: F.mono, fontSize: 11 }}>Box {p.box}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>{p.name}</Text>
        <Text style={{ fontSize: 11, color: t.textMute, marginTop: 6, fontFamily: F.mono }}>R.P. {p.rp} · S.B.A. {p.sba} · Nac. {p.nac}</Text>
      </View>
      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: t.border, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase' }}>Expositor</Text>
        <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.text, flex: 1, textAlign: 'right' }}>{p.expositor}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: 'h1' })} style={{ padding: 13, backgroundColor: withAlpha(t.accent, 0.1), borderTopWidth: 1, borderTopColor: withAlpha(t.accent, 0.25), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="tree" size={16} color={t.accent} />
        <Text style={{ color: t.accent, fontFamily: F.bodyBold, fontSize: 13 }}>Ver genealogía</Text>
        <Icon name="arrow" size={14} color={t.accent} />
      </TouchableOpacity>
    </Card>
  );
}

function InfoTab({ t, e }) {
  return (
    <View style={{ marginTop: 18, gap: 10 }}>
      <Text style={{ fontSize: 14, lineHeight: 21, color: t.textMute }}>Exposición y juzgamiento bajo reglamentación oficial ACCC.</Text>
      {[['Organiza', 'Asoc. Criadores de Caballos Criollos'], ['Disciplinas', e.disciplines.join(', ')], ['Acceso', 'Libre y gratuito']].map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
          <Text style={{ color: t.textDim }}>{k}</Text>
          <Text style={{ color: t.text, fontFamily: F.bodyMed, flex: 1, textAlign: 'right' }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
