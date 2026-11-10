import { renderHook } from '@testing-library/react-native';

jest.mock('../src/api', () => ({
  __esModule: true,
  USO_PATH: '/uso',
  enviarUso: jest.fn(() => Promise.resolve({ aceptados: 1, descartados: [] })),
  observarErroresHttp: jest.fn(() => () => {}),
}));

// `__esModule` para que el `import * as` de src/uso.js reciba ESTE objeto y
// no una copia: el test de la versión inválida lo muta.
jest.mock('expo-application', () => ({ __esModule: true, nativeApplicationVersion: '2.0.1' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2.0.1' } } }));

import { enviarUso, observarErroresHttp } from '../src/api';
import {
  registrarUso, registrarNavegacion, enviarUsoPendiente, reiniciarUso,
  cuandoAhora, versionApp, useUso, usoPendientes,
} from '../src/uso';

const Application = require('expo-application');
const Constants = require('expo-constants').default;

// Deja correr las microtasks pendientes (el envío en vuelo).
const asentar = () => new Promise((r) => setTimeout(r, 0));

// El último cuerpo que se mandó a /uso.
const ultimoLote = () => enviarUso.mock.calls[enviarUso.mock.calls.length - 1][0];
// Manda lo pendiente y devuelve los eventos del lote.
const eventos = async () => { await enviarUsoPendiente(); return ultimoLote().eventos; };

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarUso();
});

describe('el lote', () => {
  test('lleva exactamente plataforma, version y eventos — nunca device_id', async () => {
    registrarUso('seccion', 'carnet');
    await enviarUsoPendiente();
    const body = ultimoLote();
    expect(Object.keys(body).sort()).toEqual(['eventos', 'plataforma', 'version']);
    expect(body.plataforma).toBe('ios');
    expect(body.version).toBe('2.0.1');
    expect(JSON.stringify(body)).not.toMatch(/device/i);
  });

  test('ningún evento lleva claves fuera de que/cual/cuando/id', async () => {
    registrarUso('seccion', 'carnet');
    registrarUso('pantalla', 'EventDetail', 2276);
    const evs = await eventos();
    for (const e of evs) {
      expect(Object.keys(e).every((k) => ['que', 'cual', 'cuando', 'id'].includes(k))).toBe(true);
    }
  });

  test('sin eventos no se manda nada', async () => {
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });

  test('sin versión válida no se manda nada', async () => {
    Application.nativeApplicationVersion = '2.0';
    Constants.expoConfig.version = '2.0';
    try {
      expect(versionApp()).toBeNull();
      registrarUso('seccion', 'carnet');
      await enviarUsoPendiente();
      expect(enviarUso).not.toHaveBeenCalled();
    } finally {
      Application.nativeApplicationVersion = '2.0.1';
      Constants.expoConfig.version = '2.0.1';
    }
  });

  test('la versión sale del binario y tiene que ser X.Y.Z', () => {
    expect(versionApp()).toBe('2.0.1');
  });

  test('se manda solo al llegar a 25 eventos, sin esperar el timer', async () => {
    for (let i = 0; i < 24; i++) registrarUso('seccion', 'carnet');
    expect(enviarUso).not.toHaveBeenCalled();
    registrarUso('seccion', 'carnet');
    expect(enviarUso).toHaveBeenCalledTimes(1);
    expect(ultimoLote().eventos).toHaveLength(25);
  });

  test('una falla del POST no rompe nada y no se reintenta', async () => {
    enviarUso.mockRejectedValueOnce(new Error('Sin conexión.'));
    registrarUso('seccion', 'carnet');
    await expect(enviarUsoPendiente()).resolves.toBeUndefined();
    enviarUso.mockClear();
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });
});

describe('la cola nunca pasa de 100 (el 413 del contrato)', () => {
  test('se queda con los últimos 100 y pierde los más viejos', async () => {
    // El primer lote (25) sale y queda en vuelo: hasta que no vuelva no se
    // manda nada más, así que el resto se apila y tiene que toparse en 100.
    let soltar;
    enviarUso.mockReturnValueOnce(new Promise((r) => { soltar = r; }));
    for (let i = 0; i < 150; i++) registrarUso('pantalla', 'EventDetail', i + 1);
    expect(ultimoLote().eventos).toHaveLength(25);
    expect(usoPendientes()).toBe(100);

    enviarUso.mockResolvedValue({});
    soltar({});
    await asentar();

    const evs = await eventos();
    expect(evs).toHaveLength(100);
    // El último registrado está; los más viejos se perdieron.
    expect(evs[evs.length - 1].id).toBe(150);
    expect(evs.some((e) => e.id === 1)).toBe(false);
    expect(evs[0].id).toBe(51);
  });
});

describe('qué evento se arma y cuál se descarta antes de salir', () => {
  test('un `que` fuera del enum no se manda', async () => {
    registrarUso('scroll', 'home');
    registrarUso('seccion', 'carnet');
    expect(await eventos()).toEqual([expect.objectContaining({ que: 'seccion', cual: 'carnet' })]);
  });

  test('un `cual` que el backend descartaría no se manda', async () => {
    registrarUso('busqueda_vacia', 'Don Segundo');  // espacio
    registrarUso('busqueda_vacia', 'ñandú');        // fuera de ASCII
    registrarUso('seccion', 'x'.repeat(41));        // más de 40
    registrarUso('seccion', '');                    // vacío
    registrarUso('seccion', 123);                   // no es string
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });

  test('busqueda_vacia lleva la sección, no lo buscado', async () => {
    registrarUso('busqueda_vacia', 'pedigree');
    expect(await eventos()).toEqual([expect.objectContaining({ que: 'busqueda_vacia', cual: 'pedigree' })]);
  });

  test('`cuando` va como YYYY-MM-DD HH:MM:SS, en hora local y sin zona', async () => {
    registrarUso('seccion', 'carnet');
    const [ev] = await eventos();
    expect(ev.cuando).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(cuandoAhora(new Date(2026, 10, 6, 9, 5, 4))).toBe('2026-11-06 09:05:04');
  });
});

describe('el id, que sólo algunas pantallas pueden llevar', () => {
  test('EventDetail y NewsDetail lo mandan como entero JSON', async () => {
    registrarUso('pantalla', 'EventDetail', '2276');
    registrarUso('pantalla', 'NewsDetail', 91);
    const evs = await eventos();
    expect(evs[0].id).toBe(2276);
    expect(evs[1].id).toBe(91);
  });

  test('HorseDetail lo manda como el id de /animales', async () => {
    registrarUso('pantalla', 'HorseDetail', 'pdre:119914');
    expect((await eventos())[0].id).toBe('pdre:119914');
  });

  test('un id inválido se omite, pero la pantalla se cuenta igual', async () => {
    registrarUso('pantalla', 'EventDetail', 0);
    registrarUso('pantalla', 'EventDetail', -1);
    registrarUso('pantalla', 'EventDetail', 1.5);
    registrarUso('pantalla', 'HorseDetail', '119914');
    const evs = await eventos();
    expect(evs).toHaveLength(4);
    expect(evs.every((e) => !('id' in e))).toBe(true);
  });

  test('una pantalla que no está en la lista nunca lleva id', async () => {
    registrarUso('pantalla', 'RankingCat', 7);
    registrarUso('seccion', 'carnet', 7);
    const evs = await eventos();
    expect(evs.every((e) => !('id' in e))).toBe(true);
  });
});

describe('navegación', () => {
  // La forma que arma la navegación de verdad: el root es el **Stack**, y el
  // tab bar cuelga del route `Tabs` un nivel adentro. El test de abajo
  // (usoNavegacion.test.js) lo verifica contra un NavigationContainer real;
  // acá se replica a mano para los casos de borde.
  const ref = (tab, route) => ({
    getRootState: () => ({
      type: 'stack',
      index: 0,
      routes: [{ name: 'Tabs', state: { type: 'tab', index: 0, routes: [{ name: tab }] } }],
    }),
    getCurrentRoute: () => route,
  });

  // Con una pantalla pusheada encima de las tabs, la rama activa del root no
  // pasa por el tab bar.
  const refPusheada = (tab, route) => ({
    getRootState: () => ({
      type: 'stack',
      index: 1,
      routes: [
        { name: 'Tabs', state: { type: 'tab', index: 0, routes: [{ name: tab }] } },
        { name: route.name, params: route.params },
      ],
    }),
    getCurrentRoute: () => route,
  });

  test('la tab se cuenta una vez y la pantalla con su id', async () => {
    registrarNavegacion(ref('EventosTab', { name: 'EventsList' }));
    registrarNavegacion(ref('EventosTab', { name: 'EventDetail', params: { id: 2276 } }));
    const evs = await eventos();
    expect(evs).toEqual([
      expect.objectContaining({ que: 'tab', cual: 'EventosTab' }),
      expect.objectContaining({ que: 'pantalla', cual: 'EventsList' }),
      expect.objectContaining({ que: 'pantalla', cual: 'EventDetail', id: 2276 }),
    ]);
  });

  test('un onStateChange que no mueve de pantalla no vuelve a contar', async () => {
    const r = ref('InicioTab', { name: 'Home' });
    registrarNavegacion(r);
    registrarNavegacion(r);
    registrarNavegacion(r);
    const evs = await eventos();
    expect(evs.filter((e) => e.que === 'pantalla')).toHaveLength(1);
    expect(evs.filter((e) => e.que === 'tab')).toHaveLength(1);
  });

  test('volver a la misma pantalla con otro id sí cuenta', async () => {
    registrarNavegacion(ref('PedigreeTab', { name: 'HorseDetail', params: { id: 'pdre:1' } }));
    registrarNavegacion(ref('PedigreeTab', { name: 'HorseDetail', params: { id: 'pdre:2' } }));
    expect((await eventos()).filter((e) => e.que === 'pantalla')).toHaveLength(2);
  });

  test('una pantalla pusheada no se cuenta como tab', async () => {
    registrarNavegacion(ref('EventosTab', { name: 'EventsList' }));
    registrarNavegacion(refPusheada('EventosTab', { name: 'EventDetail', params: { id: 2276 } }));
    const evs = await eventos();
    // `EventDetail` es el route activo del Stack, no una tab: si se leyera de
    // ahí, entraría como `tab` y además se contaría dos veces.
    expect(evs.filter((e) => e.que === 'tab')).toEqual([
      expect.objectContaining({ cual: 'EventosTab' }),
    ]);
    expect(evs.filter((e) => e.que === 'pantalla' && e.cual === 'EventDetail')).toHaveLength(1);
  });

  test('una ref rota no tira', async () => {
    expect(() => registrarNavegacion(null)).not.toThrow();
    expect(() => registrarNavegacion({})).not.toThrow();
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });
});

describe('errores HTTP', () => {
  // useUso es quien engancha el observador; de ahí sale el callback real.
  const observador = () => {
    renderHook(() => useUso());
    return observarErroresHttp.mock.calls[0][0];
  };

  test('el `cual` es recurso_status, sin el id del recurso', async () => {
    observador()({ path: '/eventos/2276/catalogo', status: 500 });
    expect((await eventos())[0]).toEqual(expect.objectContaining({ que: 'error', cual: 'eventos_500' }));
  });

  test('un error de /uso no se registra (si no, se realimenta)', async () => {
    observador()({ path: '/uso', status: 429 });
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });

  test('el 401 no es un error: el cliente refresca solo', async () => {
    observador()({ path: '/perfil', status: 401 });
    await enviarUsoPendiente();
    expect(enviarUso).not.toHaveBeenCalled();
  });

  test('el mismo error repetido se cuenta una vez por lote', async () => {
    const obs = observador();
    obs({ path: '/vivos', status: 503 });
    obs({ path: '/vivos', status: 503 });
    obs({ path: '/vivos', status: 503 });
    expect(await eventos()).toHaveLength(1);
  });

  test('distinto status del mismo recurso son errores distintos', async () => {
    const obs = observador();
    obs({ path: '/rankings', status: 500 });
    obs({ path: '/rankings', status: 404 });
    expect((await eventos()).map((e) => e.cual)).toEqual(['rankings_500', 'rankings_404']);
  });
});
