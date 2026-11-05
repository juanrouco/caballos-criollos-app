import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, Card, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { useAuth } from '../AuthContext';
import { useMenu } from '../MenuContext';
import {
  fetchInscripciones, fetchInscripcion, fetchCertificado, bajaInscripcion,
  mapListado, mapInscripcion, mapCertificado, mapBaja, descargarCertificadoPdf,
} from '../api';
import { textoErrorBaja } from '../erroresInscripcion';
import { descargarArchivo, compartirArchivo } from '../descargas';
import AltaInscripcionScreen from './AltaInscripcionScreen';

// Sección "Mis inscripciones": las del socio logueado, su detalle y el
// certificado. Overlay del menú lateral, así que recibe t / topInset / onBack
// por props y las sub-pantallas son sub-estados, no rutas.
//
// El listado trae dos colecciones con formas distintas (docs/README.md
// §Inscripciones): `abiertas` viene agrupada por evento y `cerradas` es una
// lista plana. Por eso son dos secciones y no una lista sola.
//
// La API manda también los eventos con inscripción abierta donde el socio no
// anotó nada (como la web). Acá NO se muestran: con una cuenta sin
// inscripciones la pantalla entera quedaba llena de "todavía no te
// inscribiste", una card por evento, y enterraba lo que el socio vino a ver.
// El mapper los conserva igual — filtrar es decisión de la pantalla.

export default function InscripcionesScreen({ t, topInset, onBack }) {
  const { status } = useAuth();
  const { openSection } = useMenu();
  const [vista, setVista] = React.useState({ nombre: 'lista' }); // lista | detalle | certificado
  // Las pantallas de eliminar (confirmar, resultado) son sub-estados DENTRO
  // del detalle, pero el header es de acá. Sin esto el título seguía diciendo
  // «Inscripción» mientras se preguntaba si eliminar, y la flecha de arriba
  // saltaba al listado salteándose el detalle. El hijo avisa qué corresponde.
  const [sub, setSub] = React.useState(null); // { titulo, volver } | null

  React.useEffect(() => { if (status === 'out') setVista({ nombre: 'lista' }); }, [status]);

  // El alta trae su propio header: tiene navegación por pasos y el botón de
  // volver tiene que retroceder un paso, no cerrar la sección.
  if (status === 'in' && vista.nombre === 'alta') {
    return (
      <AltaInscripcionScreen
        t={t}
        topInset={topInset}
        onSalir={() => setVista({ nombre: 'lista' })}
        onHecho={() => setVista({ nombre: 'lista', recarga: Date.now() })}
      />
    );
  }

  const titulo = sub?.titulo
    ?? (vista.nombre === 'certificado' ? 'Certificado'
      : vista.nombre === 'detalle' ? 'Inscripción'
      : 'Mis inscripciones');

  const volver = () => {
    if (sub?.volver) return sub.volver();
    if (vista.nombre === 'certificado') return setVista({ nombre: 'detalle', id: vista.id });
    if (vista.nombre === 'detalle') return setVista({ nombre: 'lista' });
    return onBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={volver} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }} numberOfLines={1}>{titulo}</Text>
        {/* Inscribir vive en el header y no al pie del listado: al pie hay que
            scrollear todas las inscripciones anteriores para llegar. */}
        {status === 'in' && vista.nombre === 'lista' && (
          <TouchableOpacity
            onPress={() => setVista({ nombre: 'alta' })}
            accessibilityLabel="Inscribir un animal"
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" size={20} color={t.bg} />
          </TouchableOpacity>
        )}
      </View>

      {status === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : status === 'out' ? (
        <SinSesion t={t} onIngresar={() => openSection('cuenta')} />
      ) : vista.nombre === 'certificado' ? (
        <CertificadoView t={t} id={vista.id} />
      ) : vista.nombre === 'detalle' ? (
        <DetalleView
          t={t} id={vista.id}
          onSubvista={setSub}
          onCertificado={() => setVista({ nombre: 'certificado', id: vista.id })}
          // La inscripción que se dio de baja ya no va en el listado: se
          // recarga, igual que después de un alta.
          onBajaHecha={() => setVista({ nombre: 'lista', recarga: Date.now() })}
        />
      ) : (
        <ListaView
          t={t}
          recarga={vista.recarga}
          onAbrir={(id) => setVista({ nombre: 'detalle', id })}
        />
      )}
    </View>
  );
}

