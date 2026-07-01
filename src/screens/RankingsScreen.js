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
};

// La temporada de Solanet que corresponde a un año = la que termina en ese año
// (ej. año 2026 → "2025 - 2026"). Si no matchea, cae al default del filtro.
function premioForYear(premioF, year) {
  if (!premioF) return null;
  const opts = premioF.opciones || [];
  const match = year != null && opts.find((o) => String(o.label).trim().endsWith(String(year)));
  return match || opts.find((o) => o.value === premioF.default) || opts[0] || null;
}

export default function RankingsScreen({ t, navigation }) {
  const [catalog, setCatalog] = React.useState(null); // null=loading, []=vacío/error
  const [error, setError] = React.useState(false);
  const [solanetTop, setSolanetTop] = React.useState(undefined); // undefined=loading, null=sin datos
  const [year, setYear] = React.useState(null);   // año seleccionado (filtro anio de los individuales)
  const [open, setOpen] = React.useState(null);   // slug del acordeón abierto

  const load = React.useCallback(() => {
    let cancelled = false;
    setCatalog(null); setError(false); setSolanetTop(undefined);
    fetchRankings()
      .then((r) => {
        if (cancelled) return;
        const items = r.data || [];
        setCatalog(items);
        const anioF = items.find((x) => x.familia === 'individual')?.filtros?.find((f) => f.param === 'anio');
        setYear((prev) => prev ?? (anioF ? anioF.default : null));
      })
      .catch(() => { if (!cancelled) { setError(true); setCatalog([]); setSolanetTop(null); } });
    return () => { cancelled = true; };
  }, []);
  React.useEffect(() => load(), [load]);

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
  const individuals = (catalog || []).filter((x) => x.familia === 'individual');
  const anioOpciones = individuals.find((x) => x.filtros?.some((f) => f.param === 'anio'))
    ?.filtros?.find((f) => f.param === 'anio')?.opciones || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
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

          {/* Por disciplina — acordeón con las categorías de cada ranking */}
          {individuals.length > 0 && (
            <>
              <SectionLabel t={t}>Por disciplina</SectionLabel>
              <View style={{ paddingHorizontal: 20, gap: 10 }}>
                {individuals.map((r) => {
                  const isOpen = open === r.slug;
                  const disc = RANK_DISC[r.slug];
                  const color = (disc && DISCIPLINE_COLORS[disc]) || t.accent;
                  const icon = disc && DISCIPLINE_ICONS[disc];
                  const cats = r.filtros?.find((f) => f.param === 'categoria')?.opciones || [];
                  const goTo = (categoria) => navigation.navigate('RankingCat', {
                    ranking: r,
                    initialFilters: { ...(year != null ? { anio: year } : {}), ...(categoria != null ? { categoria } : {}) },
                  });
                  return (
                    <View key={r.slug} style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: isOpen ? withAlpha(color, 0.7) : t.border, overflow: 'hidden' }}>
                      <TouchableOpacity onPress={() => (cats.length > 0 ? setOpen(isOpen ? null : r.slug) : goTo(null))} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                          {icon ? <Image source={icon} style={{ width: 26, height: 26, tintColor: '#fff' }} resizeMode="contain" /> : <Icon name="trophy" size={20} color="#fff" />}
                        </View>
                        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }} numberOfLines={2}>{decodeEntities(r.nombre)}</Text>
                        <View style={{ transform: [{ rotate: cats.length > 0 && isOpen ? '90deg' : '0deg' }] }}>
                          <Icon name="arrow" size={16} color={t.textMute} />
                        </View>
                      </TouchableOpacity>
                      {isOpen && cats.length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: t.border }}>
                          {cats.map((c, i) => (
                            <View key={String(c.value)}>
                              <TouchableOpacity onPress={() => goTo(c.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 18, paddingRight: 14 }}>
                                <View style={{ width: 3, height: 22, backgroundColor: color, borderRadius: 2 }} />
                                <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: t.text }}>{decodeEntities(c.label)}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: withAlpha(color, 0.15) }}>
                                  <Text style={{ color: color === '#0d121f' ? t.text : color, fontSize: 10.5, fontFamily: F.bodyBold, textTransform: 'uppercase' }}>Ver</Text>
                                  <Icon name="arrow" size={11} color={color === '#0d121f' ? t.text : color} />
                                </View>
                              </TouchableOpacity>
                              {i < cats.length - 1 && <Divider t={t} style={{ marginLeft: 18 }} />}
                            </View>
                          ))}
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
