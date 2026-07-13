// Helpers para tests de screens: theme y navigation stubs.

import { getTheme } from '../src/theme';

export const T = getTheme('tabaco', 'light');

export function navStub(overrides = {}) {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(() => null),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    ...overrides,
  };
}

export function routeStub(params = {}) {
  return { params };
}

export const flushPromises = () => new Promise((res) => process.nextTick(res));
