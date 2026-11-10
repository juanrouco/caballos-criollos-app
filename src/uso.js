import React from 'react';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { enviarUso, observarErroresHttp, USO_PATH } from './api';

// Registro de uso sin datos de la cuenta (POST /uso). Junta eventos en memoria
// y los manda en lotes. Contesta cuatro preguntas y ninguna más: a qué secciones
// entra la gente, qué eventos y qué caballos abre, qué búsquedas de pedigree no
// encuentran nada, y qué errores ve.
//
// Tres cosas que son contrato con el backend y **no** son detalle de
// implementación:
//
//  1. El lote no lleva nada que identifique: ni Bearer, ni `device_id`. Una
//     clave de más hace que el backend rechace el lote entero con un 400 —
//     `device_id` está explícitamente prohibida, porque junto con la Pieza A
//     (el token de push atado al socio) alcanzaría para saber qué pedigree mira
//     cada criador. La hora sí viaja, porque el contrato la exige, pero el
//     backend la valida y se queda sólo con el día.
//  2. **Lo que se busca nunca va en `cual`.** El `cual` de `busqueda_vacia` es
//     la sección (`pedigree`), no el término. La regex de abajo tapa parte del
//     agujero —un término con espacio o tilde no pasa— pero una palabra ASCII
//     suelta pasaría, así que la regla la sostiene quien llama.
//  3. Lo que el backend descartaría, acá no se manda. Un evento inválido se
//     descarta del lado del servidor con su motivo; mandarlo igual es gastar
//     batería para que lo tiren.
//
// La cola vive **sólo en memoria**: nada se persiste en el dispositivo, así que
// cerrar la app pierde lo que no se alcanzó a mandar. Es a propósito —son
// conteos, no registros— y además mantiene cierto lo que dice §2.5 de la
// política de privacidad.

const QUE_VALIDOS = ['seccion', 'tab', 'pantalla', 'busqueda_vacia', 'error'];
const CUAL_RE     = /^[A-Za-z0-9_]{1,40}$/;
const VERSION_RE  = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
// El id de animal que devuelve /animales/{id}: `pdre:119914` y sus hermanos.
const ANIMAL_RE   = /^(pdre|exis|extr):[1-9]\d{0,9}$/;
// Las únicas pantallas que pueden llevar `id`, y de qué tipo. En cualquier otra
// el backend descarta el evento por `id_no_permitido`.
const ID_POR_PANTALLA = { EventDetail: 'entero', NewsDetail: 'entero', HorseDetail: 'animal' };

const LOTE_MAX    = 100;      // arriba de 100 el backend contesta 413
const LOTE_ENVIO  = 25;       // a partir de acá se manda sin esperar el timer
const INTERVALO_MS = 120_000; // y si no se llena, cada dos minutos

let cola = [];
let timer = null;
let enviando = false;
let ultimaTab = null;
let ultimaPantalla = null;

// Sólo ios y android: el contrato no tiene otro valor y `web` haría que el
// backend rechace el lote entero.
function plataforma() {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

// La versión que ve la tienda. En un build standalone la da el binario; en
// Expo Go, app.json. Si no matchea `X.Y.Z` no se manda nada: con una versión
// inválida el backend tira el lote completo.
export function versionApp() {
  const v = Application?.nativeApplicationVersion || Constants?.expoConfig?.version || '';
  return VERSION_RE.test(v) ? v : null;
}

// `YYYY-MM-DD HH:MM:SS` en hora local, sin zona, como el resto de la API. El
// backend valida que el **día** caiga entre hoy-7 y hoy+1 (hora AR) y se queda
// sólo con el día, así que un teléfono en otro huso entra igual.
export function cuandoAhora(d = new Date()) {
  const p = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} `
       + `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Arma el evento o devuelve null si el backend lo descartaría. El `id` inválido
// no invalida el evento: se omite y el evento va igual, que es lo que el
// contrato acepta.
function armarEvento(que, cual, id) {
  if (!QUE_VALIDOS.includes(que)) return null;
  if (typeof cual !== 'string' || !CUAL_RE.test(cual)) return null;
  const ev = { que, cual, cuando: cuandoAhora() };
  const tipo = que === 'pantalla' ? ID_POR_PANTALLA[cual] : null;
  if (tipo && id != null) {
    if (tipo === 'entero') {
      const n = Number(id);
      if (Number.isInteger(n) && n > 0) ev.id = n;
    } else if (typeof id === 'string' && ANIMAL_RE.test(id)) {
      ev.id = id;
    }
  }
  return ev;
}

export function registrarUso(que, cual, id) {
  const ev = armarEvento(que, cual, id);
  if (!ev) return;
  cola.push(ev);
  // Si la cola llegó al tope sin poder mandar (sin conexión, por ejemplo) se
  // pierde lo más viejo. Son conteos: el dato de recién vale más que el de hace
  // una hora, y pasarse de 100 es un 413 que tira el lote entero.
  if (cola.length > LOTE_MAX) cola = cola.slice(-LOTE_MAX);
  if (cola.length >= LOTE_ENVIO) enviarUsoPendiente();
  else programar();
}

function programar() {
  if (timer || enviando) return;
  timer = setTimeout(() => { timer = null; enviarUsoPendiente(); }, INTERVALO_MS);
}

// Manda lo que haya. Fire-and-forget: si falla, el lote se pierde y no se
// reintenta — reintentar duplicaría conteos y haría crecer la cola justo cuando
// el servidor está peor.
export function enviarUsoPendiente() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (enviando || cola.length === 0) return Promise.resolve();
  const plat = plataforma();
  const version = versionApp();
  if (!plat || !version) { cola = []; return Promise.resolve(); }
  const eventos = cola;
  cola = [];
  enviando = true;
  // El POST arranca ya, no en una microtask: si la app se está yendo a
  // background, lo que importa es que el request salga antes.
  let vuelo;
  try {
    vuelo = enviarUso({ plataforma: plat, version, eventos });
  } catch {
    enviando = false;
    return Promise.resolve();
  }
  return Promise.resolve(vuelo)
    .catch(() => {})
    .then(() => { enviando = false; });
}

