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
  // desde el landing (ej. año + categoría al tocar una categoría de la disciplina).
  const [filters, setFilters] = React.useState(() => {
    const base = filtros.reduce((acc, f) => ({ ...acc, [f.param]: f.default }), {});
    return { ...base, ...(route.params?.initialFilters || {}) };
  });
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
        {!!data?.subtitulo && (
          <Text style={{ fontSize: 12.5, color: t.textMute, marginTop: 6 }}>{decodeEntities(data.subtitulo)}</Text>
        )}
      </View>

      {/* Filtros */}
      {filtros.map((f) => (
        <View key={f.param} style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, paddingHorizontal: 20, marginBottom: 8 }}>{f.label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {(f.opciones || []).map((o) => {
              const on = filters[f.param] === o.value;
              return (
                <TouchableOpacity
                  key={String(o.value)}
                  onPress={() => setFilters((prev) => ({ ...prev, [f.param]: o.value }))}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}
                >
                  <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{decodeEntities(o.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ))}

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
