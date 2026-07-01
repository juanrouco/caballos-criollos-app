import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon, Divider, F } from '../components';
import { decodeEntities } from '../api';

// Tabla genérica de ranking en fila compacta: posición (si la hay) + entidad
// principal + puntaje, con las columnas secundarias debajo. Reutilizada por el
// detalle de ranking y por el detalle de propietario (Solanet).
//
// `isTappable(fila)` y `onRowPress(fila)` los define cada pantalla (ej. abrir el
// pedigree del animal, o el detalle del propietario).
export default function RankingTable({ t, columnas = [], filas = [], onRowPress, isTappable }) {
  const primaryKey = columnas.find((c) => c.key === 'animal') ? 'animal'
    : columnas.find((c) => c.key === 'name') ? 'name'
    : (columnas.find((c) => c.key !== 'position' && c.key !== 'points')?.key || null);
  const hasPosition = columnas.some((c) => c.key === 'position');
  const secondaryCols = columnas.filter((c) => !['position', 'points', primaryKey].includes(c.key));

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
        return (
          <View key={i}>
            <TouchableOpacity
              disabled={!tappable}
              onPress={() => { if (tappable && onRowPress) onRowPress(fila); }}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 }}
            >
              {hasPosition && (
                <Text style={{ width: 30, textAlign: 'center', fontFamily: F.display, fontSize: 18, color: isTop ? t.accent : t.textMute }}>{fila.position}</Text>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15.5, color: t.text }} numberOfLines={1}>{(primaryKey && decodeEntities(fila[primaryKey])) || '—'}</Text>
                  {fila.points != null && (
                    <Text style={{ fontFamily: F.mono, fontSize: 15, color: isTop ? t.accent : t.text }}>{fila.points}</Text>
                  )}
                </View>
                {!!secondary && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 3, lineHeight: 16 }}>{secondary}</Text>}
              </View>
              {tappable && <Icon name="arrow" size={14} color={t.textDim} />}
            </TouchableOpacity>
            {i < filas.length - 1 && <Divider t={t} />}
          </View>
        );
      })}
    </View>
  );
}