function SinSesion({ t, onIngresar }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="user" size={30} color={t.textMute} stroke={1.8} />
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
        Entrá con tu cuenta para ver las inscripciones de tus animales.
      </Text>
      <TouchableOpacity onPress={onIngresar} style={{ paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, backgroundColor: t.accent }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: t.bg }}>Ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

// Carga + estados de error/vacío, que son iguales en las tres vistas.
function useCarga(cargar, deps) {
  const [dato, setDato] = React.useState(null); // null = cargando
  const [error, setError] = React.useState(null);
  const [intento, setIntento] = React.useState(0);
  React.useEffect(() => {
    let cancelado = false;
    setDato(null); setError(null);
    cargar()
      .then((d) => { if (!cancelado) setDato(d); })
      .catch((e) => { if (!cancelado) setError(e?.detail || e?.message || 'No se pudo cargar'); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento]);
  return { dato, error, reintentar: () => setIntento((n) => n + 1) };
}

function Estado({ t, error, onReintentar }) {
  if (error) {
    return (
      <Card t={t} style={{ padding: 16, marginHorizontal: 20 }}>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, lineHeight: 19 }}>{error}</Text>
        <TouchableOpacity onPress={onReintentar} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <Icon name="refresh" size={15} color={t.accent} />
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.accent }}>Reintentar</Text>
        </TouchableOpacity>
      </Card>
    );
  }
  return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>;
}

// ── Listado ────────────────────────────────────────────────────────

function ListaView({ t, recarga, onAbrir }) {
  const { dato, error, reintentar } = useCarga(
    () => fetchInscripciones().then(mapListado), [recarga],
  );

  if (!dato) return <Estado t={t} error={error} onReintentar={reintentar} />;

  // Sólo los eventos abiertos donde el socio tiene algo anotado.
  const abiertas = dato.abiertas.filter((g) => g.inscripciones.length > 0);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <SectionLabel t={t}>Inscripciones abiertas</SectionLabel>
      {abiertas.length === 0 ? (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginHorizontal: 20, marginBottom: 18 }}>
          No hay inscripciones a eventos abiertos
        </Text>
      ) : (
        abiertas.map((g) => (
          <View key={g.evento.id} style={{ marginHorizontal: 20, marginBottom: 18 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text }} numberOfLines={2}>{g.evento.nombre}</Text>
            {g.evento.inscripcionHasta && (
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
                Cierra el {formatDate(g.evento.inscripcionHasta)}
              </Text>
            )}
            <View style={{ gap: 10, marginTop: 10 }}>
              {g.inscripciones.map((i) => <FilaInscripcion key={i.id} t={t} i={i} onPress={() => onAbrir(i.id)} />)}
            </View>
          </View>
        ))
      )}

      {dato.cerradas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 6 }}>Inscripciones anteriores</SectionLabel>
          <View style={{ marginHorizontal: 20, gap: 10 }}>
            {dato.cerradas.map((i) => (
              <FilaInscripcion key={i.id} t={t} i={i} conEvento onPress={() => onAbrir(i.id)} />
            ))}
          </View>
        </>
      )}

    </ScrollView>
  );
}

