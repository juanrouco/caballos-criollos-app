import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Linking } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Icon, Card, Divider, F } from '../components';
import { withAlpha } from '../theme';
import {
  fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
  isEmptyCatalog, isEmptyResults, mapEvent,
} from '../api';

const EVENT_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2026033105542099399.jpg' };
const MAX_DISCIPLINE_CHIPS = 3;

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
  return m ? m[1] : null;
}

// Cache en memoria por id de evento. Evita re-fetch (y spinner) cuando volvés
// del HorseDetail al detail — sobre todo importante porque el catálogo puede
// pesar bastante. Vive en el módulo, se limpia con el reload de la app.
const eventCache = new Map();
const cacheGet = (id) => eventCache.get(String(id)) || {};
const cachePut = (id, partial) => {
  const prev = eventCache.get(String(id)) || {};
  eventCache.set(String(id), { ...prev, ...partial });
};

export default function EventDetailScreen({ t, navigation, route }) {
  const id = route.params?.id;
  const from = route.params?.from; // 'home' | undefined (lista de eventos por default)

  // Inicializamos el state desde el cache — si volvés de HorseDetail al mismo
  // evento, todo aparece inmediatamente sin spinner ni re-fetch.
  const initial = React.useMemo(() => (id != null ? cacheGet(id) : {}), [id]);
  const [event, setEvent] = React.useState(initial.event || null);
  const [catalogo, setCatalogo] = React.useState(initial.catalogo || null);
  const [resultados, setResultados] = React.useState(initial.resultados || null);
  const [error, setError] = React.useState(null);
  const [selectedTab, setSelectedTab] = React.useState('info');

  React.useEffect(() => {
    if (id == null) { setError('Falta el id del evento.'); return; }
    let cancelled = false;
    setError(null);
    const cached = cacheGet(id);
    // Sólo limpiamos lo que no está cacheado, así no parpadea al volver.
    if (!cached.event)      setEvent(null);
    if (!cached.catalogo)   setCatalogo(null);
    if (!cached.resultados) setResultados(null);

    // Fetchs independientes — sólo los que faltan. El evento prioriza el hero;
    // catálogo y resultados pueden tardar (payloads grandes) y se renderean
    // adentro de su tab cuando llegan.
    if (!cached.event) {
      fetchEvento(id)
        .then((e) => { if (cancelled) return; setEvent(e); cachePut(id, { event: e }); })
        .catch((err) => { if (!cancelled) setError(err.message || 'No se pudo cargar el evento.'); });
    }
    if (!cached.catalogo) {
      fetchEventoCatalogo(id)
        .then((c) => { if (cancelled) return; setCatalogo(c); cachePut(id, { catalogo: c }); })
        .catch(() => {
          if (cancelled) return;
          const fallback = { pruebas_funcionales: [], morfologicas: [] };
          setCatalogo(fallback); cachePut(id, { catalogo: fallback });
        });
    }
    if (!cached.resultados) {
      fetchEventoResultados(id)
        .then((r) => { if (cancelled) return; setResultados(r); cachePut(id, { resultados: r }); })
        .catch(() => {
          if (cancelled) return;
          const fallback = { morfologia: null, tipo_aptitud: null };
          setResultados(fallback); cachePut(id, { resultados: fallback });
        });
    }
    return () => { cancelled = true; };
  }, [id]);

  // Tabs: las que están vacías van al final. Mientras el fetch está in-flight
  // (state === null) NO se considera vacía, así no bailan las tabs al cargar.
  const tabs = React.useMemo(() => {
    const def = [
      { id: 'info',       label: 'Info',       empty: false                                              },
      { id: 'catalogo',   label: 'Catálogo',   empty: catalogo   !== null && isEmptyCatalog(catalogo)   },
      { id: 'resultados', label: 'Resultados', empty: resultados !== null && isEmptyResults(resultados) },
    ];
    return [...def].sort((a, b) => Number(a.empty) - Number(b.empty));
  }, [catalogo, resultados]);

  const activeTab = selectedTab;

  // Back contextual:
  //   - desde la home (from: 'home') → volver a la home
  //   - desde la lista de eventos (default) → goBack al EventsList del stack
  //   - cold start raro / deep link → caemos a EventsList
  const onBack = () => {
    if (from === 'home') {
      navigation.navigate('InicioTab');
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('EventsList');
    }
  };

  if (error) {
    return (
      <CenterMsg t={t}>
        <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 14 }}>{error}</Text>
        <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
          <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Volver</Text>
        </TouchableOpacity>
      </CenterMsg>
    );
  }
  if (!event) {
    return <CenterMsg t={t}><ActivityIndicator color={t.accent} /></CenterMsg>;
  }

  const mapped = mapEvent(event);
  const vivo = event.vivo_actual || null;
  const videoId = youtubeId(vivo?.link_youtube);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={{ height: 200 }}>
        <Image source={EVENT_PHOTO} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        {/* Fade hacia el bg al pie de la foto — ayuda a leer los chips y
            evita el corte duro contra el resto de la pantalla. */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.bg} stopOpacity="0" />
                <Stop offset="1" stopColor={t.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroFade)" />
          </Svg>
        </View>
        <TouchableOpacity onPress={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: withAlpha(t.bg, 0.8), borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {vivo && (
            <View style={{ backgroundColor: t.live, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyBold }}>● EN VIVO</Text>
            </View>
          )}
          {mapped.disciplines.slice(0, MAX_DISCIPLINE_CHIPS).map((d) => (
            <View key={d} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: withAlpha(t.bg, 0.85), borderWidth: 1, borderColor: withAlpha(t.accent, 0.4) }}>
              <Text style={{ color: t.accent, fontSize: 10, fontFamily: F.bodyBold }}>{d}</Text>
            </View>
          ))}
          {mapped.disciplines.length > MAX_DISCIPLINE_CHIPS && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: withAlpha(t.bg, 0.85), borderWidth: 1, borderColor: withAlpha(t.accent, 0.4) }}>
              <Text style={{ color: t.accent, fontSize: 10, fontFamily: F.bodyBold }}>+{mapped.disciplines.length - MAX_DISCIPLINE_CHIPS}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: t.text }}>{mapped.name}</Text>
        <Text style={{ fontSize: 13, color: t.textMute, marginTop: 10 }}>
          {[mapped.dateFull, mapped.location].filter(Boolean).join(' · ')}
        </Text>

        {/* Vivo inline (si hay): preferimos embed de YouTube si la vivo
            trae link_youtube parseable; si no y hay link_pagina, mostramos
            un botón que abre la página en el browser del device. */}
        {vivo && videoId && <LiveVideo t={t} videoId={videoId} />}
        {vivo && !videoId && vivo.link_pagina && <LivePageLink t={t} vivo={vivo} />}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 28, borderBottomWidth: 1, borderBottomColor: t.border }}>
          {tabs.map((tb) => {
            const on = activeTab === tb.id;
            return (
              <TouchableOpacity key={tb.id} onPress={() => setSelectedTab(tb.id)} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: on ? t.accent : 'transparent', marginBottom: -1 }}>
                <Text style={{ color: on ? t.text : t.textMute, fontFamily: F.bodyBold, fontSize: 14 }}>{tb.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'catalogo'   && <CatalogoTab   t={t} catalogo={catalogo}     navigation={navigation} />}
        {activeTab === 'resultados' && <ResultsTab    t={t} resultados={resultados} navigation={navigation} />}
        {activeTab === 'info'       && <InfoTab       t={t} event={event} mapped={mapped} />}
      </View>
    </ScrollView>
  );
}

