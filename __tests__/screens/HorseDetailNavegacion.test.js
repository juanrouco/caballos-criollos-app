// Encadenar ancestros contra un stack **de verdad**, no contra un stub: lo que
// se prueba acá es justamente lo que un `navigation` fingido no puede mostrar
// —que cada salto apila una pantalla y que el back desarma la cadena de a uno—
// porque HorseDetail no declara `getId` en ningún stack y `navigate` a la
// pantalla en la que ya estás sólo le cambiaría los params.
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

jest.mock('../../src/api', () => ({
  fetchAnimalPedigree: jest.fn(),
  mapAnimalPedigree: jest.requireActual('../../src/api/animales').mapAnimalPedigree,
  fetchMeritosAnimal: jest.fn(),
  mapMerito: jest.requireActual('../../src/api/animales').mapMerito,
  meritosPorTemporada: jest.requireActual('../../src/api/animales').meritosPorTemporada,
}));
const { fetchAnimalPedigree, fetchMeritosAnimal } = require('../../src/api');
const HorseDetailScreen = require('../../src/screens/HorseDetailScreen').default;
const { T } = require('../helpers');

beforeEach(() => { fetchMeritosAnimal.mockResolvedValue({ data: [] }); });

const Stack = createNativeStackNavigator();
const HorseT = (props) => <HorseDetailScreen {...props} t={T} />;

// Tres animales en línea recta: hijo → padre → abuelo. Ids únicos por test
// porque el `animalCache` de la pantalla vive a nivel módulo.
const LINAJE = {
  'pdre:chain-1': {
    animal: { id: 'pdre:chain-1', nombre: 'EL HIJO', sexo: 'M' },
    pedigree: { padre: { id: 'pdre:chain-2', nombre: 'EL PADRE', sexo: 'M' }, madre: null },
  },
  'pdre:chain-2': {
    animal: { id: 'pdre:chain-2', nombre: 'EL PADRE', sexo: 'M' },
    pedigree: { padre: { id: 'pdre:chain-3', nombre: 'EL ABUELO', sexo: 'M' }, madre: null },
  },
  'pdre:chain-3': {
    animal: { id: 'pdre:chain-3', nombre: 'EL ABUELO', sexo: 'M' },
    pedigree: { padre: null, madre: null },
  },
};

function Buscador({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: 'pdre:chain-1' })}>
      <Text>Abrir el hijo</Text>
    </TouchableOpacity>
  );
}

describe('HorseDetail · encadenar ancestros y volver', () => {
  test('dos saltos hacia arriba y el back vuelve por donde vino', async () => {
    fetchAnimalPedigree.mockImplementation((id) =>
      LINAJE[id] ? Promise.resolve(LINAJE[id]) : Promise.reject(new Error('no existe')));
    const ref = createNavigationContainerRef();
    const { findByText, getByText } = render(
      <NavigationContainer ref={ref}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PedigreeSearch" component={Buscador} />
          <Stack.Screen name="HorseDetail" component={HorseT} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    fireEvent.press(await findByText('Abrir el hijo'));
    await findByText('EL HIJO');

    // Salto 1: el hijo → su padre. El nodo del árbol y el título del padre se
    // llaman igual, así que vamos por el label del nodo tocable.
    fireEvent.press(getByText('EL PADRE'));
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:chain-2'));
    expect(ref.getRootState().routes.map((r) => r.name))
      .toEqual(['PedigreeSearch', 'HorseDetail', 'HorseDetail']);

    // Salto 2: el padre → el abuelo.
    fireEvent.press(await findByText('EL ABUELO'));
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:chain-3'));
    expect(ref.getRootState().routes).toHaveLength(4);

    // Y el back desarma la cadena de a un salto, en orden.
    ref.goBack();
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:chain-2'));
    ref.goBack();
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:chain-1'));
    ref.goBack();
    await waitFor(() => expect(ref.getCurrentRoute().name).toBe('PedigreeSearch'));
  });

  test('volver a un animal ya visto no vuelve a pedirlo a la API', async () => {
    // El cache por id es lo que hace que el back no muestre spinner ni refetch.
    // Ids propios de este test: el `animalCache` vive a nivel módulo y el test
    // de arriba ya dejó los `chain-N` adentro.
    const arbol = {
      'pdre:vuelta-1': {
        animal: { id: 'pdre:vuelta-1', nombre: 'VUELTA HIJO', sexo: 'M' },
        pedigree: { padre: { id: 'pdre:vuelta-2', nombre: 'VUELTA PADRE', sexo: 'M' }, madre: null },
      },
      'pdre:vuelta-2': {
        animal: { id: 'pdre:vuelta-2', nombre: 'VUELTA PADRE', sexo: 'M' },
        pedigree: { padre: null, madre: null },
      },
    };
    const vistos = [];
    fetchAnimalPedigree.mockImplementation((id) => {
      vistos.push(id);
      return arbol[id] ? Promise.resolve(arbol[id]) : Promise.reject(new Error('no existe'));
    });
    const Raiz = ({ navigation }) => (
      <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: 'pdre:vuelta-1' })}>
        <Text>Abrir</Text>
      </TouchableOpacity>
    );
    const ref = createNavigationContainerRef();
    const { findByText, getByText } = render(
      <NavigationContainer ref={ref}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PedigreeSearch" component={Raiz} />
          <Stack.Screen name="HorseDetail" component={HorseT} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    fireEvent.press(await findByText('Abrir'));
    await findByText('VUELTA HIJO');
    fireEvent.press(getByText('VUELTA PADRE'));
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:vuelta-2'));
    ref.goBack();
    await waitFor(() => expect(ref.getCurrentRoute().params.id).toBe('pdre:vuelta-1'));
    // El hijo se pidió una sola vez, aunque se volvió a él.
    expect(vistos.filter((id) => id === 'pdre:vuelta-1')).toHaveLength(1);
  });
});
