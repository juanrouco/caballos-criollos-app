import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, F } from '../components';
import { fetchResultadoDetalle } from '../api';
import { formatDate } from '../format';

// Detalle de un resultado de prueba funcional individual (F.Z.B., corral de
// aparte, freno de oro): puesto + puntaje + la ficha del animal y su jinete,
// y el desagregado de la planilla (GET /eventos/{id}/resultados/{prueba}/{target})
// cuando la prueba lo expone. Se llega tocando la fila del resultado en
// EventDetail; desde acá, tocar el animal abre su pedigree (HorseDetail).
//
// Params: { eventoId, prueba ('fzb' | 'corral_aparte'), pruebaNombre,
//           categoriaTitle, resultado: { puesto, total, animal } }

// Rubros del reglamento de F.Z.B., en el orden de la planilla del admin.
const FZB_RUBROS = [
  ['morfologia', 'Morfología'],
  ['andares', 'Andares'],
  ['rayada', 'Rayada'],
  ['troya', 'Troya'],
  ['ocho', 'Ocho'],
  ['volapie', 'Volapié'],
  ['vuelta', 'Vuelta s/patas'],
  ['desmontar', 'Desmontar y montar'],
  ['retroceso', 'Retroceso'],
];

// Mismo criterio que fmtPts de EventDetail: limpia ruido flotante, freno
// puntúa con 3 decimales.
function fmtPts(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return String(Math.round(Number(n) * 1000) / 1000);
}