// ── Live video ───────────────────────────────────────────────────

function LivePageLink({ t, vivo }) {
  const open = () => Linking.openURL(vivo.link_pagina).catch(() => {});
  const host = (() => {
    try { return new URL(vivo.link_pagina).host; } catch { return vivo.link_pagina; }
  })();
  return (
    <TouchableOpacity
      onPress={open}
      style={{ marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.live, 0.4), backgroundColor: withAlpha(t.live, 0.08), flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.live, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="tv" size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>Ver transmisión en vivo</Text>
        <Text style={{ fontSize: 11, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{host}</Text>
      </View>
      <Icon name="arrowUR" size={16} color={t.textMute} />
    </TouchableOpacity>
  );
}

function LiveVideo({ t, videoId }) {
  // Ancho real menos el padding horizontal del contenedor (20 cada lado).
  const { width } = useWindowDimensions();
  const playerW = width - 40;
  const playerH = Math.round((playerW * 9) / 16);
  return (
    <View style={{ marginTop: 18, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: withAlpha(t.live, 0.4), backgroundColor: '#000' }}>
      <YoutubePlayer
        height={playerH}
        width={playerW}
        videoId={videoId}
        play={false}
      />
    </View>
  );
}

// ── Catálogo ─────────────────────────────────────────────────────

function CatalogoTab({ t, catalogo, navigation }) {
  if (catalogo === null) return <TabLoading t={t} />;
  if (isEmptyCatalog(catalogo)) {
    return <EmptyTab t={t} title="Sin catálogo" text="Este evento todavía no tiene catálogo cargado." />;
  }
  const pf = catalogo.pruebas_funcionales || [];
  const mo = catalogo.morfologicas || [];
  return (
    <View style={{ marginTop: 18, gap: 22 }}>
      {pf.length > 0 && (
        <View>
          <SectionTitle t={t}>Pruebas funcionales</SectionTitle>
          <View style={{ gap: 8 }}>
            {pf.map((prueba) => (
              <View key={prueba.id} style={{ gap: 8 }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{prueba.nombre}</Text>
                {(prueba.categorias || []).map((cat) => (
                  <CategoryAccordion key={cat.id} t={t} cat={cat} navigation={navigation} />
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
      {mo.length > 0 && (
        <View>
          <SectionTitle t={t}>Morfología</SectionTitle>
          <View style={{ gap: 8 }}>
            {mo.map((cat) => (
              <CategoryAccordion key={cat.id} t={t} cat={cat} navigation={navigation} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function CategoryAccordion({ t, cat, navigation }) {
  const [open, setOpen] = React.useState(false);
  const animales = cat.animales || [];
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: open ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }}>{cat.nombre}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{animales.length} {animales.length === 1 ? 'animal' : 'animales'}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && animales.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
          {animales.map((a, i) => (
            <View key={`${a.id}-${i}`}>
              <AnimalRow t={t} a={a} navigation={navigation} />
              {i < animales.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AnimalRow({ t, a, navigation }) {
  const meta = [a.sexo, a.fecha_nacimiento, (a.pelaje || '').trim()].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: a.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Text style={{ width: 38, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{a.box ?? '—'}</Text>
      <View style={{ width: 1, height: 28, backgroundColor: t.border }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{a.nombre}</Text>
        {!!meta && <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 3 }} numberOfLines={1}>{meta}</Text>}
      </View>
      <Icon name="arrow" size={15} color={t.textDim} />
    </TouchableOpacity>
  );
}

// ── Resultados ───────────────────────────────────────────────────

const SEX_LABEL = { M: 'Machos', H: 'Hembras', C: 'Castrados' };

function ResultsTab({ t, resultados, navigation }) {
  if (resultados === null) return <TabLoading t={t} />;
  if (isEmptyResults(resultados)) {
    return <EmptyTab t={t} title="Sin resultados" text="Este evento todavía no tiene resultados cargados." />;
  }
  const blocks = [
    { key: 'morfologia',    label: 'Morfología',    data: resultados.morfologia    },
    { key: 'tipo_aptitud',  label: 'Tipo y Aptitud', data: resultados.tipo_aptitud },
  ].filter((b) => b.data);

  return (
    <View style={{ marginTop: 18, gap: 22 }}>
      {blocks.map((b) => (
        <ResultsBlock key={b.key} t={t} label={b.label} data={b.data} navigation={navigation} />
      ))}
    </View>
  );
}

function ResultsBlock({ t, label, data, navigation }) {
  const gran = data.gran_campeonato || [];
  const camp = data.campeonato || [];
  const cats = data.categorias || [];
  const granHas = gran.some((g) => (g.resultados || []).length > 0);
  const campHas = camp.some((g) => (g.resultados || []).length > 0);
  const catsHas = cats.some((c) => (c.premios || []).length > 0);
  if (!granHas && !campHas && !catsHas) return null;

  return (
    <View>
      <SectionTitle t={t}>{label}</SectionTitle>
      <View style={{ gap: 10 }}>
        {granHas && gran.map((g) => (g.resultados?.length > 0) && (
          <ResultAccordion
            key={`gran-${g.sexo}`}
            t={t}
            title={`Gran Campeonato · ${SEX_LABEL[g.sexo] || g.sexo}`}
            entries={g.resultados}
            navigation={navigation}
            featured
          />
        ))}
        {campHas && camp.map((g) => (g.resultados?.length > 0) && (
          <ResultAccordion
            key={`camp-${g.sexo}`}
            t={t}
            title={`Campeonato · ${SEX_LABEL[g.sexo] || g.sexo}`}
            entries={g.resultados}
            navigation={navigation}
          />
        ))}
        {catsHas && cats.map((c) => (c.premios?.length > 0) && (
          <ResultAccordion
            key={`cat-${c.id}`}
            t={t}
            title={c.nombre}
            entries={c.premios}
            navigation={navigation}
          />
        ))}
      </View>
    </View>
  );
}

function ResultAccordion({ t, title, entries, featured, navigation }) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: open ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 }}>
        {featured && (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trophy" size={15} color={t.bg} stroke={2.4} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{entries.length} {entries.length === 1 ? 'puesto' : 'puestos'}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border, padding: 12, gap: 8, backgroundColor: withAlpha(t.surface2, 0.4) }}>
          {entries.map((e, i) => <ResultEntry key={`${e.animal?.id || 'x'}-${i}`} t={t} entry={e} rank={i + 1} navigation={navigation} />)}
        </View>
      )}
    </View>
  );
}

function ResultEntry({ t, entry, rank, navigation }) {
  const a = entry.animal || {};
  const premioName = entry.premio?.nombre || `${rank}° puesto`;
  return (
    <Card t={t} style={{ borderColor: rank === 1 ? withAlpha(t.accent, 0.5) : t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: rank === 1 ? withAlpha(t.accent, 0.1) : 'transparent' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: rank === 1 ? t.accent : t.textMute, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: t.bg }}>{rank}°</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 11, fontFamily: F.bodyBold, color: rank === 1 ? t.accent : t.text, letterSpacing: 1.2, textTransform: 'uppercase' }} numberOfLines={1}>{premioName}</Text>
        {entry.puntaje != null && (
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.textMute }}>{entry.puntaje} pts</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => a.id && navigation.navigate('HorseDetail', { id: a.id })} style={{ padding: 12 }}>
        {a.box != null && (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, backgroundColor: withAlpha(t.accent, 0.13), borderWidth: 1, borderColor: withAlpha(t.accent, 0.32), marginBottom: 6 }}>
            <Text style={{ color: t.accent, fontFamily: F.mono, fontSize: 11 }}>Box {a.box}</Text>
          </View>
        )}
        <Text style={{ fontFamily: F.display, fontSize: 17, color: t.text }} numberOfLines={2}>{a.nombre || '—'}</Text>
        <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 4, fontFamily: F.mono }} numberOfLines={1}>
          {[a.rp != null && `R.P. ${a.rp}`, a.sba != null && `S.B.A. ${a.sba}`, a.fecha_nacimiento && `Nac. ${a.fecha_nacimiento}`].filter(Boolean).join(' · ')}
        </Text>
        {a.propietario?.nombre && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Expositor</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: t.text, flex: 1, textAlign: 'right' }} numberOfLines={1}>{a.propietario.nombre}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );
}

// ── Info ─────────────────────────────────────────────────────────

function InfoTab({ t, event, mapped }) {
  const rows = [
    ['Fecha', mapped.dateFull || event.fecha],
    event.fecha_hasta && event.fecha_hasta !== event.fecha ? ['Hasta', event.fecha_hasta] : null,
    mapped.location ? ['Lugar', mapped.location] : null,
    event.direccion ? ['Dirección', event.direccion] : null,
    event.region?.nombre ? ['Región', event.region.nombre] : null,
    mapped.disciplines.length > 0 ? ['Categorías', mapped.disciplines.join(', ')] : null,
    event.web ? ['Web', event.web] : null,
    event.email ? ['Email', event.email] : null,
    event.fecha_inscripcion_desde ? ['Inscripción desde', event.fecha_inscripcion_desde] : null,
    event.fecha_inscripcion_hasta ? ['Inscripción hasta', event.fecha_inscripcion_hasta] : null,
  ].filter(Boolean);

  return (
    <View style={{ marginTop: 18 }}>
      <Card t={t}>
        <View style={{ padding: 4 }}>
          {rows.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border, gap: 12 }}>
              <Text style={{ fontSize: 11.5, color: t.textMute }}>{k}</Text>
              <Text style={{ color: t.text, fontFamily: F.bodyMed, fontSize: 12.5, flex: 1, textAlign: 'right' }}>{String(v)}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

// ── Helpers visuales ─────────────────────────────────────────────

function SectionTitle({ children, t }) {
  return (
    <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function EmptyTab({ t, title, text }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Card t={t}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginBottom: 6 }}>{title}</Text>
          <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', lineHeight: 19 }}>{text}</Text>
        </View>
      </Card>
    </View>
  );
}

function TabLoading({ t }) {
  return (
    <View style={{ marginTop: 24, alignItems: 'center' }}>
      <ActivityIndicator color={t.accent} />
    </View>
  );
}

function CenterMsg({ t, children }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {children}
    </View>
  );
}
