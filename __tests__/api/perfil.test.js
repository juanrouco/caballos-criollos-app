import { mapPerfil } from '../../src/api/perfil';

// Shape de GET /perfil (docs/README.md §Perfil).
const PERFIL = {
  id: 1234,
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'socio@ejemplo.com',
  telefono: { cod_pais: '54', cod_area: '11', numero: '45551234' },
  celular:  { cod_pais: '54', cod_area: '11', numero: '1555551234' },
  socio: { numero: '3072', categoria: 'Activo', nombre_padron: 'PÉREZ JUAN' },
};

describe('mapPerfil', () => {
  test('junta nombre y apellido, y arma los teléfonos en un solo string', () => {
    const p = mapPerfil(PERFIL);
    expect(p.nombre).toBe('Juan Pérez');
    expect(p.telefono).toBe('+54 (11) 45551234');
    expect(p.celular).toBe('+54 (11) 1555551234');
    expect(p.socio).toEqual({ numero: '3072', categoria: 'Activo', nombrePadron: 'PÉREZ JUAN' });
  });

  test('un teléfono en null (las tres partes vacías) queda en null', () => {
    const p = mapPerfil({ ...PERFIL, telefono: null, celular: { cod_pais: '', cod_area: '', numero: '' } });
    expect(p.telefono).toBeNull();
    expect(p.celular).toBeNull();
  });

  test('sin país ni área, sólo el número', () => {
    const p = mapPerfil({ ...PERFIL, telefono: { cod_pais: null, cod_area: null, numero: '45551234' } });
    expect(p.telefono).toBe('45551234');
  });

  test('una cuenta sin número de socio trae socio en null', () => {
    const p = mapPerfil({ ...PERFIL, socio: null });
    expect(p.socio).toBeNull();
  });

  test('campos vacíos salen null, no string vacío', () => {
    const p = mapPerfil({ id: 7, nombre: null, apellido: null, email: '', telefono: null, celular: null, socio: null });
    expect(p).toEqual({ id: 7, nombre: null, email: null, telefono: null, celular: null, socio: null });
  });

  test('los nombres legacy con bytes cp1252 se normalizan, como en resultados', () => {
    const p = mapPerfil({ ...PERFIL, nombre: 'Juan\x96Carlos', socio: { numero: '1', categoria: 'Activo\x96A', nombre_padron: null } });
    expect(p.nombre).toBe('Juan–Carlos Pérez');
    expect(p.socio.categoria).toBe('Activo–A');
  });

  test('sin perfil devuelve null', () => {
    expect(mapPerfil(null)).toBeNull();
    expect(mapPerfil(undefined)).toBeNull();
  });
});
