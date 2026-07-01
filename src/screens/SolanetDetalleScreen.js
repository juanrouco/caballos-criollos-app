import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, F } from '../components';
import { fetchSolanetDetalle } from '../api';
import RankingTable from './RankingTable';

// Detalle de un propietario en el Premio Solanet: los méritos (por animal) que
// le suman puntos. Cada animal linkea a su pedigree (animalId ya viene armado).
export default function SolanetDetalleScreen({ t, navigation, route }) {
  const { premio, propietario, nombre, points } = route.params || {};
  const [data, setData] = React.useState(null); // null=loading
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (propietario == null) { setError(true); setData({}); return; }
    let cancelled = false;
    setData(null); setError(false);
    fetchSolanetDetalle({ premio, propietario })
      .then((r) => { if (!cancelled) setData(r || {}); })
      .catch(() => { if (!cancelled) { setError(true); setData({}); } });
    return () => { cancelled = true; };
  }, [premio, propietario]);

  const columnas = data?.columnas || [];
  const filas    = data?.filas || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>Premio E. Solanet · Detalle</Text>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text }} numberOfLines={2}>{nombre || 'Propietario'}</Text>
        {points != null && String(points) !== '' && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 22, color: t.accent }}>{points}</Text>
            <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase' }}>puntos</Text>
          </View>
        )}
      </View>

      {data === null ? (
        <View style={{ paddingTop: 30, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : filas.length === 0 ? (
        <View style={{ paddingHorizontal: 40, paddingTop: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>{error ? 'No se pudo cargar el detalle.' : 'Sin méritos para este propietario.'}</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
          <RankingTable
            t={t}
            columnas={columnas}
            filas={filas}
            isTappable={(fila) => !!fila.animalId}
            onRowPress={(fila) => { if (fila.animalId) navigation.navigate('HorseDetail', { id: fila.animalId }); }}
          />
        </View>
      )}
    </ScrollView>
  );
}
