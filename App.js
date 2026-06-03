import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';

import { getTheme, withAlpha, HORSE_HEAD } from './src/theme';
import { Icon } from './src/components';
import { LiveProvider, useLive } from './src/LiveContext';
import HomeScreen from './src/screens/HomeScreen';
import EventsScreen from './src/screens/EventsScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import PedigreeScreen from './src/screens/PedigreeScreen';
import HorseDetailScreen from './src/screens/HorseDetailScreen';
import RankingsScreen from './src/screens/RankingsScreen';
import RankingCatScreen from './src/screens/RankingCatScreen';
import NewsDetailScreen from './src/screens/NewsDetailScreen';
import NewsScreen from './src/screens/NewsScreen';

// ── Theme context ────────────────────────────────────────────────
const PALETTE = 'tabaco';
const MODE = 'light'; // 'light' | 'dark'
export const ThemeCtx = React.createContext(getTheme(PALETTE, MODE));
const useT = () => React.useContext(ThemeCtx);

const withT = (Comp) => (props) => {
  const t = useT();
  return <Comp {...props} t={t} />;
};

// Wrappers a nivel de módulo: si los llamáramos inline dentro del JSX del
// Stack.Navigator, cada render generaría un componente nuevo y los Screens
// se desmontarían perdiendo state (tab activa, acordeones, scroll, etc.).
const HomeT       = withT(HomeScreen);
const EventsT     = withT(EventsScreen);
const EventT      = withT(EventDetailScreen);
const PedigreeT   = withT(PedigreeScreen);
const HorseT      = withT(HorseDetailScreen);
const RankingsT   = withT(RankingsScreen);
const RankingCatT = withT(RankingCatScreen);
const NewsT       = withT(NewsDetailScreen);
const NewsListT   = withT(NewsScreen);

// ── Navigators ───────────────────────────────────────────────────
// Cada tab tiene su propio stack — así el footer (CustomTabBar) queda
// visible siempre y el back de un screen pusheado vuelve al inicial
// del stack de la tab. Para abrir EventDetail desde Home se navega con
// `navigate('EventosTab', { screen: 'EventDetail', params })` — eso
// cambia a la tab Eventos y empuja el detail; el back va a EventsScreen.
// HorseDetail dentro del EventosStack se abre como modal, así el detail
// del evento queda debajo sin desmontarse — preserva tab, scroll, etc.

const Tab = createBottomTabNavigator();
const InicioStackN = createNativeStackNavigator();
const EventosStackN = createNativeStackNavigator();
const PedigreeStackN = createNativeStackNavigator();
const RankingsStackN = createNativeStackNavigator();

const stackOpts = (t) => ({ headerShown: false, contentStyle: { backgroundColor: t.bg } });

function InicioStack() {
  const t = useT();
  return (
    <InicioStackN.Navigator screenOptions={stackOpts(t)}>
      <InicioStackN.Screen name="Home" component={HomeT} />
      <InicioStackN.Screen name="NewsList" component={NewsListT} />
      <InicioStackN.Screen
        name="NewsDetail"
        component={NewsT}
        getId={({ params }) => String(params?.id ?? '')}
      />
    </InicioStackN.Navigator>
  );
}

function EventosStack() {
  const t = useT();
  return (
    <EventosStackN.Navigator screenOptions={stackOpts(t)}>
      <EventosStackN.Screen name="EventsList" component={EventsT} />
      <EventosStackN.Screen
        name="EventDetail"
        component={EventT}
        getId={({ params }) => String(params?.id ?? '')}
      />
      <EventosStackN.Screen
        name="HorseDetail"
        component={HorseT}
        options={{ presentation: 'modal' }}
      />
    </EventosStackN.Navigator>
  );
}

function PedigreeStack() {
  const t = useT();
  return (
    <PedigreeStackN.Navigator screenOptions={stackOpts(t)}>
      <PedigreeStackN.Screen name="PedigreeSearch" component={PedigreeT} />
      <PedigreeStackN.Screen name="HorseDetail" component={HorseT} />
    </PedigreeStackN.Navigator>
  );
}

function RankingsStack() {
  const t = useT();
  return (
    <RankingsStackN.Navigator screenOptions={stackOpts(t)}>
      <RankingsStackN.Screen name="RankingsList" component={RankingsT} />
      <RankingsStackN.Screen name="RankingCat" component={RankingCatT} />
    </RankingsStackN.Navigator>
  );
}

