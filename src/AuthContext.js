import React from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  getSession, setSession, subscribeSession,
  login as apiLogin, logout as apiLogout, cambiarClave as apiCambiarClave,
} from './api';

// Estado global de la sesión del socio, y el único lugar que la persiste.
//
// Los tokens en memoria los maneja src/api/session.js (lo necesita el cliente
// HTTP para firmar cada request protegido). Acá le ponemos las dos cosas que
// hacen falta del lado de la app: el almacenamiento seguro —Keychain en iOS,
// Keystore en Android, vía expo-secure-store— y el re-render cuando la sesión
// aparece o se pierde.
//
// La sesión se guarda entera (access + refresh + vencimiento + id). Al arrancar
// alcanza con que el refresh esté: el access puede venir vencido, que el primer
// request protegido lo renueva solo. El refresh dura 90 días deslizantes, así
// que el socio no vuelve a tipear la clave mientras use la app en ese plazo.

const KEY = 'auth.sesion'; // SecureStore sólo acepta [A-Za-z0-9.-_] en la key

const AuthCtx = React.createContext({
  status: 'loading',
  usuarioId: null,
  login: async () => {},
  logout: async () => {},
  cambiarClave: async () => {},
});

// Escribir es fire-and-forget: si el llavero falla no hay nada que la app pueda
// hacer al respecto, y la sesión en memoria ya es válida. En Android SecureStore
// avisa por arriba de 2048 bytes; un access (JWT) más un refresh opaco entran
// con margen.
function persist(sesion) {
  (async () => {
    try {
      if (sesion) await SecureStore.setItemAsync(KEY, JSON.stringify(sesion));
      else await SecureStore.deleteItemAsync(KEY);
    } catch {}
  })();
}

export function AuthProvider({ children }) {
  // 'loading' = todavía no sabemos si hay sesión guardada (primer frame).
  const [status, setStatus] = React.useState('loading');
  const [usuarioId, setUsuarioId] = React.useState(null);

  React.useEffect(() => {
    // Suscribirse ANTES de hidratar: la hidratación emite y queremos atraparla.
    const unsub = subscribeSession((s) => {
      setUsuarioId(s?.usuarioId ?? null);
      setStatus(s ? 'in' : 'out');
      persist(s);
    });

    let cancelled = false;
    (async () => {
      let raw = null;
      try { raw = await SecureStore.getItemAsync(KEY); } catch {}
      if (cancelled) return;
      let guardada = null;
      try { guardada = raw ? JSON.parse(raw) : null; } catch {}
      // Sin refresh no hay nada que recuperar: el access solo vive 60 minutos.
      if (guardada?.refreshToken) setSession(guardada);
      else setStatus('out');
    })();

    return () => { cancelled = true; unsub(); };
  }, []);

  // Las tres acciones delegan en src/api/auth.js: ahí se guarda la sesión nueva
  // y el listener de arriba se encarga del estado y del llavero. Los errores se
  // propagan tal cual (ApiError con status y code) para que la pantalla elija
  // qué mostrar.
  const login = React.useCallback((usuario, clave) => apiLogin(usuario, clave), []);
  const logout = React.useCallback(() => apiLogout(), []);
  const cambiarClave = React.useCallback(
    (actual, nueva) => apiCambiarClave(actual, nueva),
    [],
  );

  const value = React.useMemo(
    () => ({ status, usuarioId, login, logout, cambiarClave }),
    [status, usuarioId, login, logout, cambiarClave],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => React.useContext(AuthCtx);

// Para los tests y para cualquier chequeo puntual fuera de React.
export { getSession };
