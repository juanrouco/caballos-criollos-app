import React from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { Icon, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { fetchReglamentos, fetchReglamentoPruebas, mapReglamento, fetchNoticia } from '../api';

// Sección Reglamentos: lista de reglamentos filtrable por prueba (chips). Al
// tocar uno, se pide el detalle (GET /noticias/{id}) y se abre el archivo
// adjunto en el navegador/visor del teléfono. Se monta como overlay del menú
// lateral, así que recibe t / topInset / onBack por props (no vía navegación).
export default function ReglamentosScreen({ t, topInset, onBack }) {
  const [pruebas, setPruebas] = React.useState([]);
  const [activePrueba, setActivePrueba] = React.useState(null); // null = Todas
  const [items, setItems] = React.useState(null); // null=loading, []=vacío/error
  const [error, setError] = React.useState(false);
  const [opening, setOpening] = React.useState(null); // id del reglamento abriéndose

  // Pruebas (filtro) — una sola vez. Si falla, se queda sin chips (solo "Todas").
  React.useEffect(() => {
    let cancelled = false;
    fetchReglamentoPruebas()
      .then((r) => { if (!cancelled) setPruebas(r.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Listado — al montar y cuando cambia el filtro por prueba.
  React.useEffect(() => {
    let cancelled = false;
    setItems(null); setError(false);
    const params = { limit: 100 };
    if (activePrueba != null) params.prueba = activePrueba;
    fetchReglamentos(params)
      .then((r) => { if (!cancelled) setItems((r.data || []).map(mapReglamento)); })
      .catch(() => { if (!cancelled) { setError(true); setItems([]); } });
    return () => { cancelled = true; };
  }, [activePrueba]);

  const openReglamento = React.useCallback((id) => {
    if (opening != null) return;
    setOpening(id);
    fetchNoticia(id)
      .then((detail) => {
        const file = (detail.archivos || [])[0];
        if (file?.url) return Linking.openURL(file.url);
        Alert.alert('Sin archivo', 'Este reglamento todavía no tiene un documento adjunto.');
      })
      .catch(() => Alert.alert('Error', 'No se pudo abrir el reglamento. Reintentá.'))
      .finally(() => setOpening(null));
  }, [opening]);

  const chips = [{ id: null, nombre: 'Todas' }, ...pruebas];

  const renderItem = ({ item }) => {
    const isOpening = opening === item.id;
    return (
      <TouchableOpacity
        onPress={() => openReglamento(item.id)}
        disabled={opening != null}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20, opacity: opening != null && !isOpening ? 0.5 : 1 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: withAlpha(t.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
          {isOpening ? <ActivityIndicator size="small" color={t.accent} /> : <Icon name="pdf" size={19} color={t.accent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{item.title}</Text>
          <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3, fontFamily: F.mono }} numberOfLines={1}>
            {[item.prueba, item.date].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Icon name="arrowUR" size={16} color={t.textMute} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }}>Reglamentos</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 14 }}>
          {chips.map((p) => {
            const on = activePrueba === p.id;
            return (
              <TouchableOpacity
                key={p.id ?? 'all'}
                onPress={() => setActivePrueba(p.id)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}
              >
                <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{p.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {items === null ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ paddingHorizontal: 40, paddingTop: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>
            {error ? 'No se pudieron cargar los reglamentos.' : 'No hay reglamentos para esta prueba.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Divider t={t} style={{ marginLeft: 20 }} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