function CustomTabBar({ state, navigation }) {
  const t = useT();
  const { live } = useLive();
  const hasLive = !!live;
  const tabs = [
    { name: 'InicioTab', icon: 'home', label: 'Inicio' },
    { name: 'EventosTab', icon: 'calendar', label: 'Eventos' },
    // El botón EN VIVO sólo existe cuando hay una transmisión activa. Si no,
    // la pill se reparte entre las 4 tabs normales con `space-around`.
    ...(hasLive ? [{ center: true }] : []),
    { name: 'PedigreeTab', icon: 'tree', label: 'Pedigree' },
    { name: 'RankingsTab', icon: 'rank', label: 'Rankings' },
  ];
  const routeIndexByName = {};
  state.routes.forEach((r, i) => { routeIndexByName[r.name] = i; });

  // Al tappear una tab, reseteamos su stack child al screen inicial. Es la
  // forma fiable de garantizar que no veas un screen colgado del flujo
  // anterior (ej. EventDetail después de haber entrado desde la home).
  // Re-armamos el state del Tab Navigator preservando los stacks de las
  // OTRAS tabs y solo reescribiendo el de la tab destino.
  const INITIAL_SCREEN = {
    InicioTab: 'Home',
    EventosTab: 'EventsList',
    PedigreeTab: 'PedigreeSearch',
    RankingsTab: 'RankingsList',
  };

  const goToTab = (tabName) => {
    const initial = INITIAL_SCREEN[tabName];
    const targetIdx = routeIndexByName[tabName];
    if (targetIdx == null || !initial) {
      navigation.navigate(tabName);
      return;
    }
    const routes = state.routes.map((r) =>
      r.name === tabName
        ? { name: tabName, state: { index: 0, routes: [{ name: initial }] } }
        : (r.state ? { name: r.name, state: r.state } : { name: r.name })
    );
    navigation.dispatch(CommonActions.reset({ index: targetIdx, routes }));
  };

  // Para abrir el EventDetail del vivo desde el footer, reescribimos el state
  // de EventosTab a [EventsList, EventDetail(liveId)]. Mismo motivo que en
  // HomeScreen: `navigate('EventosTab', { screen: 'EventDetail', params })`
  // no fuerza re-render si ya hay un EventDetail con otro id en el stack.
  const onLivePress = () => {
    if (!hasLive) {
      goToTab('EventosTab');
      return;
    }
    const eventosIdx = routeIndexByName['EventosTab'];
    if (eventosIdx == null) return;
    const routes = state.routes.map((r) =>
      r.name === 'EventosTab'
        ? {
            name: 'EventosTab',
            state: {
              index: 1,
              routes: [
                { name: 'EventsList' },
                { name: 'EventDetail', params: { id: live.evento.id } },
              ],
            },
          }
        : (r.state ? { name: r.name, state: r.state } : { name: r.name })
    );
    navigation.dispatch(CommonActions.reset({ index: eventosIdx, routes }));
  };

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 22, paddingTop: 8, backgroundColor: t.bg }}>
      <View style={{ marginHorizontal: 12, height: 64, borderRadius: 22, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        {tabs.map((tab, i) => {
          if (tab.center) {
            const bg = hasLive ? t.live : t.surface2;
            const fg = hasLive ? '#fff' : t.textMute;
            return (
              <TouchableOpacity key="center" onPress={onLivePress} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: bg, borderWidth: 3, borderColor: t.bg, alignItems: 'center', justifyContent: 'center', top: -22 }}>
                <Icon name="tv" size={20} color={fg} stroke={2} />
                <Text style={{ fontSize: 8.5, fontFamily: 'Roboto_700Bold', color: fg, marginTop: 2, letterSpacing: 0.5 }}>EN VIVO</Text>
              </TouchableOpacity>
            );
          }
          const idx = routeIndexByName[tab.name];
          const focused = state.index === idx;
          return (
            <TouchableOpacity key={tab.name} onPress={() => goToTab(tab.name)} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
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
      <Tab.Screen name="InicioTab"   component={InicioStack} />
      <Tab.Screen name="EventosTab"  component={EventosStack} />
      <Tab.Screen name="PedigreeTab" component={PedigreeStack} />
      <Tab.Screen name="RankingsTab" component={RankingsStack} />
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
        <LiveProvider>
          <StatusBar barStyle={MODE === 'dark' ? 'light-content' : 'dark-content'} />
          <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
            <NavigationContainer theme={navTheme}>
              <Tabs />
            </NavigationContainer>
          </SafeAreaView>
        </LiveProvider>
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}
