import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, F } from '../components';
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

  // Resumen de la selección para el subtítulo, ej. "Año: 2026 - Hembras".
  const filterSummary = filtros.map((f) => {
    const opt = (f.opciones || []).find((o) => o.value === filters[f.param]);
    if (!opt) return null;
    const label = decodeEntities(opt.label);
    return f.param === 'anio' ? `Año: ${label}` : label;
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
  const isSolanet = slug === 'solanet';
  const isTeam    = ranking.familia === 'equipo';
  const isRodeos  = slug === 'rodeos';
  // Rodeos usa nombres de columna de puntaje distintos; el resto usa 'points'.
  const pointsKey = isRodeos ? 'totalPointsRanking' : 'points';
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
          <Text style={{ fontSize: 15, color: t.textMute, marginTop: 3, fontFamily: F.bodyMed }}>{rankLabel}</Text>
        )}
        {!!subtitle && (
          hasAnio
            ? <Text style={{ fontSize: 17, color: t.accent, marginTop: 12, fontFamily: F.bodyBold }}>{subtitle}</Text>
            : <Text style={{ fontSize: 13, color: t.textMute, marginTop: 10, lineHeight: 18 }}>{subtitle}</Text>
        )}
      </View>

      {/* Tabla */}
      {data === null ? (
        <View style={{ paddingTop: 30, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
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
