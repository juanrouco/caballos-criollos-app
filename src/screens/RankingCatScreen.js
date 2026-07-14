import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Icon, F } from '../components';
import { withAlpha } from '../theme';
import { fetchRanking, decodeEntities, curateRankingFiltros } from '../api';
import RankingTable from './RankingTable';

// Detalle de un ranking como tabla genérica. Recibe el objeto del ranking
// (slug + filtros con opciones) por route param. Render en fila compacta:
// posición + entidad principal + puntaje, con las demás columnas debajo.
export default function RankingCatScreen({ t, navigation, route }) {
  const ranking = React.useMemo(() => curateRankingFiltros(route.params?.ranking || {}), [route.params?.ranking]);
  const { slug, nombre, filtros = [] } = ranking;

  // Filtros seleccionados: defaults del catálogo + los que vengan preseleccionados
  // desde el landing (año + categoría al tocar una categoría de la disciplina).
  // Se fijan al entrar (no se cambian acá): la elección se hace en el landing.
  const filters = React.useMemo(() => {
    const base = filtros.reduce((acc, f) => ({ ...acc, [f.param]: f.default }), {});
    return { ...base, ...(route.params?.initialFilters || {}) };
  }, [ranking, route.params?.initialFilters]);

  // Resumen de la selección para el subtítulo, ej. "Año: 2026 - Categoría: A".
  // Cada filtro se prefija con su nombre (fallback por si la API no trae `label`).
  const PARAM_LABELS = { anio: 'Año', categoria: 'Categoría' };
  const filterSummary = filtros.map((f) => {
    const opt = (f.opciones || []).find((o) => o.value === filters[f.param]);
    if (!opt) return null;
    const label = decodeEntities(opt.label);
    const prefix = PARAM_LABELS[f.param] || f.label;
    return prefix ? `${prefix}: ${label}` : label;
  }).filter(Boolean).join(' - ');
  const [data, setData] = React.useState(null); // null=loading
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!slug) { setError(true); setData({}); return; }
    let cancelled = false;
    setData(null); setError(false);
    fetchRanking(slug, filters)
      .then((r) => { if (!cancelled) setData(r || {}); })
      .catch(() => { if (!cancelled) { setError(true); setData({}); } });
    return () => { cancelled = true; };
  }, [slug, filters]);

  const filas    = data?.filas || [];
  // `modo` (según los filtros): 'ranking' (tabla), 'pdf' (botón que abre pdf_url)
  // o 'not_available' (aviso "próximamente"). Default 'ranking' por compat.
  const modo   = data?.modo || 'ranking';
  const pdfUrl = data?.pdf_url || null;
  // Año seleccionado (los rankings con `anio` lo traen en los filtros). Si es un
  // año anterior al actual, un not_available es "No disponible" (no "Próximamente").
  const isPastYear = filters.anio != null && Number(filters.anio) < new Date(Date.now()).getFullYear();
  const isSolanet = slug === 'solanet';
  const isTeam    = ranking.familia === 'equipo';
  const isRodeos  = slug === 'rodeos';
  const isApartes = slug === 'apartes_general' || slug === 'apartes_analitico';
  const isFzb     = slug === 'fzb';
  const isCorral  = slug === 'corral_general' || slug === 'corral_analitico';
  const isFreno   = slug === 'freno';
  // Columna que hace de "puntaje" prominente según el ranking. Apartes usa el
  // tiempo (total en general, mejor tiempo en analítico); FZB el promedio de los
  // dos eventos; corral su puntaje; rodeos su puntaje de ranking; el resto 'points'.
  const pointsKey = isRodeos ? 'totalPointsRanking'
    : slug === 'apartes_general' ? 'total'
    : slug === 'apartes_analitico' ? 'tiempo'
    : isFzb ? 'promedio'
    : isCorral ? 'puntaje'
    : 'points';
  // Aparte Campero: al expandir la fila, tabla Evento/Tiempo (2 corridas en
  // general, 1 en analítico). Cada fila del detalle es { evento, valor }.
  const apartesDetail = (fila) => {
    const rows = (fila.evento1 !== undefined || fila.evento2 !== undefined)
      ? [{ evento: fila.evento1, valor: fila.tiempo1 }, { evento: fila.evento2, valor: fila.tiempo2 }]
      : [{ evento: fila.evento, valor: fila.tiempo }];
    return rows.filter((r) => (r.evento != null && r.evento !== '') || (r.valor != null && r.valor !== ''));
  };
  // FZB: tabla Evento/Puntaje con los dos eventos que promedian.
  const fzbDetail = (fila) => [
    { evento: fila.evento1, valor: fila.total1 },
    { evento: fila.evento2, valor: fila.total2 },
  ].filter((r) => (r.evento != null && r.evento !== '') || (r.valor != null && r.valor !== ''));
  const clean = (v) => (v != null && String(v).trim() !== '' ? decodeEntities(String(v).trim()) : null);
  // FZB: bajo el nombre, SBA (+ RP si la API lo trae) y, en otra línea, el propietario.
  const fzbLines = (fila) => {
    const l1 = [clean(fila.sba) && `SBA ${clean(fila.sba)}`, clean(fila.rp) && `RP ${clean(fila.rp)}`].filter(Boolean).join('  ·  ');
    const l2 = clean(fila.propietario) && `Propietario: ${clean(fila.propietario)}`;
    return [l1, l2].filter(Boolean);
  };
  // Corral: 1ª línea SBA · RP · AF, 2ª propietario, 3ª el nombre del evento (un
  // solo evento, así que no hay tabla). El puntaje va arriba a la derecha.
  const corralLines = (fila) => {
    const l1 = [
      clean(fila.sba) && `SBA ${clean(fila.sba)}`,
      clean(fila.rp) && `RP ${clean(fila.rp)}`,
      clean(fila.inspection) && `AF ${clean(fila.inspection)}`,
    ].filter(Boolean).join('  ·  ');
    return [l1, clean(fila.propietario) && `Propietario: ${clean(fila.propietario)}`, clean(fila.evento)].filter(Boolean);
  };
  // Freno de Oro: 1ª línea SBA · RP · AF, 2ª jinete, 3ª propietario. El puntaje
  // va arriba a la derecha (points).
  const frenoLines = (fila) => {
    const l1 = [
      clean(fila.sba) && `SBA ${clean(fila.sba)}`,
      clean(fila.rp) && `RP ${clean(fila.rp)}`,
      clean(fila.inspection) && `AF ${clean(fila.inspection)}`,
    ].filter(Boolean).join('  ·  ');
    return [
      l1,
      clean(fila.rider) && `Jinete: ${clean(fila.rider)}`,
      clean(fila.ownet) && `Propietario: ${clean(fila.ownet)}`,
    ].filter(Boolean);
  };
  // "Puntos obtenidos" (totalPointsObtained) se oculta por ahora (queda solo el
  // puntaje de ranking). Se puede reponer sacándolo de esta lista.
  const HIDDEN_COLS = ['totalPointsObtained'];
  const columnas = (data?.columnas || []).filter((c) => !HIDDEN_COLS.includes(c.key));
  // Subtítulo: la selección fija en rankings con año (individuales/apartes);
  // en rodeos el título del campeonato que devuelve la API es más descriptivo.
  const hasAnio = filtros.some((f) => f.param === 'anio');
  // La API puede traer saltos como salto real (\n) o como barra-n literal ("\n").
  const subtitle = hasAnio ? filterSummary : decodeEntities(data?.subtitulo || '').replace(/\s*(?:\\n|\n)+\s*/g, ' · ').trim();
  const teamPointsLabel = isTeam ? columnas.find((c) => c.key === pointsKey)?.label : undefined;

  // El nombre viene como "Disciplina — Sub-ranking" (ej. "Aparte Campero —
  // Ranking General"). Partimos para dar a cada parte su jerarquía en el header.
  const nameParts = (decodeEntities(nombre) || 'Ranking').split('—').map((s) => s.trim());
  const mainTitle = nameParts[0];
  const rankLabel = nameParts.length > 1 ? nameParts.slice(1).join(' — ') : '';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 26, color: t.text }} numberOfLines={2}>{mainTitle}</Text>
        {!!rankLabel && (
          <Text style={{ fontSize: 15, color: t.textMute, marginTop: 3, fontFamily: F.bodyBold }}>{rankLabel}</Text>
        )}
        {!!subtitle && (
          hasAnio
            ? <Text style={{ fontSize: 17, color: t.accent, marginTop: 12, fontFamily: F.bodyBold }}>{subtitle}</Text>
            : (
              <View style={{ marginTop: 14, borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 12 }}>
                <Text style={{ fontSize: 15, color: t.accent, lineHeight: 21, fontFamily: F.bodyBold }}>{subtitle}</Text>
              </View>
            )
        )}
      </View>

      {/* Contenido: según `modo` → PDF, próximamente o tabla */}
      {data === null ? (
        <View style={{ paddingTop: 30, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : modo === 'pdf' && pdfUrl ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <TouchableOpacity onPress={() => Linking.openURL(pdfUrl).catch(() => {})} style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.accent, 0.4), flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: withAlpha(t.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pdf" size={20} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text }}>Ver ranking (PDF)</Text>
              <Text style={{ fontSize: 11.5, color: t.textMute, marginTop: 2 }}>Se abre en el visor del teléfono</Text>
            </View>
            <Icon name="arrowUR" size={16} color={t.textDim} />
          </TouchableOpacity>
        </View>
      ) : modo === 'not_available' ? (
        // Un año ya pasado que viene not_available no va a llegar → "No disponible";
        // el año actual/futuro → "Próximamente".
        <View style={{ paddingHorizontal: 40, paddingTop: 34, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="trophy" size={26} color={t.textMute} stroke={1.8} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: t.text }}>{isPastYear ? 'No disponible' : 'Próximamente'}</Text>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>{isPastYear ? 'Este ranking no está disponible para el año seleccionado.' : 'Este ranking va a estar disponible pronto.'}</Text>
        </View>
      ) : filas.length === 0 ? (
        <View style={{ paddingHorizontal: 40, paddingTop: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>{error ? 'No se pudo cargar el ranking.' : 'No hay datos para este filtro.'}</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
         <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14 }}>
          <RankingTable
            t={t}
            columnas={columnas}
            filas={filas}
            pointsKey={pointsKey}
            pointsLabel={teamPointsLabel}
            expandable={isApartes}
            detailOf={isApartes ? apartesDetail : isFzb ? fzbDetail : undefined}
            detailValueLabel={isFzb ? 'Puntaje' : 'Tiempo'}
            secondaryLines={isFzb ? fzbLines : isCorral ? corralLines : isFreno ? frenoLines : undefined}
            membersOf={isTeam ? ((fila) => fila.animales || fila.animals) : undefined}
            onMemberPress={(m) => { if (m.animalId) navigation.navigate('HorseDetail', { id: m.animalId }); }}
            isTappable={(fila) => (isTeam ? false : isSolanet ? fila.propertyNumber != null : !!fila.animalId)}
            onRowPress={(fila) => {
              if (isSolanet) {
                navigation.navigate('SolanetDetalle', { premio: filters.premio, propietario: fila.propertyNumber, nombre: fila.name, points: fila.points });
              } else if (fila.animalId) {
                navigation.navigate('HorseDetail', { id: fila.animalId });
              }
            }}
          />
         </View>
        </View>
      )}
    </ScrollView>
  );
}
