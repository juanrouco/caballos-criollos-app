import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image, useWindowDimensions } from 'react-native';
import { Icon, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { fetchDelegados, mapDelegado } from '../api';

// Posición de cada marcador (número romano) como porcentaje del alto/ancho de la
// imagen del mapa (contorno de Argentina, servido por el backend en `mapa`). Es
// geometría de UI; los datos (delegado) vienen del endpoint y se cruzan por
// `romano`. Se afinan una vez que está la imagen definitiva.
const MARKERS = [
  { romano: 'I',    x: 0.309, y: 0.151 },
  { romano: 'II',   x: 0.610, y: 0.126 },
  { romano: 'III',  x: 0.748, y: 0.207 },
  { romano: 'IV',   x: 0.192, y: 0.361 },
  { romano: 'V',    x: 0.404, y: 0.298 },
  { romano: 'VI',   x: 0.573, y: 0.231 },
  { romano: 'VII',  x: 0.496, y: 0.420 },
  { romano: 'VIII', x: 0.651, y: 0.381 },
  { romano: 'IX',   x: 0.696, y: 0.452 },
  { romano: 'X',    x: 0.569, y: 0.501 },
  { romano: 'XI',   x: 0.211, y: 0.554 },
  { romano: 'XII',  x: 0.332, y: 0.466 },
  { romano: 'XIII', x: 0.146, y: 0.784 },
];
const DEFAULT_ASPECT = 197 / 421; // ancho/alto de mapa_delegados.png (se ajusta en onLoad)

// Sección Mapa ACCC: mapa de Argentina (imagen del backend) con las
// delegaciones como marcadores numerados dibujados encima. Al tocar un marcador
// (o una fila de la lista) se resalta y se muestra la delegación + su delegado.
// Datos: GET /delegados (el romano se deriva del texto de `delegacion`). Se
// monta como overlay del menú lateral → recibe t / topInset / onBack.
export default function MapaScreen({ t, topInset, onBack }) {
  const { width } = useWindowDimensions();
  const [dels, setDels] = React.useState(null);   // null=cargando, []=vacío/error
  const [mapaUrl, setMapaUrl] = React.useState(null);
  const [aspect, setAspect] = React.useState(DEFAULT_ASPECT);
  const [error, setError] = React.useState(false);
  const [selected, setSelected] = React.useState(null); // romano seleccionado

  React.useEffect(() => {
    let cancelled = false;
    setDels(null); setError(false);
    fetchDelegados()
      .then((r) => {
        if (cancelled) return;
        setDels((r.data || []).map(mapDelegado));
        setMapaUrl(r.mapa || null);
      })
      .catch(() => { if (!cancelled) { setError(true); setDels([]); } });
    return () => { cancelled = true; };
  }, []);

  const byRomano = React.useMemo(() => {
    const m = {};
    (dels || []).forEach((d) => { (m[d.romano] = m[d.romano] || []).push(d); });
    return m;
  }, [dels]);

  const selectedDels = selected ? (byRomano[selected] || []) : [];

  const mapW = Math.min(width - 40, 320);
  const mapH = mapW / aspect;
  const MR = Math.max(14, Math.round(mapW * 0.062)); // radio del marcador (px), proporcional

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }}>Mapa ACCC</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Mapa (imagen del backend) + marcadores numerados encima */}
        {!!mapaUrl && (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ width: mapW, height: mapH }}>
              <Image
                source={{ uri: mapaUrl }}
                style={{ width: mapW, height: mapH }}
                resizeMode="contain"
                onLoad={(e) => {
                  const s = e?.nativeEvent?.source;
                  if (s?.width > 0 && s?.height > 0) setAspect(s.width / s.height);
                }}
              />
              {MARKERS.map((mk) => {
                const on = selected === mk.romano;
                const r = on ? MR + 2 : MR;
                return (
                  <TouchableOpacity
                    key={mk.romano}
                    onPress={() => setSelected(mk.romano)}
                    accessibilityLabel={`Delegación ${mk.romano}`}
                    style={{ position: 'absolute', left: mk.x * mapW - r, top: mk.y * mapH - r, width: r * 2, height: r * 2, borderRadius: r, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.accent : withAlpha(t.bg, 0.9), borderWidth: 1.6, borderColor: on ? t.accent : t.text }}
                  >
                    <Text style={{ fontFamily: F.bodyBold, fontSize: Math.round(MR * 0.62), color: on ? t.bg : t.text }}>{mk.romano}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 11.5, color: t.textMute, marginTop: 6 }}>Tocá una delegación en el mapa</Text>
          </View>
        )}

        {/* Detalle de la delegación seleccionada */}
        {selectedDels.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 4 }}>
            <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(t.accent, 0.5), padding: 16 }}>
              {selectedDels.map((d, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : 14 }}>
                  <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: F.bodyBold }}>{d.delegacion || `Delegación ${d.romano}`}</Text>
                  {!!d.delegado && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Icon name="user" size={15} color={t.textMute} />
                      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }}>{d.delegado}</Text>
                    </View>
                  )}
                  {!!d.email && (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${d.email}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Icon name="mail" size={14} color={t.accent} />
                      <Text style={{ flex: 1, fontSize: 13, color: t.accent }}>{d.email}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estado de carga / listado completo */}
        {dels === null ? (
          <View style={{ paddingTop: 24, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
        ) : dels.length === 0 ? (
          <View style={{ paddingHorizontal: 40, paddingTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>
              {error ? 'No se pudieron cargar las delegaciones.' : 'No hay delegaciones para mostrar.'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F.bodyBold, paddingHorizontal: 20, marginBottom: 4 }}>Delegaciones</Text>
            {dels.map((d, i) => {
              const on = selected === d.romano;
              return (
                <View key={`${d.romano}-${i}`}>
                  <TouchableOpacity onPress={() => setSelected(d.romano)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 20, backgroundColor: on ? withAlpha(t.accent, 0.08) : 'transparent' }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.4, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: on ? t.bg : t.textMute }}>{d.romano}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={1}>{d.delegacion || `Delegación ${d.romano}`}</Text>
                      {!!d.delegado && <Text style={{ fontSize: 12, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{d.delegado}</Text>}
                    </View>
                  </TouchableOpacity>
                  {i < dels.length - 1 && <Divider t={t} style={{ marginLeft: 20 }} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
