import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';

jest.mock('../src/api', () => ({
  fetchVivos: jest.fn(),
}));

const { fetchVivos } = require('../src/api');
const { LiveProvider, useLive } = require('../src/LiveContext');

function Probe() {
  const { live } = useLive();
  return <Text testID="probe">{live ? live.titulo : 'null'}</Text>;
}

const flushPromises = () => new Promise((res) => process.nextTick(res));

beforeEach(() => {
  fetchVivos.mockReset();
});

describe('LiveProvider', () => {
  test('hace un fetch inicial al montar y expone el primer vivo', async () => {
    fetchVivos.mockResolvedValueOnce({ data: [{ id: 1, titulo: 'EN VIVO 1' }] });
    const { getByTestId } = render(<LiveProvider><Probe /></LiveProvider>);
    await waitFor(() => expect(getByTestId('probe').children[0]).toBe('EN VIVO 1'));
    expect(fetchVivos).toHaveBeenCalledWith({ estado: 'en_vivo', limit: 1 });
    expect(fetchVivos).toHaveBeenCalledTimes(1);
  });

  test('si data viene vacío, live queda null', async () => {
    fetchVivos.mockResolvedValueOnce({ data: [] });
    const { getByTestId } = render(<LiveProvider><Probe /></LiveProvider>);
    await waitFor(() => expect(getByTestId('probe').children[0]).toBe('null'));
  });

  test('si fetch falla, mantiene el último estado conocido', async () => {
    fetchVivos
      .mockResolvedValueOnce({ data: [{ id: 1, titulo: 'PRIMERO' }] })
      .mockRejectedValueOnce(new Error('boom'));
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      const { getByTestId } = render(<LiveProvider><Probe /></LiveProvider>);
      await waitFor(() => expect(getByTestId('probe').children[0]).toBe('PRIMERO'));
      await act(async () => { jest.advanceTimersByTime(60_000); await flushPromises(); });
      expect(fetchVivos).toHaveBeenCalledTimes(2);
      expect(getByTestId('probe').children[0]).toBe('PRIMERO');
    } finally {
      jest.useRealTimers();
    }
  });

  test('hace polling cada 60s', async () => {
    fetchVivos.mockResolvedValue({ data: [{ id: 1, titulo: 'X' }] });
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      render(<LiveProvider><Probe /></LiveProvider>);
      await act(async () => { await flushPromises(); });
      expect(fetchVivos).toHaveBeenCalledTimes(1);
      await act(async () => { jest.advanceTimersByTime(60_000); await flushPromises(); });
      expect(fetchVivos).toHaveBeenCalledTimes(2);
      await act(async () => { jest.advanceTimersByTime(60_000); await flushPromises(); });
      expect(fetchVivos).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