function FilaInscripcion({ t, i, conEvento, onPress }) {
  // Muchos eventos ya llevan la fecha en el nombre ("EXPO SALADILLO
  // 16/10/2026"), así que agregarla otra vez la duplica. Sólo la sumamos si no
  // está ya en el texto.
  const fechaEvento = i.evento?.fecha ? formatDate(i.evento.fecha) : null;
  const sumarFecha = !!fechaEvento && !(i.evento?.nombre || '').includes(fechaEvento);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card t={t} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={1}>
              {i.animal?.nombre || 'Sin nombre'}
            </Text>
            <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
              {[i.animal?.sba && `S.B.A. ${i.animal.sba}`, i.animal?.rp && `R.P. ${i.animal.rp}`].filter(Boolean).join(' · ')}
            </Text>
            {conEvento && i.evento?.nombre && (
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textDim, marginTop: 4 }} numberOfLines={1}>
                {i.evento.nombre}{sumarFecha ? ` · ${fechaEvento}` : ''}
              </Text>
            )}
          </View>
          <Icon name="arrow" size={16} color={t.textMute} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {i.estadoNombre && <Chip t={t} label={i.estadoNombre} />}
          {i.morfologia && <Chip t={t} label="Morfología" />}
          {i.pruebas.map((p, n) => <Chip key={n} t={t} label={p.nombre || 'Prueba'} />)}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function Chip({ t, label }) {
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: withAlpha(t.accent, 0.13) }}>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 10.5, color: t.accent }}>{label}</Text>
    </View>
  );
}

// ── Detalle ────────────────────────────────────────────────────────

