import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Icon, Divider, SectionLabel, F } from '../components';
import { withAlpha, DISCIPLINE_ICONS, DISCIPLINE_COLORS } from '../theme';
import { fetchRankings, fetchRanking, decodeEntities, curateRankingFiltros } from '../api';

// Mapeo ranking (slug) → disciplina, para reusar el ícono/color de disciplina.
const RANK_DISC = {
  freno: 'freno',
  cio: 'incentivo',
  fzb: 'aparte',
  corral_analitico: 'corral',
  corral_general: 'corral',
  apartes_analitico: 'aparte',
  apartes_general: 'aparte',
  rodeos: 'rodeos',
  paleteada: 'paleteada',
};

// La temporada de Solanet que corresponde a un año = la que termina en ese año
// (ej. año 2026 → "2025 - 2026"). Si no matchea, cae al default del filtro.
function premioForYear(premioF, year) {
  if (!premioF) return null;
  const opts = premioF.opciones || [];
  const match = year != null && opts.find((o) => String(o.label).trim().endsWith(String(year)));
  return match || opts.find((o) => o.value === premioF.default) || opts[0] || null;
}

// Rankings que se agrupan bajo un solo item (acordeón de dos niveles): al abrir
// el grupo aparecen sus sub-rankings, y al abrir cada uno, sus categorías.
const GROUPS = {
  corral: { disc: 'corral', label: 'Corral de Aparte', slugs: ['corral_general', 'corral_analitico'] },
  aparte: { disc: 'aparte', label: 'Aparte Campero', slugs: ['apartes_general', 'apartes_analitico'] },
};
// Sub-label = lo que va después del "—" en el nombre (ej. "...— Ranking General").
function subLabel(nombre) {
  const parts = String(nombre || '').split('—');
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').trim();
}
// Freno/CIO/FZB/Rodeos tienen un único ranking: sacamos el sufijo "— Ranking"
// (o "— Ranking General") del nombre. Los grupos (Corral, Aparte), que tienen
// dos, conservan el sufijo vía subLabel para distinguirlos.
function cleanName(nombre) {
  return String(nombre || '').replace(/\s*—\s*Ranking(\s+General)?\s*$/i, '').trim();
}
// Filtro-hoja: la última elección antes de ver la tabla. La mayoría usa
// 'categoria'; rodeos no tiene categoría sino 'tipo' (General/Handicap/Ranking C).
function leafParam(r) {
  const params = (r.filtros || []).map((f) => f.param);
  return params.includes('categoria') ? 'categoria' : params.includes('tipo') ? 'tipo' : null;
}

