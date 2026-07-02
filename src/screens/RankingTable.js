import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon, Divider, F } from '../components';
import { decodeEntities } from '../api';

// Tabla genérica de ranking en fila compacta: posición (si la hay) + entidad
// principal + puntaje, con las columnas secundarias debajo. Reutilizada por el
// detalle de ranking (individual o de equipo) y por el detalle de propietario.
//
// `isTappable(fila)` y `onRowPress(fila)` los define cada pantalla (ej. abrir el
// pedigree del animal, o el detalle del propietario).
//
// Rankings de equipo: la pantalla pasa `membersOf(fila)` (los animales del
// equipo / yunta) — se listan debajo de la fila, cada uno tappable a su pedigree
// vía `onMemberPress(member)`. `pointsKey` permite usar una columna de puntaje
// con otro nombre (ej. rodeos usa `totalPointsRanking`).
//
// Modo acordeón (`expandable` + `detailOf`): la fila colapsa el detalle; al
// tocarla se abre una tabla Evento/Tiempo (`detailOf(fila) → [{evento,tiempo}]`)
// más los miembros. Usado por Aparte Campero.
export default function RankingTable({
  t, columnas = [], filas = [], onRowPress, isTappable,
  membersOf, onMemberPress, pointsKey = 'points', pointsLabel,
  expandable = false, detailOf, detailValueLabel = 'Tiempo', secondaryLines,
}) {
  const [openIdx, setOpenIdx] = React.useState(null);
  const isTeamMode = typeof membersOf === 'function';
  const primaryKey = columnas.find((c) => c.key === 'animal') ? 'animal'
    : columnas.find((c) => c.key === 'equipo') ? 'equipo'
    : columnas.find((c) => c.key === 'name') ? 'name'
    // En modo equipo sin columna de nombre (rodeos = yunta), no forzamos un
    // título: la identidad la dan los miembros. Sin esto, una columna de puntos
    // extra (ej. totalPointsObtained) se colaría como título numérico.
    : isTeamMode ? null
    : (columnas.find((c) => !['position', 'points', pointsKey].includes(c.key))?.key || null);
  const hasPosition = columnas.some((c) => c.key === 'position');
  const secondaryCols = columnas.filter((c) => !['position', 'points', pointsKey, primaryKey].includes(c.key));

  return (
    <View>
      {filas.map((fila, i) => {
        const secondary = secondaryCols
          .map((c) => {
            const v = decodeEntities(fila[c.key]);
            return v != null && String(v).trim() !== '' ? `${c.label} ${v}` : null;
          })
          .filter(Boolean).join('  ·  ');
        const isTop = String(fila.position) === '1';
        const rowTappable = !expandable && (isTappable ? isTappable(fila) : false);
        const expanded = expandable && openIdx === i;
        const members = membersOf ? (membersOf(fila) || []) : [];
        // Tabla de detalle (Evento/valor). En apartes va en acordeón (expandable);
        // en FZB, siempre visible bajo los datos del animal.
        const detailRows = detailOf ? (detailOf(fila) || []) : [];
        const showDetail = (!expandable || expanded) && detailRows.length > 0;
        const lines = !expandable && secondaryLines ? (secondaryLines(fila) || []) : null;
        const primary = primaryKey && decodeEntities(fila[primaryKey]);
        const points = fila[pointsKey];

        // El header togglea el acordeón (expandable), navega (tappable) o es
        // estático. Los miembros van fuera del header para no anidar touchables.
        const Header = (expandable || rowTappable) ? TouchableOpacity : View;
        const onPress = expandable ? () => setOpenIdx(expanded ? null : i)
          : rowTappable ? () => { if (onRowPress) onRowPress(fila); }
          : undefined;

        return (
          <View key={i}>
            <Header
              {...(onPress ? { onPress } : {})}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 }}
            >
              {hasPosition && (
                <Text style={{ width: 30, textAlign: 'center', fontFamily: F.display, fontSize: 18, color: isTop ? t.accent : t.textMute }}>{fila.position}</Text>
              )}
              <View style={{ flex: 1 }}>
                {(!!primary || points != null) && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15.5, color: t.text, marginTop: 1 }} numberOfLines={1}>{primary || (members.length ? 'Yunta' : '—')}</Text>
                    {points != null && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: F.mono, fontSize: 15, color: isTop ? t.accent : t.text }}>{points}</Text>
                        {!!pointsLabel && <Text style={{ fontSize: 8.5, color: t.textMute, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{pointsLabel}</Text>}
                      </View>
                    )}
                  </View>
                )}
                {!expandable && (lines
                  ? lines.map((line, li) => (
                      <Text key={li} style={{ fontSize: li === 0 ? 12 : 11.5, color: t.textMute, marginTop: li === 0 ? 4 : 2, lineHeight: 16 }} numberOfLines={1}>{line}</Text>
                    ))
                  : (!!secondary && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3, lineHeight: 16 }}>{secondary}</Text>)
                )}
              </View>
              {expandable
                ? <View style={{ marginTop: 2, transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}><Icon name="arrow" size={14} color={t.textMute} /></View>
                : rowTappable && <Icon name="arrow" size={14} color={t.textDim} />}
            </Header>

            {/* Componentes del equipo (siempre visibles). En apartes van a ancho
                completo de la card; en rodeos, indentados bajo el contenido. */}
            {members.length > 0 && (
              <View style={{ paddingLeft: expandable ? 0 : (hasPosition ? 42 : 0), paddingBottom: 6 }}>
                {members.map((m, mi) => {
                  const name = decodeEntities(m.nombre || m.name);
                  const sub = decodeEntities(m.jinete || m.rider);
                  const mTappable = !!m.animalId;
                  return (
                    <View key={mi}>
                      {expandable && mi > 0 && <Divider t={t} />}
                      <TouchableOpacity
                        disabled={!mTappable}
                        onPress={() => { if (mTappable && onMemberPress) onMemberPress(m); }}
                        style={expandable
                          ? { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }
                          : { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: t.border }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.text }} numberOfLines={1}>{name || '—'}</Text>
                          {!!sub && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 1 }} numberOfLines={1}>{sub}</Text>}
                        </View>
                        {mTappable && <Icon name="arrow" size={12} color={t.textDim} />}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Tabla de detalle (Evento / Tiempo o Puntaje) — a ancho completo */}
            {showDetail && (
              <View style={{ paddingBottom: 14, paddingTop: expandable ? 0 : 2 }}>
                <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: t.bg }}>
                    <Text style={{ flex: 1, fontSize: 10, color: t.textMute, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: F.bodyBold }}>Evento</Text>
                    <Text style={{ width: 64, textAlign: 'right', fontSize: 10, color: t.textMute, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: F.bodyBold }}>{detailValueLabel}</Text>
                  </View>
                  {detailRows.map((r, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: t.border }}>
                      <Text style={{ flex: 1, fontSize: 12.5, color: t.text }} numberOfLines={2}>{decodeEntities(r.evento) || '—'}</Text>
                      <Text style={{ width: 64, textAlign: 'right', fontFamily: F.mono, fontSize: 12.5, color: t.text }}>{r.valor || '—'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {i < filas.length - 1 && <Divider t={t} />}
          </View>
        );
      })}
    </View>
  );
}