function DetalleView({ t, id, onCertificado, onBajaHecha, onSubvista }) {
  const { dato, error, reintentar } = useCarga(
    () => fetchInscripcion(id).then((r) => mapInscripcion(r?.inscripcion)), [id],
  );
  const [confirmando, setConfirmando] = React.useState(false);
  const [bajando, setBajando] = React.useState(false);
  const [errorBaja, setErrorBaja] = React.useState(null);
  const [hecha, setHecha] = React.useState(null); // el 200 de la baja

  const salirDeConfirmar = () => { setConfirmando(false); setErrorBaja(null); };

  const confirmar = async () => {
    setBajando(true); setErrorBaja(null);
    try {
      setHecha(mapBaja(await bajaInscripcion(id)));
    } catch (e) {
      // El 409 y el 422 contradicen lo que esta pantalla mostraba: el plazo se
      // cerró, se cargó un resultado o alguien ya la dio de baja. El texto lo
      // dice y la pantalla se queda en la confirmación, que es de donde el
      // socio puede volver y recargar.
      setErrorBaja(textoErrorBaja(e));
    } finally {
      setBajando(false);
    }
  };

  // Lo que el header tiene que decir y adónde tiene que volver en cada una de
  // las tres pantallas. `setSub` del padre es estable, así que no reentra.
  React.useEffect(() => {
    if (hecha) onSubvista?.({ titulo: 'Inscripción eliminada', volver: onBajaHecha });
    else if (confirmando) onSubvista?.({ titulo: 'Eliminar inscripción', volver: salirDeConfirmar });
    else onSubvista?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmando, !!hecha]);
  // Al dejar el detalle, el header vuelve a ser del padre.
  React.useEffect(() => () => onSubvista?.(null), [onSubvista]);

  // El resultado reemplaza el detalle entero: la inscripción que se estaba
  // mirando ya no está activa, así que seguir mostrando sus datos como si nada
  // sería mentir.
  if (hecha) return <BajaHecha t={t} baja={hecha} onCerrar={onBajaHecha} />;
  if (!dato) return <Estado t={t} error={error} onReintentar={reintentar} />;
  if (confirmando) {
    return (
      <ConfirmarBaja
        t={t} dato={dato} bajando={bajando} error={errorBaja}
        onConfirmar={confirmar}
        onVolver={salirDeConfirmar}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>{dato.animal?.nombre || 'Sin nombre'}</Text>
      {dato.evento?.nombre && (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 4 }}>
          {dato.evento.nombre}{dato.evento.fecha ? ` · ${formatDate(dato.evento.fecha)}` : ''}
        </Text>
      )}

      <Card t={t} style={{ marginTop: 18 }}>
        <Dato t={t} label="Estado" value={dato.estadoNombre} />
        <Dato t={t} label="S.B.A. / R.P." value={[dato.animal?.sba, dato.animal?.rp].filter(Boolean).join(' / ')} />
        <Dato t={t} label="Sexo" value={dato.sexoNombre} />
        <Dato t={t} label="Presentación" value={dato.presentacionNombre} />
        <Dato t={t} label="Condición" value={dato.condicionNombre} />
        {/* null es «No Participa», igual que en la web. */}
        <Dato t={t} label="Morfología" value={dato.morfologia || 'No participa'} />
        <Dato t={t} label="Expositor" value={dato.expositor} />
        <Dato t={t} label="Cabaña" value={dato.cabania} last />
      </Card>

      {dato.pruebas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Pruebas</SectionLabel>
          <Card t={t}>
            {dato.pruebas.map((p, n) => (
              <View key={n}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: t.text, flex: 1 }}>
                      {p.nombre}{p.categoria ? ` · ${p.categoria}` : ''}
                    </Text>
                    {p.listaEspera && <Chip t={t} label="Lista de espera" />}
                  </View>
                  {[['Jinete', p.jinete], ['Domador', p.domador], ['Yunta', p.yunta?.nombre], ['Equipo', p.equipo]]
                    .filter(([, v]) => !!v)
                    .map(([k, v]) => (
                      <Text key={k} style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, marginTop: 4 }}>
                        {k}: {v}
                      </Text>
                    ))}
                </View>
                {n < dato.pruebas.length - 1 && <Divider t={t} />}
              </View>
            ))}
          </Card>
        </>
      )}

      {dato.unidadesRelacionadas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Yuntas y equipos</SectionLabel>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, lineHeight: 18, marginBottom: 10 }}>
            Inscripciones que comparten prueba con este animal.
          </Text>
          <Card t={t}>
            {dato.unidadesRelacionadas.map((u, n) => (
              <View key={n}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: t.text }} numberOfLines={1}>
                    {u.animal?.nombre || 'Sin nombre'}
                  </Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, marginTop: 4 }}>
                    {[u.prueba, u.categoria, u.expositor].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {n < dato.unidadesRelacionadas.length - 1 && <Divider t={t} />}
              </View>
            ))}
          </Card>
        </>
      )}

      <TouchableOpacity
        onPress={onCertificado}
        style={{ marginTop: 24, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent }}
      >
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Ver certificado</Text>
      </TouchableOpacity>

      {/* `puede_baja` es el mismo predicado que evalúa el DELETE, así que el
          botón aparece exactamente cuando la web ofrece Eliminar — y se llama
          igual que ahí. Sin relleno y en rojo: no es la acción que el socio
          vino a hacer. */}
      {dato.puedeBaja && (
        <TouchableOpacity
          onPress={() => setConfirmando(true)}
          accessibilityLabel="Eliminar la inscripción"
          style={{ marginTop: 10, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: withAlpha(t.live, 0.45) }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.live }}>Eliminar inscripción</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Baja ───────────────────────────────────────────────────────────

// Eliminar no se deshace desde la app (rehacer lo habilita la Asociación), así
// que la confirmación es su propia pantalla y no un botón que actúa al toque.
// Lo que dice arriba de todo es qué se pierde, no qué se aprieta.
//
// En la API y en el núcleo esto es «la baja» y así se llaman las funciones; de
// cara al socio es «eliminar», que es la palabra que usa la web en el mismo
// lugar. El certificado sí conserva su nombre: es «el certificado de baja».
function ConfirmarBaja({ t, dato, bajando, error, onConfirmar, onVolver }) {
  return (
    // `flexGrow: 1` para que los botones se vayan al pie: sin avisos de rehacer
    // ni unidades —el caso normal— la pregunta ocupa cuatro líneas y los
    // botones quedaban flotando arriba con media pantalla vacía debajo.
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>¿Eliminar esta inscripción?</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20, marginTop: 8 }}>
        {dato.animal?.nombre || 'Este animal'}
        {dato.evento?.nombre ? ` en ${dato.evento.nombre}` : ''}.
        {' '}Para volver a inscribirlo necesitás que la Asociación lo habilite.
      </Text>

      {/* Con el plazo cerrado la baja gasta la habilitación de rehacer, que es
          de un solo uso: si después quiere volver atrás, hay que pedir otra. */}
      {dato.puedeRehacer && (
        <Card t={t} style={{ padding: 15, marginTop: 16, borderColor: withAlpha(t.live, 0.35) }}>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.live, lineHeight: 19 }}>
            La inscripción a este evento ya cerró. Esta baja usa la habilitación
            para rehacer que te dio la Asociación, y queda usada.
          </Text>
        </Card>
      )}

      {/* Las yuntas y los equipos que nombran a este animal quedan incompletos.
          Es la misma alerta que la web muestra al eliminar. */}
      {dato.unidadesRelacionadas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Queda sin este animal</SectionLabel>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, lineHeight: 18, marginBottom: 10 }}>
            Estas yuntas y equipos lo nombran: si lo das de baja, hay que rearmarlos.
          </Text>
          <Card t={t}>
            {dato.unidadesRelacionadas.map((u, n) => (
              <View key={n}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: t.text }} numberOfLines={1}>
                    {u.animal?.nombre || 'Sin nombre'}
                  </Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, marginTop: 4 }}>
                    {[u.prueba, u.categoria, u.expositor].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {n < dato.unidadesRelacionadas.length - 1 && <Divider t={t} />}
              </View>
            ))}
          </Card>
        </>
      )}

      {!!error && (
        <Card t={t} style={{ padding: 15, marginTop: 16, borderColor: withAlpha(t.live, 0.35) }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.text, lineHeight: 19 }}>{error}</Text>
        </Card>
      )}

      {/* El relleno va en Cancelar, no en Aceptar. Esto no se deshace desde la
          app, así que lo que tiene que ser fácil de apretar sin mirar es la
          salida — y va abajo de todo, donde cae el pulgar, igual que el
          Cancelar de iOS. Aceptar queda arriba, en rojo y sin relleno:
          visible, pero no es lo que la mano encuentra sola.

          «Aceptar» no dice por sí solo qué se acepta, así que el peso lo
          sostiene la pregunta del título y el rojo del botón. */}
      <View style={{ marginTop: 'auto', paddingTop: 24 }}>
        <TouchableOpacity
          onPress={bajando ? undefined : onConfirmar}
          disabled={bajando}
          accessibilityLabel="Aceptar que se elimina"
          style={{ padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: withAlpha(t.live, 0.45), opacity: bajando ? 0.6 : 1 }}
        >
          {bajando
            ? <ActivityIndicator color={t.live} />
            : <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.live }}>Aceptar</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onVolver} disabled={bajando}
          accessibilityLabel="Cancelar y volver"
          style={{ marginTop: 10, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent, opacity: bajando ? 0.6 : 1 }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function BajaHecha({ t, baja, onCerrar }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      {/* El título lo pone ahora el header de la sección; acá iba repetido. */}
      {/* El certificado de baja lo manda la API sólo si el evento es del año en
          curso, y un problema con el mail no cambia el 200. Así que se menciona
          sin prometerlo. Se llama así —«de baja»— porque ése es el nombre del
          documento, aunque el botón diga eliminar. */}
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20, marginTop: 8 }}>
        Si el evento es de este año, el certificado de baja te llega por mail.
      </Text>

      {baja.rehacer && (
        <Card t={t} style={{ padding: 15, marginTop: 16 }}>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.text, lineHeight: 19 }}>
            Se usó la habilitación para rehacer: ya podés volver a inscribir este animal.
          </Text>
        </Card>
      )}

      {/* Vienen sólo con `rehacer`, leídas antes de la baja. El socio tiene que
          saber qué otras inscripciones quedaron tocadas. */}
      {baja.unidadesRelacionadas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Quedaron sin este animal</SectionLabel>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, lineHeight: 18, marginBottom: 10 }}>
            Estas yuntas y equipos lo nombraban: hay que rearmarlos.
          </Text>
          <Card t={t}>
            {baja.unidadesRelacionadas.map((u, n) => (
              <View key={n}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: t.text }} numberOfLines={1}>
                    {u.animal?.nombre || 'Sin nombre'}
                  </Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, marginTop: 4 }}>
                    {[u.prueba, u.categoria, u.expositor].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {n < baja.unidadesRelacionadas.length - 1 && <Divider t={t} />}
              </View>
            ))}
          </Card>
        </>
      )}

      <TouchableOpacity
        onPress={onCerrar}
        style={{ marginTop: 24, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent }}
      >
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Volver a mis inscripciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Dato({ t, label, value, last }) {
  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 5 }}>{label}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14.5, color: value ? t.text : t.textDim }}>{value || '—'}</Text>
      </View>
      {!last && <Divider t={t} />}
    </>
  );
}

