import React from 'react';

// Estado global del menú lateral (drawer custom, sin @react-navigation/drawer
// para no sumar deps nativas). `menuOpen` controla el panel deslizante;
// `section` es la sección de pantalla completa abierta desde el menú (o null).
// Ambas cosas viven como overlay por encima de la navegación — así no tocamos
// los navegadores (ni el deep-link de notificaciones ni el tab bar).
const MenuCtx = React.createContext({
  menuOpen: false,
  section: null,
  openMenu: () => {},
  closeMenu: () => {},
  openSection: () => {},
  closeSection: () => {},
});

export function MenuProvider({ children }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [section, setSection] = React.useState(null);

  const openMenu = React.useCallback(() => setMenuOpen(true), []);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);
  // Abrir una sección cierra el drawer (queda el overlay de la sección arriba).
  const openSection = React.useCallback((key) => { setSection(key); setMenuOpen(false); }, []);
  const closeSection = React.useCallback(() => setSection(null), []);

  const value = React.useMemo(
    () => ({ menuOpen, section, openMenu, closeMenu, openSection, closeSection }),
    [menuOpen, section, openMenu, closeMenu, openSection, closeSection],
  );
  return <MenuCtx.Provider value={value}>{children}</MenuCtx.Provider>;
}

export const useMenu = () => React.useContext(MenuCtx);
