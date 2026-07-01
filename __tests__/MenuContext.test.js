import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { MenuProvider, useMenu } from '../src/MenuContext';

function Probe() {
  const { menuOpen, section, openMenu, closeMenu, openSection, closeSection } = useMenu();
  return (
    <>
      <Text>{`open:${menuOpen}`}</Text>
      <Text>{`section:${section}`}</Text>
      <TouchableOpacity onPress={openMenu}><Text>doOpen</Text></TouchableOpacity>
      <TouchableOpacity onPress={closeMenu}><Text>doClose</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => openSection('reglamentos')}><Text>doSection</Text></TouchableOpacity>
      <TouchableOpacity onPress={closeSection}><Text>doCloseSection</Text></TouchableOpacity>
    </>
  );
}

const renderProbe = () => render(<MenuProvider><Probe /></MenuProvider>);

describe('MenuContext', () => {
  test('openMenu / closeMenu alternan menuOpen', () => {
    const { getByText } = renderProbe();
    expect(getByText('open:false')).toBeTruthy();
    fireEvent.press(getByText('doOpen'));
    expect(getByText('open:true')).toBeTruthy();
    fireEvent.press(getByText('doClose'));
    expect(getByText('open:false')).toBeTruthy();
  });

  test('openSection abre la sección y cierra el drawer', () => {
    const { getByText } = renderProbe();
    fireEvent.press(getByText('doOpen'));
    expect(getByText('open:true')).toBeTruthy();
    fireEvent.press(getByText('doSection'));
    expect(getByText('section:reglamentos')).toBeTruthy();
    expect(getByText('open:false')).toBeTruthy();
  });

  test('closeSection limpia la sección', () => {
    const { getByText } = renderProbe();
    fireEvent.press(getByText('doSection'));
    expect(getByText('section:reglamentos')).toBeTruthy();
    fireEvent.press(getByText('doCloseSection'));
    expect(getByText('section:null')).toBeTruthy();
  });
});
