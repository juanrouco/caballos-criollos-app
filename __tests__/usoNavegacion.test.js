// El registro de navegación contra un NavigationContainer **de verdad**, con la
// misma forma que arma App.js: un Stack cuyo root es `Tabs`, cuatro tabs y cada
// tab con su propio stack adentro.
//
// Existe porque el otro test (uso.test.js) finge la ref a mano, y una ref
// fingida puede tener la forma equivocada sin que nadie se entere: así se colaba
// que la tab se leyera del root state —que es el del Stack, no el del tab bar—
// y terminara contando `Tabs` y `EventDetail` en vez de `EventosTab`.
import React from 'react';
import { Text, View } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

jest.mock('../src/api', () => ({
  __esModule: true,
  USO_PATH: '/uso',
  enviarUso: jest.fn(() => Promise.resolve({ aceptados: 1, descartados: [] })),
  observarErroresHttp: jest.fn(() => () => {}),
}));
jest.mock('expo-application', () => ({ __esModule: true, nativeApplicationVersion: '2.0.1' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2.0.1' } } }));

import { enviarUso } from '../src/api';
import { registrarNavegacion, enviarUsoPendiente, reiniciarUso } from '../src/uso';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Vacia = () => <View><Text>pantalla</Text></View>;

// Los componentes de cada tab se arman **una sola vez**, a nivel de módulo: si
// se crearan dentro del render de `Tabs`, cada render daría un componente nuevo
// y React remontaría el navegador en loop.
const stackDe = (pantalla) => function TabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={pantalla} component={Vacia} />
    </Stack.Navigator>
  );
};

const InicioStack = stackDe('Home');
const EventosStack = stackDe('Eventos');
const PedigreeStack = stackDe('Pedigree');
const RankingsStack = stackDe('Rankings');

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="InicioTab" component={InicioStack} />
      <Tab.Screen name="EventosTab" component={EventosStack} />
      <Tab.Screen name="PedigreeTab" component={PedigreeStack} />
      <Tab.Screen name="RankingsTab" component={RankingsStack} />
    </Tab.Navigator>
  );
}

// Monta la navegación y devuelve la ref, ya con la pantalla inicial contada
// (eso es lo que hace el `onReady` de App.js).
function montar() {
  const ref = createNavigationContainerRef();
  render(
    <NavigationContainer ref={ref} onStateChange={() => registrarNavegacion(ref)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="EventDetail" component={Vacia} />
        <Stack.Screen name="HorseDetail" component={Vacia} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  registrarNavegacion(ref);
  return ref;
}

const enviados = async () => {
  await enviarUsoPendiente();
  return enviarUso.mock.calls[enviarUso.mock.calls.length - 1][0].eventos;
};

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarUso();
});

test('la tab que se cuenta es la del tab bar, no el route del Stack', async () => {
  const ref = montar();
  await act(async () => { ref.navigate('RankingsTab'); });

  const evs = await enviados();
  expect(evs.filter((e) => e.que === 'tab').map((e) => e.cual))
    .toEqual(['InicioTab', 'RankingsTab']);
  // Lo que se contaba antes del arreglo.
  expect(evs.some((e) => e.que === 'tab' && e.cual === 'Tabs')).toBe(false);
});

test('las pantallas de adentro de cada tab se cuentan por su nombre', async () => {
  const ref = montar();
  await act(async () => { ref.navigate('PedigreeTab'); });

  const evs = await enviados();
  expect(evs.filter((e) => e.que === 'pantalla').map((e) => e.cual))
    .toEqual(['Home', 'Pedigree']);
});

test('una pantalla pusheada va como pantalla con su id y no como tab', async () => {
  const ref = montar();
  await act(async () => { ref.navigate('EventosTab'); });
  await act(async () => { ref.navigate('EventDetail', { id: 2276 }); });
  await act(async () => { ref.navigate('HorseDetail', { id: 'pdre:119914' }); });

  const evs = await enviados();
  expect(evs.filter((e) => e.que === 'tab').map((e) => e.cual))
    .toEqual(['InicioTab', 'EventosTab']);
  expect(evs.filter((e) => e.que === 'pantalla' && e.cual === 'EventDetail'))
    .toEqual([expect.objectContaining({ id: 2276 })]);
  expect(evs.filter((e) => e.que === 'pantalla' && e.cual === 'HorseDetail'))
    .toEqual([expect.objectContaining({ id: 'pdre:119914' })]);
});

test('volver de la pantalla pusheada no vuelve a contar la tab', async () => {
  const ref = montar();
  await act(async () => { ref.navigate('EventDetail', { id: 2276 }); });
  await act(async () => { ref.goBack(); });

  const evs = await enviados();
  expect(evs.filter((e) => e.que === 'tab')).toHaveLength(1);
});
