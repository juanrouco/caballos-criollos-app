import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';

import { getTheme, withAlpha, HORSE_HEAD } from './src/theme';
import { Icon } from './src/components';
import HomeScreen from './src/screens/HomeScreen';
import EventsScreen from './src/screens/EventsScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import PedigreeScreen from './src/screens/PedigreeScreen';
import HorseDetailScreen from './src/screens/HorseDetailScreen';
import RankingsScreen from './src/screens/RankingsScreen';
import RankingCatScreen from './src/screens/RankingCatScreen';

// ── Theme context ────────────────────────────────────────────────
// Toggle PALETTE / MODE here to switch the whole app (the prototype's "Tweaks").
const PALETTE = 'tabaco';
const MODE = 'light'; // 'light' | 'dark'
export const ThemeCtx = React.createContext(getTheme(PALETTE, MODE));
const useT = () => React.useContext(ThemeCtx);

// inject theme prop into a screen
const withT = (Comp) => (props) => {
  const t = useT();
  return <Comp {...props} t={t} />;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomTabBar({ state, navigation }) {
  const t = useT();
  const tabs = [
    { name: 'InicioTab', icon: 'home', label: 'Inicio' },
    { name: 'EventosTab', icon: 'calendar', label: 'Eventos' },
    { center: true },
    { name: 'PedigreeTab', icon: 'tree', label: 'Pedigree' },
    { name: 'RankingsTab', icon: 'rank', label: 'Rankings' },
  ];
  const routeIndexByName = {};
  state.routes.forEach((r, i) => { routeIndexByName[r.name] = i; });

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 22, paddingTop: 8, backgroundColor: t.bg }}>
      <View style={{ marginHorizontal: 12, height: 64, borderRadius: 22, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        {tabs.map((tab, i) => {
          if (tab.center) {
            return (
              <TouchableOpacity key="center" onPress={() => navigation.navigate('EventosTab')} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.accent, borderWidth: 3, borderColor: t.bg, alignItems: 'center', justifyContent: 'center', top: -22 }}>
                <Icon name="tv" size={20} color={t.bg} stroke={2} />
                <Text style={{ fontSize: 8.5, fontFamily: 'Roboto_700Bold', color: t.bg, marginTop: 2, letterSpacing: 0.5 }}>EN VIVO</Text>
              </TouchableOpacity>
            );
          }
          const idx = routeIndexByName[tab.name];
          const focused = state.index === idx;
          return (
            <TouchableOpacity key={tab.name} onPress={() => navigation.navigate(tab.name)} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <Icon name={tab.icon} size={20} color={focused ? t.accent : t.textMute} stroke={focused ? 2 : 1.7} />
              <Text style={{ fontSize: 10, fontFamily: focused ? 'Roboto_700Bold' : 'Roboto_500Medium', color: focused ? t.accent : t.textMute }}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Tabs() {
  const t = useT();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: t.bg } }}
    >
      <Tab.Screen name="InicioTab" component={withT(HomeScreen)} />
      <Tab.Screen name="EventosTab" component={withT(EventsScreen)} />
      <Tab.Screen name="PedigreeTab" component={withT(PedigreeScreen)} />
      <Tab.Screen name="RankingsTab" component={withT(RankingsScreen)} />
    </Tab.Navigator>
  );
}

export default function App() {
  const t = getTheme(PALETTE, MODE);
  const [fontsLoaded] = useFonts({
    Roboto_400Regular, Roboto_500Medium, Roboto_700Bold,
    InterTight_600SemiBold, InterTight_700Bold,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const navTheme = MODE === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: t.bg } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: t.bg } };

  return (
    <SafeAreaProvider>
      <ThemeCtx.Provider value={t}>
        <StatusBar barStyle={MODE === 'dark' ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
              <Stack.Screen name="Tabs" component={Tabs} />
              <Stack.Screen name="EventDetail" component={withT(EventDetailScreen)} />
              <Stack.Screen name="HorseDetail" component={withT(HorseDetailScreen)} />
              <Stack.Screen name="RankingCat" component={withT(RankingCatScreen)} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}
