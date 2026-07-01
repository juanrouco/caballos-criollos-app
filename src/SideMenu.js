import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, Animated, ScrollView, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Crest, Divider, F } from './components';
import { withAlpha } from './theme';
import { useMenu } from './MenuContext';
import ReglamentosScreen from './screens/ReglamentosScreen';

// Secciones del menú lateral. Las que tienen `Component` renderizan su pantalla
// real; el resto muestra el placeholder (SectionView) hasta que se implementen.
export const SECTIONS = [
  { key: 'reglamentos',   label: 'Reglamentos',             icon: 'pdf',      Component: ReglamentosScreen },
  { key: 'mapa',          label: 'Mapa ACCC',               icon: 'pin' },
  { key: 'institucional', label: 'Presencia Institucional', icon: 'building' },
];

// Capa de overlay del menú: el drawer deslizante + la sección abierta. Se monta
// una sola vez en App.js, por encima de la navegación.
//
// Safe-area dentro de un Modal: iOS necesita `insets.top` (que leemos acá, bajo
// el SafeAreaProvider, y pasamos como prop porque adentro del Modal no da bien);
// Android, con Modal `statusBarTranslucent`, suele traer `insets.top = 0`, así
// que caemos a `StatusBar.currentHeight`.
export function MenuLayer({ t }) {
  const { menuOpen, section, closeMenu, openSection, closeSection } = useMenu();
  const insets = useSafeAreaInsets();
  const topInset = insets.top || StatusBar.currentHeight || 0;
  const active = SECTIONS.find((s) => s.key === section) || null;
  return (
    <>
      <MenuDrawer t={t} topInset={topInset} bottomInset={insets.bottom} open={menuOpen} onClose={closeMenu} onSelect={openSection} />
      <Modal visible={!!active} animationType="slide" statusBarTranslucent onRequestClose={closeSection}>
        {active && (active.Component
          ? <active.Component t={t} topInset={topInset} onBack={closeSection} />
          : <SectionView t={t} topInset={topInset} section={active} onBack={closeSection} />)}
      </Modal>
    </>
  );
}

function MenuDrawer({ t, topInset, bottomInset, open, onClose, onSelect }) {
  const { width } = useWindowDimensions();
  const PANEL = Math.min(340, Math.round(width * 0.84));
  const tx = React.useRef(new Animated.Value(-PANEL)).current;
  const fade = React.useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(tx,   { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(tx,   { toValue: -PANEL, duration: 190, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0,      duration: 190, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [open, PANEL]); // tx/fade son refs estables

  if (!rendered) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar menú" />
        </Animated.View>
        {/* Panel deslizante */}
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: PANEL, backgroundColor: t.bg, borderRightWidth: 1, borderRightColor: t.border, paddingTop: topInset, transform: [{ translateX: tx }] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Crest size={38} color={t.text} bg={t.surface} ring={withAlpha(t.accent, 0.4)} horse />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 17, color: t.text }} numberOfLines={1}>Caballos Criollos</Text>
              <Text style={{ fontFamily: F.body, fontSize: 9.5, color: t.textMute, letterSpacing: 1.6, marginTop: 3 }}>ASOC. CRIADORES · ACCC</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar menú" style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} color={t.textMute} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomInset + 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 4, marginTop: 6 }}>Secciones</Text>
            {SECTIONS.map((s, i) => (
              <View key={s.key}>
                <TouchableOpacity onPress={() => onSelect(s.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 15 }}>
                  <Icon name={s.icon} size={20} color={t.accent} />
                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: t.text }}>{s.label}</Text>
                </TouchableOpacity>
                {i < SECTIONS.length - 1 && <Divider t={t} />}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Pantalla de sección (placeholder). Cuando una sección tenga contenido real,
// se reemplaza este cuerpo por su componente propio (manteniendo el header).
function SectionView({ t, topInset, section, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }} numberOfLines={1}>{section.label}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name={section.icon} size={30} color={t.textMute} stroke={1.8} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text, textAlign: 'center', lineHeight: 28 }}>{section.label}</Text>
        <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginTop: 8 }}>Próximamente disponible</Text>
      </View>
    </View>
  );
}
