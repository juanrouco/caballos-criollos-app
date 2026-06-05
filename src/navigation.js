import { createNavigationContainerRef } from '@react-navigation/native';

// Ref del NavigationContainer — permite navegar desde fuera del árbol
// React (ej: handler de tap de una notificación push).
export const navigationRef = createNavigationContainerRef();

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
    if (id != null) {
      navigationRef.navigate('EventosTab', { screen: 'EventDetail', params: { id } });
    }
    return;
  }
  if (kind === 'noticia') {
    if (data.id != null) {
      navigationRef.navigate('InicioTab', {
        screen: 'NewsDetail',
        params: { id: data.id, tag: data.tag },
      });
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
