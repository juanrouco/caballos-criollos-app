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
//   - deletedIds: ids que el usuario borró de la campanita, en
//     AsyncStorage. La API no tiene borrado (sólo GET /notificaciones y
//     /notificaciones/{id}), así que el borrado es del dispositivo: se
//     filtran al listar. No viaja a otro teléfono y se pierde al
//     reinstalar — es la contrapartida aceptada de no tener endpoint.
// El badge se refresca solo cada 30s (mismo Cache-Control del endpoint)
// y además al recibir un push en foreground (listener de expo-notifs).
//
// El contador no necesita descontar los borrados: sólo se puede borrar
// desde la lista, y abrirla ya corre markAllSeen(), así que todo lo
// borrado quedó más viejo que lastSeenAt y el `since` del badge nunca
// lo vuelve a contar.

const STORAGE_KEY = 'notifs:lastSeenAt';
const DELETED_KEY = 'notifs:deletedIds';
const POLL_MS = 30_000;

// Techo de la lista de borrados para que no crezca sin límite en el
// dispositivo. Se descartan los más viejos: para que uno vuelva a
// aparecer tendrían que borrarse MAX_DELETED notifs más nuevas, y en ese
// caso ya quedó fuera de la página que la pantalla pide.
const MAX_DELETED = 300;

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
  deletedIds: new Set(),
  refresh: () => {},
  markAllSeen: () => {},
  deleteNotifs: () => {},
});

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [lastSeenAt, setLastSeenAt]   = React.useState(null);
  const [deletedIds, setDeletedIds]   = React.useState(() => new Set());
  // Snapshot del lastSeenAt vigente, accesible desde el poll sin que el
  // setInterval capture un valor viejo a través del closure.
  const lastSeenRef = React.useRef(null);
  // Orden de borrado (viejo → nuevo) para poder recortar por MAX_DELETED.
  // El Set del state es la vista de consulta de esta misma lista.
  const deletedRef = React.useRef([]);

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

  // Borra (oculta) notifs en el dispositivo. Acepta un id o una lista —
  // el "borrar todas" manda los ids que la pantalla tiene en pantalla.
  const deleteNotifs = React.useCallback(async (ids) => {
    const nuevos = (Array.isArray(ids) ? ids : [ids])
      .map((id) => String(id))
      .filter((id) => id && id !== 'null' && id !== 'undefined');
    if (!nuevos.length) return;
    // Sin duplicados y conservando el orden de borrado, que es lo que
    // define a quién se recorta cuando se pasa MAX_DELETED.
    const merged = [...deletedRef.current.filter((id) => !nuevos.includes(id)), ...nuevos]
      .slice(-MAX_DELETED);
    deletedRef.current = merged;
    setDeletedIds(new Set(merged));
    try { await AsyncStorage.setItem(DELETED_KEY, JSON.stringify(merged)); } catch {}
  }, []);

  // Boot: leer lastSeenAt; si no existe, seedearlo con `now` para que la
  // primera vez que se instala la app no aparezcan 200 notifs viejas.
  // Y los ids borrados, que se filtran al listar.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let seen = null;
      try { seen = await AsyncStorage.getItem(STORAGE_KEY); } catch {}
      if (!seen) {
        seen = new Date().toISOString();
        try { await AsyncStorage.setItem(STORAGE_KEY, seen); } catch {}
      }
      let borrados = [];
      try {
        const raw = await AsyncStorage.getItem(DELETED_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) borrados = parsed.map((id) => String(id));
      } catch {}
      if (cancelled) return;
      lastSeenRef.current = seen;
      setLastSeenAt(seen);
      // Merge, no overwrite: si se borró algo mientras el storage se
      // leía, ese id ya está en el ref y no se puede perder. Lo de la
      // sesión queda al final, que es lo más nuevo para el recorte.
      const yaBorrado = deletedRef.current;
      const merged = [...borrados.filter((id) => !yaBorrado.includes(id)), ...yaBorrado]
        .slice(-MAX_DELETED);
      deletedRef.current = merged;
      if (merged.length) setDeletedIds(new Set(merged));
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
    () => ({ unreadCount, lastSeenAt, deletedIds, refresh, markAllSeen, deleteNotifs }),
    [unreadCount, lastSeenAt, deletedIds, refresh, markAllSeen, deleteNotifs],
  );
  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export const useNotifications = () => React.useContext(NotificationsCtx);
