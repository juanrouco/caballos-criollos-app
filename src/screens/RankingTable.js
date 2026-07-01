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
export default function RankingTable({
  t, columnas = [], filas = [], onRowPress, isTappable,
  membersOf, onMemberPress, pointsKey = 'points', pointsLabel,
}) {
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
        const tappable = isTappable ? isTappable(fila) : false;
        const members = membersOf ? (membersOf(fila) || []) : [];
        const primary = primaryKey && decodeEntities(fila[primaryKey]);
        const points = fila[pointsKey];
        // La fila entera es tappable solo cuando no hay miembros (rankings por
        // animal / propietario). En equipos, cada miembro es su propio touchable,
        // así evitamos anidar TouchableOpacity (que rompe el tap en el device).
        const Row = tappable ? TouchableOpacity : View;
        return (
          <View key={i}>
            <Row
              {...(tappable ? { onPress: () => { if (onRowPress) onRowPress(fila); } } : {})}
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
                {!!secondary && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3, lineHeight: 16 }}>{secondary}</Text>}

                {/* Miembros del equipo / yunta — cada uno linkea a su pedigree */}
                {members.map((m, mi) => {
                  const name = decodeEntities(m.nombre || m.name);
                  const sub = decodeEntities(m.jinete || m.rider);
                  const mTappable = !!m.animalId;
                  return (
                    <TouchableOpacity
                      key={mi}
                      disabled={!mTappable}
                      onPress={() => { if (mTappable && onMemberPress) onMemberPress(m); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: t.border }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.text }} numberOfLines={1}>{name || '—'}</Text>
                        {!!sub && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 1 }} numberOfLines={1}>{sub}</Text>}
                      </View>
                      {mTappable && <Icon name="arrow" size={12} color={t.textDim} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {tappable && <Icon name="arrow" size={14} color={t.textDim} />}
            </Row>
            {i < filas.length - 1 && <Divider t={t} />}
          </View>
        );
      })}
    </View>
  );
}
