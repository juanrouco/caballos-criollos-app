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

  const columnas = data?.columnas || [];
  const filas    = data?.filas || [];
  const isSolanet = slug === 'solanet';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 26, color: t.text }} numberOfLines={2}>{decodeEntities(nombre) || 'Ranking'}</Text>
        {!!(filterSummary || data?.subtitulo) && (
          <Text style={{ fontSize: 12.5, color: t.textMute, marginTop: 6 }}>{filterSummary || decodeEntities(data.subtitulo)}</Text>
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
          <RankingTable
            t={t}
            columnas={columnas}
            filas={filas}
            isTappable={(fila) => (isSolanet ? fila.propertyNumber != null : !!fila.animalId)}
            onRowPress={(fila) => {
              if (isSolanet) {
                navigation.navigate('SolanetDetalle', { premio: filters.premio, propietario: fila.propertyNumber, nombre: fila.name, points: fila.points });
              } else if (fila.animalId) {
                navigation.navigate('HorseDetail', { id: fila.animalId });
              }
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}