export default function RankingsScreen({ t, navigation }) {
  const [catalog, setCatalog] = React.useState(null); // null=loading, []=vacío/error
  const [error, setError] = React.useState(false);
  const [solanetTop, setSolanetTop] = React.useState(undefined); // undefined=loading, null=sin datos
  const [year, setYear] = React.useState(null);       // año seleccionado (filtro anio de los individuales)
  const [open, setOpen] = React.useState(null);       // item de disciplina abierto (slug o key de grupo)
  const [openSub, setOpenSub] = React.useState(null); // sub-ranking abierto dentro de un grupo
  const [probe, setProbe] = React.useState({});       // slug → modo, para rankings sin filtros (ej. Paleteada)

  // `silent` (re-fetch al re-enfocar la tab): no muestra spinner ni limpia la
  // lista, sólo actualiza si el catálogo cambió (ej. el backend agregó un ranking
  // nuevo). El catálogo se pide una sola vez al montar y el tab no se desmonta,
  // así que sin esto no se enteraría de cambios hasta reiniciar la app.
  const loadedRef = React.useRef(false);
  const load = React.useCallback(() => {
    let cancelled = false;
    const silent = loadedRef.current;
    if (!silent) { setCatalog(null); setError(false); setSolanetTop(undefined); }
    fetchRankings()
      .then((r) => {
        if (cancelled) return;
        loadedRef.current = true;
        const items = r.data || [];
        setCatalog(items);
        const anioF = items.find((x) => x.familia === 'individual')?.filtros?.find((f) => f.param === 'anio');
        setYear((prev) => prev ?? (anioF ? anioF.default : null));
      })
      .catch(() => { if (!cancelled && !silent) { setError(true); setCatalog([]); setSolanetTop(null); } });
    return () => { cancelled = true; };
  }, []);
  React.useEffect(() => {
    const cleanup = load();
    const unsub = navigation.addListener ? navigation.addListener('focus', () => load()) : undefined;
    return () => { cleanup(); if (unsub) unsub(); };
  }, [navigation, load]);

  const solanet = (catalog || []).find((x) => x.slug === 'solanet');
  const solanetPremioF = solanet ? curateRankingFiltros(solanet).filtros?.find((f) => f.param === 'premio') : null;
  const edition = premioForYear(solanetPremioF, year)?.label || '';

  // Solanet 1° puesto según el año seleccionado (la temporada que termina en él).
  React.useEffect(() => {
    if (catalog === null) return; // catálogo aún cargando
    if (!solanet) { setSolanetTop(null); return; }
    const premio = premioForYear(solanetPremioF, year);
    let cancelled = false;
    setSolanetTop(undefined);
    fetchRanking('solanet', premio ? { premio: premio.value } : {})
      .then((d) => { if (!cancelled) setSolanetTop((d.filas || [])[0] || null); })
      .catch(() => { if (!cancelled) setSolanetTop(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, year]);
  // Rankings sin filtros (ej. Paleteada): su `modo` (ranking / pdf / not_available)
  // sólo se sabe pidiendo el detalle. Lo consultamos para poder mostrar el badge
  // "Próximamente" directo en el listado, sin que el usuario tenga que entrar.
  React.useEffect(() => {
    const noFilter = (catalog || []).filter((x) =>
      (x.familia === 'individual' || x.familia === 'equipo') && (x.filtros || []).length === 0);
    if (noFilter.length === 0) return;
    let cancelled = false;
    Promise.all(noFilter.map((x) =>
      fetchRanking(x.slug, {}).then((d) => [x.slug, d?.modo || 'ranking']).catch(() => [x.slug, null])
    )).then((pairs) => {
      if (cancelled) return;
      setProbe((prev) => {
        const next = { ...prev };
        pairs.forEach(([slug, modo]) => { if (modo) next[slug] = modo; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [catalog]);

  const individuals = (catalog || []).filter((x) => x.familia === 'individual');
  const anioOpciones = individuals.find((x) => x.filtros?.some((f) => f.param === 'anio'))
    ?.filtros?.find((f) => f.param === 'anio')?.opciones || [];

  // Items de "Por disciplina": rankings por animal (individuales) y de equipo
  // (apartes, rodeos). Los de un grupo (Corral, Aparte Campero) se muestran como
  // un solo item con sub-rankings; el resto quedan sueltos.
  const disciplineRankings = (catalog || []).filter((x) => x.familia === 'individual' || x.familia === 'equipo');
  const displayItems = [];
  const groupAdded = new Set();
  disciplineRankings.forEach((r) => {
    const disc = RANK_DISC[r.slug];
    const g = GROUPS[disc];
    if (g && g.slugs.includes(r.slug)) {
      if (!groupAdded.has(disc)) {
        groupAdded.add(disc);
        const subs = g.slugs.map((s) => disciplineRankings.find((x) => x.slug === s)).filter(Boolean);
        displayItems.push({ type: 'group', key: disc, disc, label: g.label, rankings: subs });
      }
    } else {
      displayItems.push({ type: 'ranking', key: r.slug, disc, ranking: { ...r, nombre: cleanName(r.nombre) } });
    }
  });

  const catsOf = (r) => r.filtros?.find((f) => f.param === leafParam(r))?.opciones || [];
  const goTo = (r, value) => {
    const filtros = r.filtros || [];
    const leaf = leafParam(r);
    const initialFilters = {};
    if (filtros.some((f) => f.param === 'anio') && year != null) initialFilters.anio = year;
    // Rodeos no usa `anio` sino `calendario` (campeonato): mapeamos el año al
    // calendario que termina en él (2026 → "2025 - 2026"), como Solanet.
    const calF = filtros.find((f) => f.param === 'calendario');
    if (calF) {
      const opt = premioForYear(calF, year);
      if (opt) initialFilters.calendario = opt.value;
    }
    if (leaf && value != null) initialFilters[leaf] = value;
    navigation.navigate('RankingCat', { ranking: r, initialFilters });
  };
  const renderCats = (r, color) => catsOf(r).map((c, i, arr) => (
    <View key={String(c.value)}>
      <TouchableOpacity onPress={() => goTo(r, c.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 18, paddingRight: 14 }}>
        <View style={{ width: 3, height: 22, backgroundColor: color, borderRadius: 2 }} />
        <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: t.text }}>{decodeEntities(c.label)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: withAlpha(color, 0.15) }}>
          <Text style={{ color: color === '#0d121f' ? t.text : color, fontSize: 10.5, fontFamily: F.bodyBold, textTransform: 'uppercase' }}>Ver</Text>
          <Icon name="arrow" size={11} color={color === '#0d121f' ? t.text : color} />
        </View>
      </TouchableOpacity>
      {i < arr.length - 1 && <Divider t={t} style={{ marginLeft: 18 }} />}
    </View>
  ));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Temporada</Text>
        <Text style={{ fontFamily: F.display, fontSize: 38, color: t.text }}>Rankings</Text>
      </View>

      {/* Años (filtro anio de los rankings por disciplina) */}
      {anioOpciones.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: t.border, marginBottom: 22 }}>
          {anioOpciones.map((o) => {
            const on = year === o.value;
            return (
              <TouchableOpacity key={String(o.value)} onPress={() => setYear(o.value)} style={{ paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: on ? t.accent : 'transparent', marginBottom: -1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 18, color: on ? t.accent : t.textMute }}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {catalog === null ? (
        <View style={{ paddingTop: 20, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : catalog.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={load} disabled={!error} style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>{error ? 'No se pudieron cargar los rankings.' : 'No hay rankings disponibles.'}</Text>
            {error && <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Premio Solanet destacado */}
          {solanet && (
            <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
              <TouchableOpacity onPress={() => navigation.navigate('RankingCat', { ranking: solanet })}>
                <View style={{ backgroundColor: t.surface2, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.accent, 0.4), overflow: 'hidden' }}>
                  <View style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="trophy" size={26} color={t.bg} stroke={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 22, color: t.text }}>Premio E. Solanet</Text>
                        {!!edition && <Text style={{ fontSize: 12, color: t.textMute, marginTop: 5, fontFamily: F.mono }}>Edición {edition}</Text>}
                      </View>
                    </View>
                    <Divider t={t} style={{ marginHorizontal: -18, marginBottom: 14 }} />
                    <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyMed, marginBottom: 6 }}>1° puesto · Criador</Text>
                    {solanetTop === undefined ? (
                      <ActivityIndicator color={t.accent} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
                    ) : solanetTop ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 18, color: t.accent }} numberOfLines={2}>{decodeEntities(solanetTop.name)}</Text>
                          {!!solanetTop.cabin && <Text style={{ fontSize: 12, color: t.textMute, marginTop: 3 }} numberOfLines={1}>{decodeEntities(solanetTop.cabin)}</Text>}
                        </View>
                        <View style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 12 }}>Ranking</Text>
                          <Icon name="arrow" size={13} color={t.bg} stroke={2.2} />
                        </View>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12.5, color: t.textMute }}>Sin datos disponibles</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Por disciplina — acordeón (con grupos de dos niveles, ej. Corral) */}
          {displayItems.length > 0 && (
            <>
              <SectionLabel t={t}>Por disciplina</SectionLabel>
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {displayItems.map((item) => {
                  const isOpen = open === item.key;
                  const color = (item.disc && DISCIPLINE_COLORS[item.disc]) || t.accent;
                  const icon = item.disc && DISCIPLINE_ICONS[item.disc];
                  const canOpen = item.type === 'group' || catsOf(item.ranking).length > 0;
                  // Ranking sin datos (not_available): se muestra "Próximamente" y no es clickeable.
                  const soon = item.type === 'ranking' && probe[item.ranking.slug] === 'not_available';
                  const onHeader = () => {
                    if (item.type === 'ranking' && !canOpen) { goTo(item.ranking, null); return; }
                    setOpen(isOpen ? null : item.key); setOpenSub(null);
                  };
                  const Header = soon ? View : TouchableOpacity;
                  return (
                    <View key={item.key} style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: isOpen ? withAlpha(color, 0.7) : t.border, overflow: 'hidden', opacity: soon ? 0.9 : 1 }}>
                      <Header {...(soon ? {} : { onPress: onHeader })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                          {icon ? <Image source={icon} style={{ width: 26, height: 26, tintColor: '#fff' }} resizeMode="contain" /> : <Icon name="trophy" size={20} color="#fff" />}
                        </View>
                        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }} numberOfLines={2}>{item.type === 'group' ? item.label : decodeEntities(item.ranking.nombre)}</Text>
                        {soon ? (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: withAlpha(t.accent, 0.14) }}>
                            <Text style={{ fontSize: 10.5, color: t.accent, fontFamily: F.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5 }}>Próximamente</Text>
                          </View>
                        ) : (
                          <View style={{ transform: [{ rotate: canOpen && isOpen ? '90deg' : '0deg' }] }}>
                            <Icon name="arrow" size={16} color={t.textMute} />
                          </View>
                        )}
                      </Header>

                      {/* Ranking suelto → categorías */}
                      {item.type === 'ranking' && isOpen && catsOf(item.ranking).length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>{renderCats(item.ranking, color)}</View>
                      )}

                      {/* Grupo → sub-rankings, cada uno con sus categorías */}
                      {item.type === 'group' && isOpen && (
                        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
                          {item.rankings.map((sub, si) => {
                            const subOpen = openSub === sub.slug;
                            return (
                              <View key={sub.slug}>
                                <TouchableOpacity onPress={() => setOpenSub(subOpen ? null : sub.slug)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: 16, paddingRight: 14 }}>
                                  <View style={{ width: 3, height: 24, backgroundColor: color, borderRadius: 2 }} />
                                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: t.text }}>{subLabel(sub.nombre)}</Text>
                                  <View style={{ transform: [{ rotate: subOpen ? '90deg' : '0deg' }] }}>
                                    <Icon name="arrow" size={14} color={t.textMute} />
                                  </View>
                                </TouchableOpacity>
                                {subOpen && <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>{renderCats(sub, color)}</View>}
                                {si < item.rankings.length - 1 && <Divider t={t} style={{ marginLeft: 16 }} />}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