// Un error HTTP que el socio probablemente vio como card de error. El `cual` es
// `<recurso>_<status>` (`eventos_500`), armado con el primer tramo de la ruta:
// el id del evento o del animal no entra, que es justo lo que no queremos
// contar por persona.
function registrarErrorHttp({ path, status }) {
  // Un error de /uso generaría un evento que viaja en el lote siguiente, que
  // vuelve a fallar, que genera otro. No se registra.
  if (!path || path === USO_PATH) return;
  // El 401 es rutina, no un error: el access dura 60 minutos y el cliente
  // refresca solo sin que el socio se entere.
  if (status === 401) return;
  const recurso = String(path).split('/').filter(Boolean)[0] || '';
  const limpio = recurso.replace(/[^A-Za-z0-9_]/g, '').slice(0, 36);
  if (!limpio) return;
  const cual = `${limpio}_${status}`;
  // Un error que se repite dentro del mismo lote se cuenta una vez: lo que
  // interesa es que pasó, no cuántos reintentos hizo el polling.
  if (cola.some((e) => e.que === 'error' && e.cual === cual)) return;
  registrarUso('error', cual);
}

// Cuál de las cuatro tabs está activa. El root state **no** es el del tab bar:
// el navegador de arriba es el Stack, así que `routes[index]` da `Tabs` —o la
// pantalla pusheada encima, `EventDetail`— y nunca `EventosTab`. La tab de
// verdad vive un nivel más adentro, en el navegador de `type: 'tab'`, así que
// hay que bajar por la rama activa hasta encontrarlo.
//
// Con una pantalla pusheada sobre las tabs la rama activa no pasa por el tab
// bar y esto devuelve null: la tab no cambió, así que no hay nada que contar.
function tabActiva(state) {
  let s = state;
  while (s) {
    const r = s.routes?.[s.index];
    if (!r) return null;
    if (s.type === 'tab') return r.name;
    s = r.state;
  }
  return null;
}

// Navegación. Se llama desde el `onStateChange` del NavigationContainer, que es
// el único punto por el que pasan todas las pantallas de los cuatro stacks.
// Las secciones del menú lateral NO pasan por acá (no son rutas): ésas las
// registra `openSection` en src/MenuContext.js.
export function registrarNavegacion(ref) {
  try {
    const root = ref?.getRootState?.();
    const tab = tabActiva(root);
    if (tab && tab !== ultimaTab) {
      ultimaTab = tab;
      registrarUso('tab', tab);
    }
    const route = ref?.getCurrentRoute?.();
    if (!route?.name) return;
    const id = ID_POR_PANTALLA[route.name] ? route.params?.id : undefined;
    // `onStateChange` dispara también por cambios que no mueven de pantalla
    // (params, gestos a medio camino). Sin esto, una misma pantalla se contaría
    // varias veces.
    const huella = `${route.name}#${id ?? ''}`;
    if (huella === ultimaPantalla) return;
    ultimaPantalla = huella;
    registrarUso('pantalla', route.name, id);
  } catch {}
}

// Engancha el observador de errores y manda lo pendiente cuando la app se va a
// background, que es el último momento en que se puede.
export function useUso() {
  React.useEffect(() => {
    const dejarDeObservar = observarErroresHttp(registrarErrorHttp);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') enviarUsoPendiente();
    });
    return () => { sub.remove(); dejarDeObservar(); };
  }, []);
}

// Cuántos eventos esperan para salir. Sólo para los tests y para mirar desde
// el debugger: la cola es interna.
export function usoPendientes() {
  return cola.length;
}

// Sólo para los tests: deja el módulo como recién importado.
export function reiniciarUso() {
  if (timer) clearTimeout(timer);
  cola = [];
  timer = null;
  enviando = false;
  ultimaTab = null;
  ultimaPantalla = null;
}
