import { mapListado, mapInscripcion, mapCertificado, mapBaja, descargarCertificadoPdf } from '../../src/api/inscripciones';
import { API_BASE } from '../../src/api/client';
import { setSession, clearSession } from '../../src/api/session';

// Shapes de docs/README.md §Inscripciones.
const INSCRIPCION = {
  id: 180001,
  evento: { id: 1180, nombre: 'Nacional 2025', fecha: '2025-05-10' },
  animal: { id: 'exis:9059010', nombre: 'LA ÑANDÚ', sba: '123456', rp: '45' },
  estado: 1, estado_nombre: 'Definitiva', cria_ajena: false,
  sexo: 2, sexo_nombre: 'Hembra', presentacion: 'C', presentacion_nombre: 'Cabestro',
  condicion: 1, condicion_nombre: 'Titular',
  morfologia: { id: 12, categoria: 'Potrancas' }, tipo_aptitud: null,
  pruebas: [{ prueba: { id: 1, nombre: 'Rienda' }, categoria: { id: 12, nombre: 'Mayor' }, lista_espera: false }],
  expositor: 'Juan Pérez', cabania: 'La Ñandú',
  puede_baja: false, puede_rehacer: false,
};

describe('mapListado', () => {
  test('mantiene las dos formas: abiertas agrupadas por evento, cerradas planas', () => {
    const r = mapListado({
      abiertas: [{
        evento: { id: 1201, nombre: 'Expo Palermo 2026', inscripcion_hasta: '2026-07-01' },
        inscripciones: [INSCRIPCION],
      }],
      cerradas: [INSCRIPCION],
    });
    expect(r.abiertas).toHaveLength(1);
    expect(r.abiertas[0].evento).toEqual({ id: 1201, nombre: 'Expo Palermo 2026', inscripcionHasta: '2026-07-01' });
    expect(r.abiertas[0].inscripciones[0].id).toBe(180001);
    expect(r.cerradas[0].id).toBe(180001); // plana, no agrupada
  });

  test('conserva el evento abierto sin inscripciones del socio', () => {
    // La API lo devuelve igual, como la web. El mapper lo conserva tal cual:
    // esconderlo es decisión de la pantalla, que hoy lo filtra, y un mapper
    // que descarta datos deja a la pantalla sin opción de cambiar de idea.
    const r = mapListado({
      abiertas: [{ evento: { id: 1201, nombre: 'Expo Palermo 2026' }, inscripciones: [] }],
      cerradas: [],
    });
    expect(r.abiertas).toHaveLength(1);
    expect(r.abiertas[0].inscripciones).toEqual([]);
  });

  test('sin inscripciones devuelve las dos listas vacías', () => {
    expect(mapListado({ abiertas: [], cerradas: [] })).toEqual({ abiertas: [], cerradas: [] });
    expect(mapListado(null)).toEqual({ abiertas: [], cerradas: [] });
  });
});

describe('mapInscripcion', () => {
  test('mapea los campos del listado', () => {
    const i = mapInscripcion(INSCRIPCION);
    expect(i).toMatchObject({
      id: 180001,
      estadoNombre: 'Definitiva',
      sexoNombre: 'Hembra',
      presentacionNombre: 'Cabestro',
      condicionNombre: 'Titular',
      morfologia: 'Potrancas',
      expositor: 'Juan Pérez',
      puedeBaja: false,
    });
    expect(i.animal).toEqual({ id: 'exis:9059010', nombre: 'LA ÑANDÚ', sba: '123456', rp: '45' });
    expect(i.pruebas[0]).toMatchObject({ nombre: 'Rienda', categoria: 'Mayor', listaEspera: false });
  });

  test('morfologia null se deja en null: el «No participa» lo decide la pantalla', () => {
    expect(mapInscripcion({ ...INSCRIPCION, morfologia: null }).morfologia).toBeNull();
  });

  test('las pruebas del detalle traen jinete, yunta y equipo', () => {
    const i = mapInscripcion({
      ...INSCRIPCION,
      pruebas: [{
        prueba: { id: 2, nombre: 'Paleteada' }, categoria: { id: 7, nombre: 'Mayor' }, lista_espera: true,
        jinete: 'PÉREZ JUAN', yunta: { id: 'exis:9059011', nombre: 'LA TROPILLA' },
      }],
    });
    expect(i.pruebas[0]).toMatchObject({ jinete: 'PÉREZ JUAN', listaEspera: true });
    expect(i.pruebas[0].yunta).toMatchObject({ id: 'exis:9059011', nombre: 'LA TROPILLA' });
  });

  test('unidades_relacionadas conserva la dirección (declarado / declarante)', () => {
    const i = mapInscripcion({
      ...INSCRIPCION,
      unidades_relacionadas: [{
        inscripcion: 185950, animal: { id: 'exis:9059011', nombre: 'LA TROPILLA', sba: '123999' },
        expositor: 'Ana Gómez', cabania: 'El Ombú',
        prueba: { id: 2, nombre: 'Paleteada' }, categoria: { id: 7, nombre: 'Mayor' },
        equipo: null, direccion: 'declarado',
      }],
    });
    expect(i.unidadesRelacionadas[0]).toMatchObject({
      inscripcion: 185950, prueba: 'Paleteada', categoria: 'Mayor', direccion: 'declarado',
    });
  });

  test('sin pruebas ni unidades devuelve arrays vacíos, no undefined', () => {
    const i = mapInscripcion({ id: 1 });
    expect(i.pruebas).toEqual([]);
    expect(i.unidadesRelacionadas).toEqual([]);
  });
});