function withAlpha(hex, a) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function ResultDetailScreen({ t, navigation, route }) {
  const { eventoId, prueba, pruebaNombre, categoriaTitle, resultado } = route.params || {};
  const insets = useSafeAreaInsets();
  // Padding inferior para que el final (card Datos) no quede tapado por la
  // botonera flotante — mismo criterio que HorseDetailScreen.
  const bottomPad = 80 + Math.max(22, insets.bottom + 8);
  const r = resultado || {};
  const a = r.animal || {};

  // Desagregado de la planilla. undefined = cargando, null = no disponible
  // (error o prueba sin detalle), objeto = la respuesta de la API.
  const [detResp, setDetResp] = React.useState(undefined);
  React.useEffect(() => {
    if (!eventoId || !prueba || !a.id) { setDetResp(null); return; }
    let cancelled = false;
    fetchResultadoDetalle(eventoId, prueba, a.id)
      .then((d) => { if (!cancelled) setDetResp(d || null); })
      .catch(() => { if (!cancelled) setDetResp(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId, prueba, a.id]);
  const detalle = detResp === undefined ? undefined : (detResp?.detalle ?? null);
  // En las clasificatorias de corral no se corre la 3° vaca ni puntúa la
  // morfología, así que esas filas no se muestran. En Final y demás, sí.
  const esClasificatoria = (detResp?.clasificacion ?? route.params?.clasificacion) === 'Clasificatoria';
  const jinete = a.jinete ? [a.jinete.nombre, a.jinete.apellido].filter(Boolean).join(' ') : '';
  const reg = [a.sba != null && `S.B.A. ${a.sba}`, a.rp != null && `R.P. ${a.rp}`].filter(Boolean).join(' · ');
  const meta = [a.sexo, a.fecha_nacimiento && `Nac. ${formatDate(a.fecha_nacimiento)}`, (a.pelaje || '').trim()].filter(Boolean).join(' · ');
  const top = r.puesto === 1;

  const infoRows = [
    a.cabania && ['Cabaña', String(a.cabania).trim()],
    a.box != null && ['Box', String(a.box)],
    jinete && ['Jinete', jinete],
  ].filter(Boolean);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 26, color: t.text }} numberOfLines={2}>{pruebaNombre || 'Resultado'}</Text>
        {!!categoriaTitle && (
          <Text style={{ fontSize: 15, color: t.textMute, marginTop: 3, fontFamily: F.bodyBold }}>{categoriaTitle}</Text>
        )}

        {/* Puesto + puntaje */}
        <View style={{ marginTop: 18, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: top ? withAlpha(t.accent, 0.5) : t.border, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: top ? t.accent : t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: top ? t.bg : t.text }}>{r.puesto != null ? `${r.puesto}°` : '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Puesto</Text>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginTop: 2 }}>{r.puesto != null ? `${r.puesto}° de la categoría` : 'Sin puesto'}</Text>
          </View>
          {r.total != null && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.mono, fontSize: 20, color: top ? t.accent : t.text }}>{fmtPts(r.total)}</Text>
              <Text style={{ fontSize: 9.5, color: t.accent, letterSpacing: 1, marginTop: 2, fontFamily: F.bodyBold }}>PUNTOS</Text>
            </View>
          )}
        </View>

        {/* Animal → pedigree */}
        <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Animal</Text>
        <TouchableOpacity
          onPress={() => a.id && navigation.navigate('HorseDetail', { id: a.id })}
          style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: t.text }} numberOfLines={2}>{a.nombre || '—'}</Text>
            {!!reg && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 4, fontFamily: F.mono }} numberOfLines={1}>{reg}</Text>}
            {!!meta && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{meta}</Text>}
            <Text style={{ fontSize: 10.5, color: t.accent, marginTop: 6, fontFamily: F.bodyBold }}>Ver pedigree</Text>
          </View>
          <Icon name="arrow" size={16} color={t.textDim} />
        </TouchableOpacity>

        {/* Planilla: desagregado por rubro (F.Z.B.) */}
        {detalle === undefined && (
          <View style={{ marginTop: 22, alignItems: 'center' }}>
            <ActivityIndicator color={t.accent} />
          </View>
        )}
        {prueba === 'fzb' && detalle?.rubros && (
          <>
            <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Planilla</Text>
            <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4 }}>
              {FZB_RUBROS.filter(([key]) => detalle.rubros[key] != null).map(([key, label], i) => (
                <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border, gap: 12 }}>
                  <Text style={{ fontSize: 12, color: t.textMute }}>{label}</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(detalle.rubros[key])}</Text>
                </View>
              ))}
              {detalle.total != null && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                  <Text style={{ fontSize: 12, color: t.text, fontFamily: F.bodyBold }}>Total</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 14, color: t.accent }}>{fmtPts(detalle.total)}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Planilla: desagregado por rondas (corral de aparte) */}
        {prueba === 'corral_aparte' && Array.isArray(detalle?.rondas) && (
          <>
            <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Planilla</Text>
            <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4, paddingBottom: 4 }}>
              {detalle.rondas
                // Sólo días con algo corrido (alguna vaca o morfología con dato).
                .filter((ro) => (ro.apartes || []).some((ap) => ap?.aparte != null || (ap?.apretadas || []).some((x) => x != null)) || ro.morfologia != null)
                .map((ro) => (
                  <View key={`ronda-${ro.ronda}`}>
                    {/* La planilla del admin llama "Día 1 / Día 2" a las rondas
                        y "1° Vaca / 2° / 3°" a los apartes; replicamos esa
                        nomenclatura. */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 4, paddingHorizontal: 12 }}>
                      <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Día {ro.ronda}</Text>
                      {ro.total != null && <Text style={{ fontFamily: F.mono, fontSize: 12, color: t.text }}>{fmtPts(ro.total)}</Text>}
                    </View>
                    {(esClasificatoria ? (ro.apartes || []).slice(0, 2) : (ro.apartes || [])).map((ap, ai) => (
                      <View key={`ap-${ai}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: t.textMute }}>{ai + 1}° Vaca</Text>
                          {/* Aparte y mantención + las dos apretadas que suman
                              el total de la vaca */}
                          <Text style={{ fontSize: 10.5, color: t.textDim, marginTop: 2, fontFamily: F.mono }}>
                            {[
                              `Aparte y mant. ${ap.aparte == null ? '—' : fmtPts(ap.aparte)}`,
                              ...(ap.apretadas || []).map((v) => `Apretar ${v == null ? '—' : fmtPts(v)}`),
                            ].join(' · ')}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{ap.subtotal != null ? fmtPts(ap.subtotal) : '—'}</Text>
                      </View>
                    ))}
                    {!esClasificatoria && ro.morfologia != null && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                        <Text style={{ fontSize: 12, color: t.textMute }}>Morfología</Text>
                        <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(ro.morfologia)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              {detalle.total != null && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: t.text, fontFamily: F.bodyBold }}>Total final</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 14, color: t.accent }}>{fmtPts(detalle.total)}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Datos de la corrida */}
        {infoRows.length > 0 && (
          <>
            <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Datos</Text>
            <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4 }}>
              {infoRows.map(([k, v], i) => (
                <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border, gap: 12 }}>
                  <Text style={{ fontSize: 11.5, color: t.textMute }}>{k}</Text>
                  <Text style={{ color: t.text, fontFamily: F.bodyMed, fontSize: 12.5, flex: 1, textAlign: 'right' }}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
