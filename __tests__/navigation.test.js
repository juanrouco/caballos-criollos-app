// Stub del state del root navigator (Tabs) — el orden importa porque
// `resetTabToDetail` busca el índice de la tab para el CommonActions.reset.
const ROOT_STATE = {
  index: 0,
  routes: [
    { name: 'InicioTab' },
    { name: 'EventosTab', state: { index: 1, routes: [{ name: 'EventsList' }, { name: 'EventDetail', params: { id: 111 } }] } },
    { name: 'PedigreeTab' },
    { name: 'RankingsTab' },
  ],
};

jest.mock('@react-navigation/native', () => {
  const navigationRef = {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getRootState: jest.fn(() => ROOT_STATE),
  };
  return {
    createNavigationContainerRef: jest.fn(() => navigationRef),
    CommonActions: { reset: jest.fn((cfg) => ({ type: 'RESET', payload: cfg })) },
  };
});

const { CommonActions } = require('@react-navigation/native');
const { navigationRef, navigateOnNotificationTap } = require('../src/navigation');

beforeEach(() => {
  navigationRef.navigate.mockClear();
  navigationRef.dispatch.mockClear();
  navigationRef.isReady.mockReturnValue(true);
  navigationRef.getRootState.mockReturnValue(ROOT_STATE);
  CommonActions.reset.mockClear();
});

describe('navigateOnNotificationTap', () => {
  test('kind=vivo: reescribe EventosTab a [EventsList, EventDetail(id)] vía reset', () => {
    navigateOnNotificationTap({ kind: 'vivo', evento_id: 2057 });
    expect(CommonActions.reset).toHaveBeenCalledTimes(1);
    const cfg = CommonActions.reset.mock.calls[0][0];
    expect(cfg.index).toBe(1); // EventosTab está en el índice 1 del root
    const eventosRoute = cfg.routes[1];
    expect(eventosRoute.name).toBe('EventosTab');
    expect(eventosRoute.state).toEqual({
      index: 1,
      routes: [
        { name: 'EventsList' },
        { name: 'EventDetail', params: { id: 2057, from: 'home' } },
      ],
    });
    expect(navigationRef.dispatch).toHaveBeenCalledWith({ type: 'RESET', payload: cfg });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  test('kind=evento usa data.id como fallback y resetea EventosTab', () => {
    navigateOnNotificationTap({ kind: 'evento', id: 999 });
    const cfg = CommonActions.reset.mock.calls[0][0];
    expect(cfg.routes[1].state.routes[1]).toEqual({ name: 'EventDetail', params: { id: 999, from: 'home' } });
  });

  test('preserva el state interno de las otras tabs al resetear', () => {
    navigateOnNotificationTap({ kind: 'evento', id: 1 });
    const cfg = CommonActions.reset.mock.calls[0][0];
    // Las tabs que no son EventosTab no llevan state (las que tenían no lo
    // tenían en el ROOT_STATE, pero verificamos shape).
    expect(cfg.routes.map((r) => r.name)).toEqual(['InicioTab', 'EventosTab', 'PedigreeTab', 'RankingsTab']);
  });

  test('kind=noticia resetea InicioTab a [Home, NewsDetail(id, tag)]', () => {
    navigateOnNotificationTap({ kind: 'noticia', id: 42, tag: 'Remates' });
    const cfg = CommonActions.reset.mock.calls[0][0];
    expect(cfg.index).toBe(0); // InicioTab está en el índice 0
    const inicioRoute = cfg.routes[0];
    expect(inicioRoute.state).toEqual({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: 'NewsDetail', params: { id: 42, tag: 'Remates' } },
      ],
    });
  });

  test('kind=ranking navega al RankingsTab (sin reset, no hay deeplink a id)', () => {
    navigateOnNotificationTap({ kind: 'ranking' });
    expect(navigationRef.navigate).toHaveBeenCalledWith('RankingsTab');
    expect(CommonActions.reset).not.toHaveBeenCalled();
  });

  test('kind desconocido cae al InicioTab', () => {
    navigateOnNotificationTap({ kind: 'algo_nuevo', id: 1 });
    expect(navigationRef.navigate).toHaveBeenCalledWith('InicioTab');
    expect(CommonActions.reset).not.toHaveBeenCalled();
  });

  test('sin id ni evento_id no dispara nada', () => {
    navigateOnNotificationTap({ kind: 'evento' });
    expect(navigationRef.dispatch).not.toHaveBeenCalled();
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  test('data null / undefined es no-op', () => {
    navigateOnNotificationTap(undefined);
    navigateOnNotificationTap(null);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(navigationRef.dispatch).not.toHaveBeenCalled();
  });

  test('si la tab no está en el root state, fallback a navigate (no rompe)', () => {
    navigationRef.getRootState.mockReturnValueOnce({
      index: 0,
      routes: [{ name: 'InicioTab' }], // no hay EventosTab
    });
    navigateOnNotificationTap({ kind: 'evento', id: 5 });
    expect(CommonActions.reset).not.toHaveBeenCalled();
    expect(navigationRef.navigate).toHaveBeenCalledWith('EventosTab', {
      screen: 'EventDetail',
      params: { id: 5, from: 'home' },
    });
  });

  test('si el nav no está ready, reintenta — pero no dispara aún', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      navigationRef.isReady.mockReturnValue(false);
      navigateOnNotificationTap({ kind: 'vivo', evento_id: 5 });
      expect(navigationRef.dispatch).not.toHaveBeenCalled();
      jest.advanceTimersByTime(150);
      expect(navigationRef.dispatch).not.toHaveBeenCalled();
      navigationRef.isReady.mockReturnValue(true);
      jest.advanceTimersByTime(150);
      expect(navigationRef.dispatch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
