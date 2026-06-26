import React from 'react';
import { render } from '@testing-library/react-native';

const RankingsScreen = require('../../src/screens/RankingsScreen').default;
const { T, navStub } = require('../helpers');

describe('RankingsScreen', () => {
  test('muestra solo la leyenda de "próximamente"', () => {
    const { getByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(getByText('Próximamente los rankings estarán disponibles')).toBeTruthy();
  });

  test('ya no renderea el contenido viejo de rankings', () => {
    const { queryByText } = render(<RankingsScreen t={T} navigation={navStub()} />);
    expect(queryByText('Premio E. Solanet')).toBeNull();
    expect(queryByText('Por disciplina')).toBeNull();
    expect(queryByText('Rankings')).toBeNull();
  });
});