// ── Certificado ────────────────────────────────────────────────────

function CertificadoView({ t, id }) {
  const { dato, error, reintentar } = useCarga(
    () => fetchCertificado(id).then((r) => mapCertificado(r?.certificado)), [id],
  );
  const [bajando, setBajando] = React.useState(false);
  const [avisoPdf, setAvisoPdf] = React.useState(null);

  const compartir = async () => {
    setBajando(true); setAvisoPdf(null);
    try {
      const uri = await descargarCertificadoPdf(id, (url, headers) =>
        descargarArchivo(url, headers, `certificado-${id}.pdf`));
      const ok = await compartirArchivo(uri, { mimeType: 'application/pdf', titulo: 'Certificado de inscripción' });
      if (!ok) setAvisoPdf('Este teléfono no tiene con qué compartir el archivo.');
    } catch (e) {
      setAvisoPdf(e?.detail || e?.message || 'No se pudo bajar el certificado');
    } finally {
      setBajando(false);
    }
  };

  if (!dato) return <Estado t={t} error={error} onReintentar={reintentar} />;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>{dato.animal?.nombre || 'Sin nombre'}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 4 }}>
        {[dato.evento?.nombre, dato.tipo && `Inscripción ${dato.tipo}`].filter(Boolean).join(' · ')}
      </Text>

      <Card t={t} style={{ marginTop: 18 }}>
        <Dato t={t} label="Número" value={dato.numero != null ? String(dato.numero) : null} />
        <Dato t={t} label="Estado" value={dato.estadoNombre} />
        <Dato t={t} label="Fecha" value={dato.fecha ? formatDate(dato.fecha) : null} />
        <Dato t={t} label="Nacimiento" value={dato.animal?.nacimiento} />
        <Dato t={t} label="Sexo y presentación" value={[dato.animal?.sexo, dato.animal?.presentacion].filter(Boolean).join(' · ')} />
        <Dato t={t} label="Pelo" value={dato.animal?.pelo} />
        <Dato t={t} label="Criador" value={dato.criador} />
        <Dato t={t} label="Propietario" value={dato.propietario} />
        <Dato t={t} label="Expositor" value={dato.expositor} />
        <Dato t={t} label="Ubicación" value={dato.ubicacion} last />
      </Card>

      {dato.pruebas.length > 0 && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Pruebas</SectionLabel>
          <Card t={t}>
            {dato.pruebas.map((p, i) => (
              <Dato
                key={`${p.nombre}-${p.categoria}-${i}`}
                t={t}
                label={[p.nombre, p.categoria].filter(Boolean).join(' · ')}
                value={[
                  p.jinete && `Jinete: ${p.jinete}`,
                  p.domador && `Domador: ${p.domador}`,
                  p.listaEspera && 'Lista de espera',
                ].filter(Boolean).join(' · ')}
                last={i === dato.pruebas.length - 1}
              />
            ))}
          </Card>
        </>
      )}

      {dato.noInspeccionado && !!dato.avisoNoInspeccionado && (
        <Card t={t} style={{ marginTop: 18, borderColor: withAlpha(t.live, 0.4) }}>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.live, lineHeight: 19 }}>
            {dato.avisoNoInspeccionado}
          </Text>
        </Card>
      )}

      {(dato.pedigri?.padre || dato.pedigri?.madre) && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Pedigree</SectionLabel>
          <Card t={t}>
            <Dato t={t} label="Padre" value={dato.pedigri.padre?.nombre} />
            <Dato t={t} label="Madre" value={dato.pedigri.madre?.nombre} last />
          </Card>
        </>
      )}

      <TouchableOpacity
        onPress={compartir}
        disabled={bajando}
        style={{ marginTop: 24, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bajando ? t.surface2 : t.accent }}
      >
        {bajando
          ? <ActivityIndicator color={t.textMute} />
          : <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Compartir PDF</Text>}
      </TouchableOpacity>
      {avisoPdf && (
        <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.live, marginTop: 12, lineHeight: 18 }}>{avisoPdf}</Text>
      )}
    </ScrollView>
  );
}
