jest.mock('@react-navigation/native', () => {
  const navigationRef = {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
    dispatch: jest.fn(),
  };
  return { createNavigationContainerRef: jest.fn(() => navigationRef) };
});

const { navigationRef, navigateOnNotificationTap } = require('../src/navigation');

beforeEach(() => {
  navigationRef.navigate.mockClear();
  navigationRef.isReady.mockReturnValue(true);
});

describe('navigateOnNotificationTap', () => {
  test('kind=vivo navega a EventosTab → EventDetail con evento_id', () => {
    navigateOnNotificationTap({ kind: 'vivo', evento_id: 2057 });
    expect(navigationRef.navigate).toHaveBeenCalledWith('EventosTab', {
      screen: 'EventDetail',
      params: { id: 2057 },
    });
  });

  test('kind=evento usa data.id como fallback', () => {
    navigateOnNotificationTap({ kind: 'evento', id: 999 });
    expect(navigationRef.navigate).toHaveBeenCalledWith('EventosTab', {
      screen: 'EventDetail',
      params: { id: 999 },
    });
  });

  test('kind=noticia navega a InicioTab → NewsDetail con id + tag', () => {
    navigateOnNotificationTap({ kind: 'noticia', id: 42, tag: 'Remates' });
    expect(navigationRef.navigate).toHaveBeenCalledWith('InicioTab', {
      screen: 'NewsDetail',
      params: { id: 42, tag: 'Remates' },
    });
  });

  test('kind=ranking navega al RankingsTab', () => {
    navigateOnNotificationTap({ kind: 'ranking' });
    expect(navigationRef.navigate).toHaveBeenCalledWith('RankingsTab');
  });

  test('kind desconocido cae al InicioTab', () => {
    navigateOnNotificationTap({ kind: 'algo_nuevo', id: 1 });
    expect(navigationRef.navigate).toHaveBeenCalledWith('InicioTab');
  });

  test('sin id ni evento_id no dispara nada', () => {
    navigateOnNotificationTap({ kind: 'evento' });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  test('data null / undefined es no-op', () => {
    navigateOnNotificationTap(undefined);
    navigateOnNotificationTap(null);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  test('si el nav no está ready, reintenta — pero no dispara aún', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    try {
      navigationRef.isReady.mockReturnValue(false);
      navigateOnNotificationTap({ kind: 'vivo', evento_id: 5 });
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      jest.advanceTimersByTime(150);
      expect(navigationRef.navigate).not.toHaveBeenCalled();
      navigationRef.isReady.mockReturnValue(true);
      jest.advanceTimersByTime(150);
      expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