describe('mapCertificado', () => {
  test('arma la ubicación y aplana el pedigree', () => {
    const c = mapCertificado({
      numero: 185901, tipo: 'Definitiva', fecha: '2026-07-14', estado_nombre: 'Aprobada',
      evento: { id: 3287, nombre: 'Palermo 2026' },
      animal: { id: 'exis:1', nombre: 'LA TROPILLA', sba: '9059101', rp: 'M1', nacimiento: '01-03-2015', sexo: 'Hembra', presentacion: 'Cabestro', pelo: 'Gateado' },
      pedigri: { padre: { nombre: 'EL PADRE' }, madre: { nombre: 'LA MADRE' } },
      ubicacion: { provincia: 'Buenos Aires', localidad: 'Luján' },
      morfologia: { categoria: 'Categ. 13' },
      pruebas: [{ prueba: 'Rodeos', categoria: 'Mayor', lista_espera: false, jinete: 'GÓMEZ, ANA', yunta: { nombre: 'LA YUNTA' } }],
    });
    expect(c.ubicacion).toBe('Luján, Buenos Aires');
    expect(c.pedigri.padre.nombre).toBe('EL PADRE');
    expect(c.animal.nacimiento).toBe('01-03-2015');
    expect(c.pruebas[0]).toMatchObject({ nombre: 'Rodeos', jinete: 'GÓMEZ, ANA', yunta: 'LA YUNTA' });
  });

  test('sin ubicación no inventa un string vacío', () => {
    expect(mapCertificado({ numero: 1, ubicacion: null }).ubicacion).toBeNull();
    expect(mapCertificado({ numero: 1, ubicacion: { provincia: '', localidad: '' } }).ubicacion).toBeNull();
  });
});

describe('descargarCertificadoPdf', () => {
  beforeEach(() => { clearSession(); });
  afterEach(() => { clearSession(); });

  test('baja el PDF con el access en el header', async () => {
    setSession({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3 });
    const descargar = jest.fn(async () => 'file:///cache/certificado-7.pdf');

    const uri = await descargarCertificadoPdf(7, descargar);

    expect(descargar).toHaveBeenCalledWith(
      `${API_BASE}/inscripciones/7/certificado.pdf`,
      { Authorization: 'Bearer acc1' },
    );
    expect(uri).toBe('file:///cache/certificado-7.pdf');
  });

  test('sin sesión no intenta bajar nada', async () => {
    const descargar = jest.fn();
    await expect(descargarCertificadoPdf(7, descargar)).rejects.toMatchObject({ status: 401 });
    expect(descargar).not.toHaveBeenCalled();
  });

  test('si el downloader no devuelve archivo, falla con un mensaje mostrable', async () => {
    setSession({ accessToken: 'acc1', refreshToken: 'ref1', expiresAt: Date.now() + 3600e3 });
    await expect(descargarCertificadoPdf(7, async () => null)).rejects.toMatchObject({
      detail: 'No se pudo bajar el certificado',
    });
  });
});

describe('mapBaja', () => {
  test('el 200 de una baja normal: sin rehacer y sin unidades', () => {
    const b = mapBaja({ inscripcion: { id: 185901, estado: 0 }, rehacer: false, unidades_relacionadas: [] });
    expect(b).toEqual({ id: 185901, estado: 0, rehacer: false, unidadesRelacionadas: [] });
  });

  test('con rehacer trae las unidades que quedaron sin el animal', () => {
    // Vienen SÓLO con `rehacer`, y leídas antes de la baja: son las yuntas y
    // los equipos que nombran al animal y hay que rearmar.
    const b = mapBaja({
      inscripcion: { id: 185901, estado: 0 },
      rehacer: true,
      unidades_relacionadas: [
        { inscripcion: 185902, animal: { id: 'exis:2', nombre: 'LA COMPAÑERA' },
          prueba: { id: 2, nombre: 'Paleteada' }, categoria: { id: 7, nombre: 'Mayor' },
          expositor: 'Ana Gómez', direccion: 'declarante' },
      ],
    });
    expect(b.rehacer).toBe(true);
    expect(b.unidadesRelacionadas).toHaveLength(1);
    expect(b.unidadesRelacionadas[0]).toMatchObject({
      inscripcion: 185902, prueba: 'Paleteada', categoria: 'Mayor',
      expositor: 'Ana Gómez', direccion: 'declarante',
    });
    expect(b.unidadesRelacionadas[0].animal.nombre).toBe('LA COMPAÑERA');
  });

  test('un cuerpo incompleto no rompe: rehacer sólo con true explícito', () => {
    // `rehacer` decide si se muestra «ya podés volver a inscribirlo», que es
    // falso si el campo no vino.
    expect(mapBaja({}).rehacer).toBe(false);
    expect(mapBaja({ rehacer: 1 }).rehacer).toBe(false);
    expect(mapBaja({}).id).toBeNull();
    expect(mapBaja(undefined).unidadesRelacionadas).toEqual([]);
  });
});
