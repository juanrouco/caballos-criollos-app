import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { fetchNotificaciones } from './api';

// Estado global de la campanita. Modelo:
//   - lastSeenAt: timestamp ISO en AsyncStorage. En el primer boot se
//     setea a `now` para que la campana arranque en 0 (sino el primer
//     fetch traería todo el log histórico y se vería como "no visto").
//   - unreadCount: meta.total de GET /notificaciones?since=lastSeenAt.
//   - markAllSeen(): mueve lastSeenAt a now → unread vuelve a 0.
// El badge se refresca solo cada 30s (mismo Cache-Control del endpoint)
// y además al recibir un push en foreground (listener de expo-notifs).

const STORAGE_KEY = 'notifs:lastSeenAt';
const POLL_MS = 30_000;

// Para `since`: el backend acepta "YYYY-MM-DD HH:MM:SS" en hora
// Argentina sin TZ. Construimos eso desde un Date local para que el
// reloj del device y el del server queden alineados.
function toApiSince(iso) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

const NotificationsCtx = React.createContext({
  unreadCount: 0,
  lastSeenAt: null,
  refresh: () => {},
  markAllSeen: () => {},
});

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [lastSeenAt, setLastSeenAt]   = React.useState(null);
  // Snapshot del lastSeenAt vigente, accesible desde el poll sin que el
  // setInterval capture un valor viejo a través del closure.
  const lastSeenRef = React.useRef(null);

  const refresh = React.useCallback(async () => {
    const since = toApiSince(lastSeenRef.current);
    try {
      const r = await fetchNotificaciones({ since, limit: 1 });
      const total = Number(r?.meta?.total) || 0;
      setUnreadCount(total);
    } catch {
      // mantener el último contador conocido si falla el poll
    }
  }, []);

  // Devuelve el `lastSeenAt` previo para que la pantalla pueda capturar
  // un snapshot y destacar las notifs nuevas en la lista — sino, al
  // marcarse como visto, perdemos la referencia de "hasta dónde había
  // visto el usuario".
  const markAllSeen = React.useCallback(async () => {
    const prev = lastSeenRef.current;
    const now  = new Date().toISOString();
    lastSeenRef.current = now;
    setLastSeenAt(now);
    setUnreadCount(0);
    try { await AsyncStorage.setItem(STORAGE_KEY, now); } catch {}
    return prev;
  }, []);

  // Boot: leer lastSeenAt; si no existe, seedearlo con `now` para que la
  // primera vez que se instala la app no aparezcan 200 notifs viejas.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let seen = null;
      try { seen = await AsyncStorage.getItem(STORAGE_KEY); } catch {}
      if (!seen) {
        seen = new Date().toISOString();
        try { await AsyncStorage.setItem(STORAGE_KEY, seen); } catch {}
      }
      if (cancelled) return;
      lastSeenRef.current = seen;
      setLastSeenAt(seen);
      refresh();
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  // Poll cada 30s.
  React.useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Refresh inmediato al recibir un push en foreground — sino el badge
  // se atrasa hasta 30s después del aviso.
  React.useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => { refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const value = React.useMemo(
    () => ({ unreadCount, lastSeenAt, refresh, markAllSeen }),
    [unreadCount, lastSeenAt, refresh, markAllSeen],
  );
  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export const useNotifications = () => React.useContext(NotificationsCtx);
