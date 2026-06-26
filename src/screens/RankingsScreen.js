import React from 'react';
import { View, Text } from 'react-native';
import { Icon, F } from '../components';

// Rankings deshabilitado por ahora: el diseño original (Premio Solanet +
// rankings por disciplina) queda en el historial; mientras tanto mostramos
// solo un empty-state. RankingCatScreen y los datos siguen registrados para
// reactivarlo sin rehacer nada.
export default function RankingsScreen({ t }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 110 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="trophy" size={32} color={t.textMute} stroke={2} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text, textAlign: 'center', lineHeight: 28 }}>
        Próximamente los rankings estarán disponibles
      </Text>
    </View>
  );
}
