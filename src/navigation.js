import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

// Ref del NavigationContainer — permite navegar desde fuera del árbol
// React (ej: handler de tap de una notificación push).
export const navigationRef = createNavigationContainerRef();

// Reescribe el stack de una tab a [initial, detail(params)] y lleva foco
// a esa tab. Hace falta este truco porque `navigate(tab, { screen, params })`
// no fuerza re-render del detail si ya hay uno en el stack con otros
// params — abriría el evento/noticia anterior en vez del nuevo.
function resetTabToDetail(tabName, initialScreen, detailScreen, params) {
  const rootState = navigationRef.getRootState();
  const tabIdx = rootState?.routes?.findIndex((r) => r.name === tabName);
  if (tabIdx == null || tabIdx < 0) {
    navigationRef.navigate(tabName, { screen: detailScreen, params });
    return;
  }
  const routes = rootState.routes.map((r) =>
    r.name === tabName
      ? {
          name: tabName,
          state: {
            index: 1,
            routes: [
              { name: initialScreen },
              { name: detailScreen, params },
            ],
          },
        }
      : (r.state ? { name: r.name, state: r.state } : { name: r.name })
  );
  navigationRef.dispatch(CommonActions.reset({ index: tabIdx, routes }));
}

// Cuando una notif push trae un `data.kind`, ruteamos al destino. Si el
// nav todavía no está ready (cold start desde una notif), reintentamos
// por unos segundos hasta que monte.
export function navigateOnNotificationTap(data, attempts = 0) {
  if (__DEV__ && attempts === 0) console.log('[nav] navigateOnNotificationTap:', data);
  if (!data) return;
  if (!navigationRef.isReady()) {
    if (__DEV__ && attempts === 0) console.log('[nav] nav no está ready, reintentando...');
    if (attempts < 30) setTimeout(() => navigateOnNotificationTap(data, attempts + 1), 100);
    return;
  }
  const kind = data.kind;
  if (kind === 'vivo' || kind === 'evento') {
    const id = data.evento_id ?? data.id;
    // `from: 'home'` → el back del detalle vuelve al Home (de donde sale la
    // campanita / el push), no al listado de eventos que queda debajo en el
    // stack reseteado de EventosTab.
    if (id != null) resetTabToDetail('EventosTab', 'EventsList', 'EventDetail', { id, from: 'home' });
    return;
  }
  if (kind === 'noticia') {
    if (data.id != null) {
      resetTabToDetail('InicioTab', 'Home', 'NewsDetail', { id: data.id, tag: data.tag });
    }
    return;
  }
  if (kind === 'ranking') {
    navigationRef.navigate('RankingsTab');
    return;
  }
  // kind desconocido (vino de un backend más nuevo): fallback al Home.
  navigationRef.navigate('InicioTab');
}
