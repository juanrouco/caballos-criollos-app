import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { MenuProvider, useMenu } from '../src/MenuContext';
import { MenuLayer } from '../src/SideMenu';
import { T } from './helpers';

// Botón para abrir el menú desde afuera del MenuLayer (simula la hamburguesa).
function Harness() {
  const { openMenu } = useMenu();
  return (
    <>
      <TouchableOpacity onPress={openMenu}><Text>ABRIR</Text></TouchableOpacity>
      <MenuLayer t={T} />
    </>
  );
}

const renderMenu = () => render(<MenuProvider><Harness /></MenuProvider>);

describe('MenuLayer / drawer', () => {
  test('cerrado no muestra las secciones', () => {
    const { queryByText } = renderMenu();
    expect(queryByText('Reglamentos')).toBeNull();
    expect(queryByText('Mapa ACCC')).toBeNull();
  });

  test('al abrir el menú lista las 3 secciones', () => {
    const { getByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    expect(getByText('Reglamentos')).toBeTruthy();
    expect(getByText('Mapa ACCC')).toBeTruthy();
    expect(getByText('Presencia Institucional')).toBeTruthy();
  });

  test('tocar una sección abre su pantalla (placeholder "Próximamente")', () => {
    const { getByText, queryByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    expect(queryByText('Próximamente disponible')).toBeNull();
    fireEvent.press(getByText('Mapa ACCC'));
    expect(getByText('Próximamente disponible')).toBeTruthy();
  });
});
