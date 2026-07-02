import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { MenuProvider, useMenu } from '../src/MenuContext';
import { MenuLayer } from '../src/SideMenu';
import { T } from './helpers';

// Botón para abrir el menú desde afuera del MenuLayer (simula la hamburguesa).
// Expone `menuOpen` como texto para poder assertir el cierre sin depender de la
// animación de desmontaje del drawer.
function Harness() {
  const { openMenu, menuOpen } = useMenu();
  return (
    <>
      <TouchableOpacity onPress={openMenu}><Text>ABRIR</Text></TouchableOpacity>
      <Text>{menuOpen ? 'MENU_OPEN' : 'MENU_CLOSED'}</Text>
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

  test('al abrir el menú lista los accesos a las tabs y las secciones', () => {
    const { getByText, queryByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    // Accesos a las tabs del footer
    expect(getByText('Inicio')).toBeTruthy();
    expect(getByText('Eventos')).toBeTruthy();
    expect(getByText('Pedigree')).toBeTruthy();
    expect(getByText('Rankings')).toBeTruthy();
    // Secciones propias
    expect(getByText('Reglamentos')).toBeTruthy();
    expect(getByText('Mapa ACCC')).toBeTruthy();
    // Presencia Institucional quitada por ahora
    expect(queryByText('Presencia Institucional')).toBeNull();
  });

  test('tocar un acceso de navegación cierra el menú', () => {
    const { getByText } = renderMenu();
    fireEvent.press(getByText('ABRIR'));
    expect(getByText('MENU_OPEN')).toBeTruthy();
    fireEvent.press(getByText('Inicio')); // navega a la tab (no-op sin nav) y cierra el menú
    expect(getByText('MENU_CLOSED')).toBeTruthy();
  });
});
