import React from 'react';
import { fetchVivos } from './api';

// Estado global del vivo "ahora". Lo consumen el banner de la home y el
// botón EN VIVO del footer. Poll cada 60s, alineado con Cache-Control del API.

const LiveCtx = React.createContext({ live: null, refresh: () => {} });

export function LiveProvider({ children }) {
  const [live, setLive] = React.useState(null);

  const refresh = React.useCallback(async () => {
    try {
      const r = await fetchVivos({ estado: 'en_vivo', limit: 1 });
      setLive(r.data?.[0] || null);
    } catch {
      // mantener el último estado conocido en caso de error de red
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return <LiveCtx.Provider value={{ live, refresh }}>{children}</LiveCtx.Provider>;
}

export const useLive = () => React.useContext(LiveCtx);
