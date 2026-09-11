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
  const { eventoId, prueba, pruebaNombre, categoriaTitle, resultado, yunta } = route.params || {};
  const insets = useSafeAreaInsets();
  // Padding inferior para que el final (card Datos) no quede tapado por la
  // botonera flotante — mismo criterio que HorseDetailScreen.
  const bottomPad = 80 + Math.max(22, insets.bottom + 8);
  const r = resultado || {};
  const a = r.animal || {};
  // Rodeos (y Paleteada, que comparte el shape): el detalle viene por yunta
  // (par de animales) y ya llega completo en el objeto de la lista
  // (vacas / handicaps / totales) — no hace falta pedir el desagregado.
  const isRodeo = !!yunta;
  const isCopa = route.params?.clasificacion === 'CopaEspecial';

  // Desagregado de la planilla. undefined = cargando, null = no disponible
  // (error o prueba sin detalle), objeto = la respuesta de la API.
  const [detResp, setDetResp] = React.useState(undefined);
  React.useEffect(() => {
    if (isRodeo || !eventoId || !prueba || !a.id) { setDetResp(null); return; }
    let cancelled = false;
    fetchResultadoDetalle(eventoId, prueba, a.id)
      .then((d) => { if (!cancelled) setDetResp(d || null); })
      .catch(() => { if (!cancelled) setDetResp(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId, prueba, a.id]);
  const detalle = detResp === undefined ? undefined : (detResp?.detalle ?? null);
  // En las clasificatorias no puntúa la morfología (y en corral tampoco se
  // corre la 3° vaca), así que esas filas no se muestran. En Final y demás, sí.
  const esClasificatoria = (detResp?.clasificacion ?? route.params?.clasificacion) === 'Clasificatoria';
  // Puesto y total del header: para rodeos salen de la yunta.
  const totDia1 = yunta?.totales?.dia1;
  const totDia2 = yunta?.totales?.dia2;
  const rodeoTotal = isCopa
    ? totDia1
    : (totDia1 != null && totDia2 != null ? Number(totDia1) + Number(totDia2) : (totDia1 ?? totDia2));
  // En rodeos clasificatoria el orden es por número de yunta (no por puntaje)
  // y el total no se muestra.
  const totalHeader = isRodeo ? (esClasificatoria ? null : rodeoTotal) : r.total;
  const puesto = isRodeo ? yunta.puesto?.general : r.puesto;
  const top = puesto === 1;

  // Ficha(s) de animal: la yunta trae dos; las pruebas individuales, uno.
  const animales = isRodeo ? (yunta.animales || []) : [a];

  const jineteDe = (an) => (an?.jinete ? [an.jinete.nombre, an.jinete.apellido].filter(Boolean).join(' ') : '');
  const jinete = jineteDe(a);
  const infoRows = (isRodeo
    ? [
        yunta.equipo?.nombre && ['Equipo', String(yunta.equipo.nombre).trim()],
        yunta.equipo2?.nombre && ['Equipo 2', String(yunta.equipo2.nombre).trim()],
      ]
    : [
        a.cabania && ['Cabaña', String(a.cabania).trim()],
        a.box != null && ['Box', String(a.box)],
        jinete && ['Jinete', jinete],
      ]
  ).filter(Boolean);

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

        {/* Puesto + puntaje. En rodeos clasificatoria no hay puesto ni total
            que mostrar (las yuntas van por orden de salida): la card no va. */}
        {!(isRodeo && esClasificatoria) && (
        <View style={{ marginTop: 18, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: top ? withAlpha(t.accent, 0.5) : t.border, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: top ? t.accent : t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: top ? t.bg : t.text }}>{puesto != null ? `${puesto}°` : '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Puesto</Text>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginTop: 2 }}>{puesto != null ? `${puesto}° de la categoría` : 'Sin puesto'}</Text>
          </View>
          {totalHeader != null && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.mono, fontSize: 20, color: top ? t.accent : t.text }}>{fmtPts(totalHeader)}</Text>
              <Text style={{ fontSize: 9.5, color: t.accent, letterSpacing: 1, marginTop: 2, fontFamily: F.bodyBold }}>PUNTOS</Text>
            </View>
          )}
        </View>
        )}

        {/* Animal(es) → pedigree */}
        <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>
          {animales.length > 1 ? 'Animales' : 'Animal'}
        </Text>
        <View style={{ gap: 8 }}>
          {animales.map((an, i) => {
            const reg = [an.sba != null && `S.B.A. ${an.sba}`, an.rp != null && `R.P. ${an.rp}`].filter(Boolean).join(' · ');
            const meta = [an.sexo, an.fecha_nacimiento && `Nac. ${formatDate(an.fecha_nacimiento)}`, (an.pelaje || '').trim()].filter(Boolean).join(' · ');
            const jin = jineteDe(an);
            return (
              <TouchableOpacity
                key={`${an.id ?? 'a'}-${i}`}
                onPress={() => an.id && navigation.navigate('HorseDetail', { id: an.id })}
                style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 17, color: t.text }} numberOfLines={2}>{an.nombre || '—'}</Text>
                  {!!reg && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 4, fontFamily: F.mono }} numberOfLines={1}>{reg}</Text>}
                  {!!meta && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 2 }} numberOfLines={1}>{meta}</Text>}
                  {/* En la yunta cada animal lleva su jinete; en las
                      individuales el jinete va en la card Datos. */}
                  {isRodeo && !!jin && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 2, fontFamily: F.mono }} numberOfLines={1}>Jinete: {jin}</Text>}
                  <Text style={{ fontSize: 10.5, color: t.accent, marginTop: 6, fontFamily: F.bodyBold }}>Ver pedigree</Text>
                </View>
                <Icon name="arrow" size={16} color={t.textDim} />
              </TouchableOpacity>
            );
          })}
        </View>

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

        {/* Planilla: medias por sección (Copa Incentivo de Oro). Sólo se
            muestran los totales de cada bloque, no las vueltas por rubro. */}
        {prueba === 'copa_incentivo' && detalle?.bloques && (() => {
          const b = detalle.bloques;
          const rows = [
            ['Media Morfología', b.morfologia?.total],
            ['Media Andares', b.andares?.total],
            ['Media esb / vsp', b.esb?.total],
            ['Media Campo', b.campo?.total],
          ].filter(([, v]) => v != null);
          if (rows.length === 0 && detalle.total == null) return null;
          return (
            <>
              <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Planilla</Text>
              <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4 }}>
                {rows.map(([k, v], i) => (
                  <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border, gap: 12 }}>
                    <Text style={{ fontSize: 12, color: t.textMute }}>{k}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(v)}</Text>
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
          );
        })()}

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

        {/* Planilla: vaca por vaca (rodeos) — sin fetch, la yunta ya la trae */}
        {isRodeo && (() => {
          const extras = yunta.vacas?.extras || {};
          const days = [
            { n: 1, vacas: yunta.vacas?.dia1 || [], base: 0, total: totDia1 },
            // En clasificatoria las vacas del día 2 se cuentan del 1 al 12,
            // como en el día 1; en Final y demás, del 13 al 24.
            ...(!isCopa ? [{ n: 2, vacas: yunta.vacas?.dia2 || [], base: esClasificatoria ? 0 : 12, total: totDia2 }] : []),
          ].filter((d) => d.vacas.some((v) => v != null) || d.total != null);
          const desempates = [extras.vaca25, extras.vaca26, extras.vaca27]
            .map((v, i) => (v == null ? null : { label: `Desempate (Vaca ${25 + i})`, v }))
            .filter(Boolean);
          const morfos = esClasificatoria ? [] : [
            yunta.handicaps?.morfologia_1 != null && ['Morfología 1', yunta.handicaps.morfologia_1],
            yunta.handicaps?.morfologia_2 != null && ['Morfología 2', yunta.handicaps.morfologia_2],
          ].filter(Boolean);
          if (days.length === 0 && desempates.length === 0 && morfos.length === 0) return null;
          return (
            <>
              <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold, marginTop: 22, marginBottom: 8 }}>Planilla</Text>
              <View style={{ backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4, paddingBottom: 4 }}>
                {days.map((d) => (
                  <View key={`dia-${d.n}`}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 4, paddingHorizontal: 12 }}>
                      <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Día {d.n}</Text>
                      {d.total != null && <Text style={{ fontFamily: F.mono, fontSize: 12, color: t.text }}>{fmtPts(d.total)}</Text>}
                    </View>
                    {d.vacas.map((v, i) => (v == null ? null : (
                      <View key={`v-${d.base + i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                        <Text style={{ fontSize: 12, color: t.textMute }}>Vaca {d.base + i + 1}</Text>
                        <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(v)}</Text>
                      </View>
                    )))}
                  </View>
                ))}
                {desempates.map((de) => (
                  <View key={de.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                    <Text style={{ fontSize: 12, color: t.textMute }}>{de.label}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(de.v)}</Text>
                  </View>
                ))}
                {morfos.map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12 }}>
                    <Text style={{ fontSize: 12, color: t.textMute }}>{k}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 13, color: t.text }}>{fmtPts(v)}</Text>
                  </View>
                ))}
                {!esClasificatoria && rodeoTotal != null && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: t.text, fontFamily: F.bodyBold }}>Total final</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 14, color: t.accent }}>{fmtPts(rodeoTotal)}</Text>
                  </View>
                )}
              </View>
            </>
          );
        })()}

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
