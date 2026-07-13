import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions, Linking } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Icon, Card, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate, formatDateLong } from '../format';
import {
  fetchEvento, fetchEventoCatalogo, fetchEventoResultados,
  isEmptyCatalog, isEmptyResults, mapEvent, imgUrl, categoriaEntries,
} from '../api';

const EVENT_PHOTO = { uri: 'https://caballoscriollos.com/web/assets/images/accc.jpg' };
const MAX_DISCIPLINE_CHIPS = 3;

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
  return m ? m[1] : null;
}

// Cache en memoria por id de evento, con TTL corto. Su valor es evitar el
// spinner y el re-fetch en el ida-y-vuelta rápido a HorseDetail; pero los
// eventos son dinámicos (resultados, vivo, catálogo cambian), así que expira
// pronto — al re-entrar pasado el TTL se vuelve a pedir todo fresco.
const CACHE_TTL = 60 * 1000; // 60s
const eventCache = new Map();
const cacheGet = (id) => {
  const entry = eventCache.get(String(id));
  if (!entry) return {};
  if (Date.now() - entry.ts > CACHE_TTL) { eventCache.delete(String(id)); return {}; }
  return entry.data;
};
const cachePut = (id, partial) => {
  const key = String(id);
  const prev = eventCache.get(key);
  eventCache.set(key, { ts: Date.now(), data: { ...(prev?.data || {}), ...partial } });
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
  const [refreshingResultados, setRefreshingResultados] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedTab, setSelectedTab] = React.useState(null);

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

  // Las tabs recién se muestran cuando catálogo Y resultados settlearon. Así
  // el orden (y la tab por default) se calculan de una sola vez con los datos
  // ya cargados — sin reflow ni salto de selección a la vista. Si venís del
  // cache (volver de HorseDetail) ya están ambos, así que no hay spinner.
  const tabsReady = catalogo !== null && resultados !== null;

  // Orden: catálogo → resultados → info; las vacías van al final.
  const tabs = React.useMemo(() => {
    const def = [
      { id: 'catalogo',   label: 'Catálogo',   empty: isEmptyCatalog(catalogo)   },
      { id: 'resultados', label: 'Resultados', empty: isEmptyResults(resultados) },
      { id: 'info',       label: 'Info',       empty: false                      },
    ];
    return [...def].sort((a, b) => Number(a.empty) - Number(b.empty));
  }, [catalogo, resultados]);

  // Tab por default derivada de los datos ya settleados (catálogo > resultados
  // > info), calculada en render para que el primer paint de las tabs ya tenga
  // la selección correcta. El tap del usuario la pisa vía `selectedTab`.
  const defaultTab = !isEmptyCatalog(catalogo)
    ? 'catalogo'
    : !isEmptyResults(resultados)
      ? 'resultados'
      : 'info';
  const activeTab = selectedTab || defaultTab;
  const onTabPress = (id) => setSelectedTab(id);

  // Refresca sólo /resultados (no toca evento ni catálogo). Mantiene los
  // resultados anteriores visibles mientras el fetch está in-flight — la UX
  // de loading vive en el botón, no reemplaza todo el contenido.
  const refreshResultados = React.useCallback(() => {
    if (id == null || refreshingResultados) return;
    setRefreshingResultados(true);
    fetchEventoResultados(id)
      .then((r) => { setResultados(r); cachePut(id, { resultados: r }); })
      .catch(() => { /* silenciamos: el usuario sigue viendo lo que tenía */ })
      .finally(() => setRefreshingResultados(false));
  }, [id, refreshingResultados]);

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={{ height: 200 }}>
        <Image source={mapped.image ? { uri: imgUrl(mapped.image, 1080) } : EVENT_PHOTO} style={{ width: '100%', height: 200 }} resizeMode="cover" />
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
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyBold }}>● AHORA</Text>
            </View>
          )}
          {mapped.disciplines.slice(0, MAX_DISCIPLINE_CHIPS).map((d, i) => (
            <View key={`${d}-${i}`} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: withAlpha(t.bg, 0.85), borderWidth: 1, borderColor: withAlpha(t.accent, 0.4) }}>
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

        {/* Tabs — recién cuando catálogo y resultados settlearon, así el orden
            y la selección quedan definidos antes del primer paint (sin reflow). */}
        {!tabsReady ? (
          <View style={{ paddingVertical: 44, alignItems: 'center' }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 28, borderBottomWidth: 1, borderBottomColor: t.border }}>
              {tabs.map((tb) => {
                const on = activeTab === tb.id;
                return (
                  <TouchableOpacity key={tb.id} onPress={() => onTabPress(tb.id)} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: on ? t.accent : 'transparent', marginBottom: -1 }}>
                    <Text style={{ color: on ? t.text : t.textMute, fontFamily: F.bodyBold, fontSize: 14 }}>{tb.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeTab === 'catalogo'   && <CatalogoTab   t={t} catalogo={catalogo}     navigation={navigation} />}
            {activeTab === 'resultados' && (
              <ResultsTab
                t={t}
                resultados={resultados}
                navigation={navigation}
                onRefresh={refreshResultados}
                refreshing={refreshingResultados}
              />
            )}
            {activeTab === 'info'       && <InfoTab       t={t} event={event} mapped={mapped} />}
          </>
        )}
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
  return <CatalogoContent t={t} catalogo={catalogo} navigation={navigation} />;
}

// Misma mecánica que ResultsContent: separamos el contenido del wrapper
// loading/empty para no llamar hooks condicionalmente.
function CatalogoContent({ t, catalogo, navigation }) {
  const sections = React.useMemo(() => {
    const allMo  = catalogo.morfologicas || [];
    const morfo  = allMo.filter((c) => !c.tipo_aptitud);
    const tipoAp = allMo.filter((c) =>  c.tipo_aptitud);
    const pf     = catalogo.pruebas_funcionales || [];
    const list = [];
    if (morfo.length)  list.push({ key: 'morfo',  label: 'Morfología',     cats: morfo });
    if (tipoAp.length) list.push({ key: 'tipoap', label: 'Tipo y Aptitud', cats: tipoAp });
    pf.forEach((p, idx) => {
      const cats = (p.categorias || []).filter((c) => (c.animales || []).length > 0 || (c.yuntas || []).length > 0);
      if (cats.length > 0) list.push({ key: `pf-${p.id ?? idx}`, label: p.nombre, cats });
    });
    return list;
  }, [catalogo]);

  // Auto-pick la primera sub-tab no vacía. Si cambian los datos (cache) y la
  // sub-tab activa desapareció, caemos a la primera disponible.
  const [active, setActive] = React.useState(null);
  React.useEffect(() => {
    if (active && sections.some((s) => s.key === active)) return;
    setActive(sections[0]?.key || null);
  }, [sections, active]);

  if (sections.length === 0) {
    return <EmptyTab t={t} title="Sin catálogo" text="Este evento todavía no tiene catálogo cargado." />;
  }
  const current = sections.find((s) => s.key === active) || sections[0];

  return (
    <View style={{ marginTop: 18 }}>
      {sections.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {sections.map((s) => {
            const on = current.key === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setActive(s.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}
              >
                <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <View style={{ gap: 8 }}>
        {current.cats.map((cat) => (
          <CategoryAccordion key={cat.id} t={t} cat={cat} navigation={navigation} />
        ))}
      </View>
    </View>
  );
}

function CategoryAccordion({ t, cat, navigation }) {
  const [open, setOpen] = React.useState(false);
  // Rodeo cats traen yuntas[] (par de animales con jinete c/u) en vez de
  // animales[]. El resto usa animales[].
  const yuntas = cat.yuntas;
  const isRodeo = Array.isArray(yuntas);
  const animales = cat.animales || [];
  const count = isRodeo ? yuntas.length : animales.length;
  const countLabel = isRodeo
    ? `${count} ${count === 1 ? 'yunta' : 'yuntas'}`
    : `${count} ${count === 1 ? 'animal' : 'animales'}`;
  // CopaEspecial reemplaza el nombre de la categoría — siempre se trata de
  // la misma copa, el nombre de la categ. aporta poco.
  const title = cat.clasificacion === 'CopaEspecial' ? 'Copa Especial' : cat.nombre;
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: open ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }}>{title}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{countLabel}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && count > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
          {isRodeo
            ? yuntas.map((y, i) => (
                <View key={`y-${y.orden ?? i}-${i}`}>
                  <CatalogYuntaGroup t={t} yunta={y} order={i + 1} navigation={navigation} />
                  {i < yuntas.length - 1 && <Divider t={t} style={{ marginLeft: 0 }} />}
                </View>
              ))
            : animales.map((a, i) => (
                <View key={`${a.id}-${i}`}>
                  <AnimalRow t={t} a={a} navigation={navigation} />
                  {i < animales.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
                </View>
              ))
          }
        </View>
      )}
    </View>
  );
}

// Una yunta en el catálogo: header chico con "Yunta N" + las dos filas de
// animales con todos sus datos (box, nombre, sexo/nac/pelaje, R.P./S.B.A.,
// jinete). Es la versión del catálogo — la de resultados (RodeoAnimalRow)
// es minimal porque ahí el detalle del animal no es el foco.
function CatalogYuntaGroup({ t, yunta, order, navigation }) {
  const animales = yunta.animales || [];
  // Sin fondo propio: queda sobre el surface (blanco) del card, igual que las
  // filas de morfología / tipo y aptitud. El header "Yunta N" alcanza para
  // separar visualmente cada par.
  return (
    <View>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>
          Yunta {yunta.orden ?? order}
        </Text>
      </View>
      {animales.map((a, i) => (
        <View key={`${a.id ?? 'a'}-${i}`}>
          <CatalogYuntaAnimalRow t={t} a={a} navigation={navigation} />
          {i < animales.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
        </View>
      ))}
    </View>
  );
}

function CatalogYuntaAnimalRow({ t, a, navigation }) {
  const jinete = a.jinete ? [a.jinete.nombre, a.jinete.apellido].filter(Boolean).join(' ') : '';
  return (
    <TouchableOpacity onPress={() => a.id && navigation.navigate('HorseDetail', { id: a.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Text style={{ width: 38, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{a.box ?? '—'}</Text>
      <View style={{ width: 1, height: 36, backgroundColor: t.border }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{a.nombre || '—'}</Text>
        <AnimalMetaLines t={t} a={a} />
        {!!jinete && <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 2, fontFamily: F.mono }} numberOfLines={1}>Jinete: {jinete}</Text>}
      </View>
      <Icon name="arrow" size={15} color={t.textDim} />
    </TouchableOpacity>
  );
}

function AnimalRow({ t, a, navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: a.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Text style={{ width: 38, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{a.box ?? '—'}</Text>
      <View style={{ width: 1, height: 36, backgroundColor: t.border }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{a.nombre}</Text>
        <AnimalMetaLines t={t} a={a} />
      </View>
      <Icon name="arrow" size={15} color={t.textDim} />
    </TouchableOpacity>
  );
}

// Líneas de meta-info del animal para el catálogo: primero la identificación
// registral (S.B.A. · R.P.) y después la meta general (sexo · nac · pelaje).
function AnimalMetaLines({ t, a }) {
  const reg = [a.sba != null && `S.B.A. ${a.sba}`, a.rp != null && `R.P. ${a.rp}`].filter(Boolean).join(' · ');
  const meta = [a.sexo, a.fecha_nacimiento && `Nac. ${formatDate(a.fecha_nacimiento)}`, (a.pelaje || '').trim()].filter(Boolean).join(' · ');
  return (
    <>
      {!!reg  && <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 3, fontFamily: F.mono }} numberOfLines={1}>{reg}</Text>}
      {!!meta && <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{meta}</Text>}
    </>
  );
}

// ── Resultados ───────────────────────────────────────────────────

const SEX_LABEL = { M: 'Machos', H: 'Hembras', C: 'Castrados' };

function ResultsTab({ t, resultados, navigation, onRefresh, refreshing }) {
  if (resultados === null) return <TabLoading t={t} />;
  if (isEmptyResults(resultados)) {
    return (
      <View style={{ marginTop: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
          <RefreshButton t={t} onPress={onRefresh} loading={refreshing} />
        </View>
        <EmptyTab t={t} title="Sin resultados" text="Este evento todavía no tiene resultados cargados." />
      </View>
    );
  }
  return (
    <ResultsContent
      t={t}
      resultados={resultados}
      navigation={navigation}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}

function RefreshButton({ t, onPress, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityLabel="Actualizar resultados"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: t.border, opacity: loading ? 0.6 : 1 }}
    >
      {loading
        ? <ActivityIndicator size="small" color={t.textMute} />
        : <Icon name="refresh" size={13} color={t.textMute} />}
      <Text style={{ color: t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>Actualizar</Text>
    </TouchableOpacity>
  );
}

// Separamos el contenido del tab del wrapper de loading/empty para no llamar
// hooks condicionalmente cuando los resultados todavía no llegaron.
function ResultsContent({ t, resultados, navigation, onRefresh, refreshing }) {
  const sections = React.useMemo(() => {
    const all = [
      { key: 'morfologia',    label: 'Morfología',     kind: 'std',    data: resultados.morfologia },
      { key: 'tipo_aptitud',  label: 'Tipo y Aptitud', kind: 'std',    data: resultados.tipo_aptitud },
      { key: 'rodeos',        label: 'Rodeos',         kind: 'rodeos', data: resultados.rodeos },
    ];
    return all.filter((s) => s.data && !isSectionEmpty(s));
  }, [resultados]);

  // Auto-pick la primera sección no vacía. Si cambian los resultados (cache)
  // y la sub-tab activa desapareció, caemos a la primera disponible.
  const [active, setActive] = React.useState(null);
  React.useEffect(() => {
    if (active && sections.some((s) => s.key === active)) return;
    setActive(sections[0]?.key || null);
  }, [sections, active]);

  if (sections.length === 0) {
    return <EmptyTab t={t} title="Sin resultados" text="Este evento todavía no tiene resultados cargados." />;
  }
  const current = sections.find((s) => s.key === active) || sections[0];

  return (
    <View style={{ marginTop: 18 }}>
      {sections.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {sections.map((s) => {
            const on = current.key === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setActive(s.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}
              >
                <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {/* Refrescar debajo de las sub-tabs, alineado a la derecha, para no
          robarles ancho. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
        <RefreshButton t={t} onPress={onRefresh} loading={refreshing} />
      </View>
      {current.kind === 'std'
        ? <StandardSection t={t} data={current.data} navigation={navigation} />
        : <RodeosSection
            t={t}
            pruebas={(current.data.pruebas || []).filter((p) => (p.yuntas || []).length > 0)}
            navigation={navigation}
          />
      }
    </View>
  );
}

function isSectionEmpty(s) {
  if (s.kind === 'rodeos') {
    return !(s.data.pruebas || []).some((p) => (p.yuntas || []).length > 0);
  }
  const g = s.data;
  if (!g) return true;
  const gc = g.gran_campeonato || [];
  const cp = g.campeonato || [];
  const cats = g.categorias || [];
  if (gc.some((x) => (x.resultados || []).length > 0)) return false;
  if (cp.some((x) => (x.resultados || []).length > 0)) return false;
  if (cats.some((x) => categoriaEntries(x).length > 0)) return false;
  return true;
}

// Gran campeonato / campeonato: la API los manda sin ordenar. Se ordenan por
// jerarquía de premio (`premio.id` asc: Gran Campeón < Reservado < Tercer <
// Cuarto), con puntaje descendente como desempate. Los sin premio.id van al final.
function sortByPremio(entries) {
  return [...(entries || [])].sort((a, b) => {
    const ai = a.premio?.id, bi = b.premio?.id;
    if (ai != null && bi != null && ai !== bi) return ai - bi;
    if (ai == null && bi != null) return 1;
    if (bi == null && ai != null) return -1;
    return (b.puntaje ?? -Infinity) - (a.puntaje ?? -Infinity);
  });
}

function StandardSection({ t, data, navigation }) {
  const gran = (data.gran_campeonato || []).filter((g) => (g.resultados || []).length > 0);
  const camp = (data.campeonato || []).filter((g) => (g.resultados || []).length > 0);
  const cats = (data.categorias || []).filter((c) => categoriaEntries(c).length > 0 || (c.ausentes || []).length > 0 || (c.rechazados || []).length > 0);

  return (
    <View style={{ gap: 18 }}>
      {gran.length > 0 && (
        <ResultGroup t={t} label="Gran Campeonato">
          {gran.map((g) => (
            <ResultCard
              key={`gran-${g.sexo}`}
              t={t}
              title={SEX_LABEL[g.sexo] || g.sexo}
              entries={sortByPremio(g.resultados)}
              navigation={navigation}
              featured
            />
          ))}
        </ResultGroup>
      )}
      {camp.length > 0 && (
        <ResultGroup t={t} label="Campeonato">
          {camp.map((g, i) => (
            // Morfología: campeonato por categoría unificada ({ categoria }).
            // Tipo y Aptitud: campeonato por sexo ({ sexo }).
            <ResultCard
              key={`camp-${g.categoria || g.sexo || i}`}
              t={t}
              title={g.categoria || SEX_LABEL[g.sexo] || g.sexo || '—'}
              entries={sortByPremio(g.resultados)}
              navigation={navigation}
            />
          ))}
        </ResultGroup>
      )}
      {cats.length > 0 && (
        <ResultGroup t={t} label="Categorías">
          {cats.map((c) => (
            <CategoryResult key={`cat-${c.id}`} t={t} categoria={c} navigation={navigation} />
          ))}
        </ResultGroup>
      )}
    </View>
  );
}

// Una categoría de morfología / TyA. Card acordeón (nombre + conteo). Al abrir:
//   - 1 subcategoría → los puestos directo (sin "Subcategoría 1").
//   - >1 subcategoría → un acordeón por subcategoría (cerrados).
//   - y debajo, si hay, las secciones "Ausentes" y "Rechazados".
// Compat: si no vienen `subcategorias`, se usa el `premios` plano (dato viejo).
function CategoryResult({ t, categoria, navigation }) {
  const [open, setOpen] = React.useState(false);
  const raw = Array.isArray(categoria.subcategorias) && categoria.subcategorias.length
    ? categoria.subcategorias
    : (categoria.premios ? [{ numero: 1, premios: categoria.premios }] : []);
  const subs = raw.filter((s) => (s.premios || []).length > 0);
  const ausentes   = categoria.ausentes || [];
  const rechazados = categoria.rechazados || [];
  const premiosTotal = subs.reduce((n, s) => n + s.premios.length, 0);
  if (premiosTotal === 0 && ausentes.length === 0 && rechazados.length === 0) return null;

  const multi = subs.length > 1;
  const count = premiosTotal || (ausentes.length + rechazados.length);

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: open ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={2}>{categoria.nombre}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{count} {count === 1 ? 'animal' : 'animales'}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
          {multi ? (
            <View style={{ backgroundColor: t.bg, padding: 12, gap: 8 }}>
              {subs.map((s) => (
                <ResultCard key={`sub-${s.numero}`} t={t} title={`Subcategoría ${s.numero}`} entries={s.premios} navigation={navigation} />
              ))}
            </View>
          ) : subs.length === 1 ? (
            <EntriesBody t={t} entries={subs[0].premios} navigation={navigation} />
          ) : null}
          <AbsenceSections t={t} ausentes={ausentes} rechazados={rechazados} navigation={navigation} />
        </View>
      )}
    </View>
  );
}

// Secciones "Ausentes" y "Rechazados" de una categoría, debajo de las
// subcategorías. Son animales sin premio; el rechazado muestra el motivo.
function AbsenceSections({ t, ausentes = [], rechazados = [], navigation }) {
  return (
    <>
      {ausentes.length > 0 && <AbsenceGroup t={t} label="Ausentes" items={ausentes} navigation={navigation} />}
      {rechazados.length > 0 && <AbsenceGroup t={t} label="Rechazados" items={rechazados} rejected navigation={navigation} />}
    </>
  );
}

function AbsenceGroup({ t, label, items, rejected, navigation }) {
  return (
    <View>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2, borderTopWidth: 1, borderTopColor: t.border }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>{label}</Text>
      </View>
      {items.map((it, i) => {
        const motivo = rejected ? (it.rechazo?.observaciones || '') : '';
        const statusLabel = rejected ? `Rechazado${motivo ? ` · ${motivo}` : ''}` : 'Ausente';
        return (
          <View key={`${it.animal?.id || 'x'}-${i}`}>
            <ResultEntry t={t} entry={{ animal: it.animal }} statusLabel={statusLabel} navigation={navigation} />
            {i < items.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
          </View>
        );
      })}
    </View>
  );
}

function ResultGroup({ t, label, children }) {
  return (
    <View>
      <SectionTitle t={t}>{label}</SectionTitle>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

// Dos buckets: "todos los puestos" (Campeonato + Premios + Menciones) en un
// solo bloque sin sub-header, y "Sin Premio" aparte con sub-header. Sin Premio
// es cualitativamente distinto (inscriptos que no premiaron), por eso se separa.
function groupEntriesByTipo(entries) {
  const main = [];
  const sinPremio = [];
  for (const e of entries) {
    // "Sin premio" agrupa el premio tipo 5 (Sin Premio) y los que asistieron sin
    // premio de categoría (premio null) — ambos van al bloque separado.
    if (!e.premio || e.premio.tipo_nombre === 'Sin Premio') sinPremio.push(e);
    else main.push(e);
  }
  const out = [];
  if (main.length)      out.push({ tipo: null,         entries: main });
  if (sinPremio.length) out.push({ tipo: 'Sin Premio', entries: sinPremio });
  return out;
}

// Acordeón por categoría/grupo, mismo patrón que el catálogo (CategoryAccordion):
// card blanco, header con título + conteo, colapsado por default. Al abrir muestra
// todos los puestos como filas planas sobre blanco, agrupados por tipo (el bloque
// principal sin sub-header; "Sin Premio" con su sub-header aparte).
function ResultCard({ t, title, entries, featured, navigation }) {
  const [open, setOpen] = React.useState(false);
  if (entries.length === 0) return null;
  const count = entries.length;
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: (open || featured) ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        {featured && (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trophy" size={15} color={t.bg} stroke={2.4} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{count} {count === 1 ? 'animal' : 'animales'}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
          <EntriesBody t={t} entries={entries} navigation={navigation} />
        </View>
      )}
    </View>
  );
}

// Cuerpo de puestos de una categoría/subcategoría: agrupa por tipo (bloque
// principal sin header + "Sin Premio" con su sub-header) y pinta cada fila.
function EntriesBody({ t, entries, navigation }) {
  const groups = groupEntriesByTipo(entries);
  return (
    <>
      {groups.map((g, gi) => (
        <View key={g.tipo || 'main'}>
          {g.tipo && (
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2, borderTopWidth: gi > 0 ? 1 : 0, borderTopColor: t.border }}>
              <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>{g.tipo}</Text>
            </View>
          )}
          {g.entries.map((e, i) => (
            <View key={`${e.animal?.id || 'x'}-${gi}-${i}`}>
              <ResultEntry t={t} entry={e} rank={i + 1} navigation={navigation} />
              {i < g.entries.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

// Fila plana de un puesto, mismo layout que AnimalRow del catálogo (gutter +
// divisor + datos del animal), con una línea extra arriba para premio + puntaje.
function ResultEntry({ t, entry, rank, navigation, statusLabel }) {
  const a = entry.animal || {};
  // `statusLabel` (ausente/rechazado): reemplaza el premio y no muestra puntaje.
  // Sin premio de categoría (premio null): asistió pero no premió — no inventamos
  // "N° puesto" ni lo destacamos como 1°.
  const hasPremio = !!entry.premio;
  const topLabel = statusLabel != null ? statusLabel
    : hasPremio ? (entry.premio.nombre || `${rank}° puesto`) : 'Sin premio';
  const top = statusLabel == null && hasPremio && rank === 1;
  const showPuntaje = statusLabel == null && entry.puntaje != null;
  // Unidad del puntaje: morfología usa "PES"; tipo y aptitud, "PUNTOS".
  const unitLabel = entry.categoria_morfologica?.tipo_aptitud ? 'PUNTOS' : 'PES';
  return (
    <TouchableOpacity onPress={() => a.id && navigation.navigate('HorseDetail', { id: a.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Text style={{ width: 38, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{a.box ?? '—'}</Text>
      <View style={{ width: 1, height: 42, backgroundColor: t.border }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 10.5, fontFamily: F.bodyBold, color: top ? t.accent : t.textMute, letterSpacing: 1.1, textTransform: 'uppercase' }} numberOfLines={1}>{topLabel}</Text>
          {showPuntaje && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{entry.puntaje}</Text>
              <Text style={{ fontSize: 9.5, color: t.accent, letterSpacing: 1, marginTop: 1, fontFamily: F.bodyBold }}>{unitLabel}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text, marginTop: 2 }} numberOfLines={1}>{a.nombre || '—'}</Text>
        <AnimalMetaLines t={t} a={a} />
      </View>
      <Icon name="arrow" size={15} color={t.textDim} />
    </TouchableOpacity>
  );
}

// ── Rodeos ───────────────────────────────────────────────────────

function RodeosSection({ t, pruebas, navigation }) {
  return (
    <View style={{ gap: 10 }}>
      {pruebas.map((p, i) => {
        // En CopaEspecial el nombre de la categoría suele ser redundante
        // (es siempre la misma copa), así que mostramos sólo la clasificación.
        const isCopa = p.clasificacion === 'CopaEspecial';
        const catName = p.categoria?.nombre || p.prueba?.nombre || 'Rodeo';
        const title = isCopa
          ? 'Copa Especial'
          : (p.clasificacion ? `${catName} · ${p.clasificacion}` : catName);
        const featured = p.clasificacion === 'Final' || isCopa;
        return (
          <RodeoCard
            key={`${p.prueba?.id ?? 'p'}-${p.categoria?.id ?? 'c'}-${i}`}
            t={t}
            title={title}
            prueba={p}
            featured={featured}
            navigation={navigation}
          />
        );
      })}
    </View>
  );
}

// Acordeón por prueba/categoría, mismo patrón que el resto del catálogo /
// resultados: card blanco, header con título + conteo de yuntas, colapsado por
// default. Al abrir muestra las yuntas como grupos sobre blanco.
function RodeoCard({ t, title, prueba, featured, navigation }) {
  const [open, setOpen] = React.useState(false);
  const yuntas = prueba.yuntas || [];
  if (yuntas.length === 0) return null;
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: (open || featured) ? withAlpha(t.accent, 0.5) : t.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        {featured && (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trophy" size={15} color={t.bg} stroke={2.4} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 10.5, color: t.textMute, fontFamily: F.mono, marginTop: 3 }}>{yuntas.length} {yuntas.length === 1 ? 'yunta' : 'yuntas'}</Text>
        </View>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
          {yuntas.map((y, i) => (
            <View key={`y-${i}`}>
              <RodeoYunta
                t={t}
                yunta={y}
                fallbackRank={i + 1}
                clasificacion={prueba.clasificacion}
                navigation={navigation}
              />
              {i < yuntas.length - 1 && <Divider t={t} style={{ marginLeft: 0 }} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Formatea un puntaje de rodeo: los totales pueden traer decimales (la
// morfología suma en pasos de 0.25). Muestra enteros sin decimales y limpia el
// ruido flotante de las sumas (redondeo a 2 decimales, sin ceros de más).
function fmtPts(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return String(Math.round(Number(n) * 100) / 100);
}

// Una yunta en resultados: header chico (puesto + "Yunta" + total) y las dos
// filas de animales, todo sobre blanco — misma idea que CatalogYuntaGroup, con
// las líneas extra de Día 1 / Día 2 y Última vaca que aporta el rodeo.
function RodeoYunta({ t, yunta, fallbackRank, clasificacion, navigation }) {
  const isCopa = clasificacion === 'CopaEspecial';
  // Para CopaEspecial no hay puesto.general (la API ordena por dia1 desc),
  // así que usamos el índice del array como rank visual.
  const rank = yunta.puesto?.general ?? fallbackRank;
  const top = rank === 1;
  const animales = yunta.animales || [];
  const totDia1 = yunta.totales?.dia1;
  const totDia2 = yunta.totales?.dia2;
  const total = isCopa
    ? totDia1
    : (totDia1 != null && totDia2 != null ? Number(totDia1) + Number(totDia2) : null);
  const ultDia1 = yunta.vacas?.ultima_dia1;
  const ultDia2 = yunta.vacas?.ultima_dia2;
  const hasUltima = isCopa ? ultDia1 != null : (ultDia1 != null || ultDia2 != null);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: top ? t.accent : t.text }}>{rank}°</Text>
        <Text style={{ flex: 1, fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }} numberOfLines={1}>Yunta</Text>
        {total != null && (
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.textMute }}>{fmtPts(total)} pts</Text>
        )}
      </View>
      <View>
        {animales.map((a, i) => (
          <View key={`${a.id ?? 'a'}-${i}`}>
            <RodeoAnimalRow t={t} a={a} navigation={navigation} />
            {i < animales.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
          </View>
        ))}
      </View>
      {!isCopa && totDia1 != null && totDia2 != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Día 1</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.text }}>{fmtPts(totDia1)}</Text>
          <View style={{ width: 1, height: 12, backgroundColor: t.border }} />
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Día 2</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.text }}>{fmtPts(totDia2)}</Text>
        </View>
      )}
      {hasUltima && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Vaca corrida N°</Text>
          {isCopa ? (
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.text }}>{ultDia1}</Text>
          ) : (
            <>
              {ultDia1 != null && (
                <>
                  <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Día 1</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.text }}>{ultDia1}</Text>
                </>
              )}
              {ultDia1 != null && ultDia2 != null && (
                <View style={{ width: 1, height: 12, backgroundColor: t.border }} />
              )}
              {ultDia2 != null && (
                <>
                  <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Día 2</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: t.text }}>{ultDia2}</Text>
                </>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function RodeoAnimalRow({ t, a, navigation }) {
  const jinete = a.jinete ? [a.jinete.nombre, a.jinete.apellido].filter(Boolean).join(' ') : '';
  return (
    <TouchableOpacity onPress={() => a.id && navigation.navigate('HorseDetail', { id: a.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      {a.box != null && (
        <Text style={{ width: 38, fontFamily: F.mono, fontSize: 13, color: t.accent, textAlign: 'center' }}>{a.box}</Text>
      )}
      {a.box != null && <View style={{ width: 1, height: 28, backgroundColor: t.border }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{a.nombre || '—'}</Text>
        {!!jinete && <Text style={{ fontSize: 10.5, color: t.textMute, marginTop: 3, fontFamily: F.mono }} numberOfLines={1}>Jinete: {jinete}</Text>}
      </View>
      <Icon name="arrow" size={15} color={t.textDim} />
    </TouchableOpacity>
  );
}

// ── Info ─────────────────────────────────────────────────────────

function InfoTab({ t, event, mapped }) {
  const rows = [
    ['Fecha', formatDateLong(event.fecha)],
    event.fecha_hasta && event.fecha_hasta !== event.fecha ? ['Hasta', formatDateLong(event.fecha_hasta)] : null,
    mapped.location ? ['Lugar', mapped.location] : null,
    event.direccion ? ['Dirección', event.direccion] : null,
    event.region?.nombre ? ['Región', event.region.nombre] : null,
    mapped.disciplines.length > 0 ? ['Categorías', mapped.disciplines.join(', ')] : null,
    event.web ? ['Web', event.web] : null,
    event.email ? ['Email', event.email] : null,
    event.fecha_inscripcion_desde ? ['Inscripción desde', formatDateLong(event.fecha_inscripcion_desde)] : null,
    event.fecha_inscripcion_hasta ? ['Inscripción hasta', formatDateLong(event.fecha_inscripcion_hasta)] : null,
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
