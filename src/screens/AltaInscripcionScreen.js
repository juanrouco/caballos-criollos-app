import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Keyboard, useWindowDimensions } from 'react-native';
import { Icon, Card, Divider, SectionLabel, Field, Boton, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { describirErrores } from '../erroresInscripcion';
import {
  fetchEventosAlta, buscarAnimalesAlta, fetchOpcionesAlta, buscarJinetes, buscarDomadores, crearInscripcion,
  mapEventoAlta, mapAnimalAlta, mapOpciones, mapJinete, mapAltaCreada, animalAPayload,
  fetchAnimalPedigree, fetchAlertasAlta, fetchCabanias, mapAlertas,
} from '../api';
import HtmlBody from '../HtmlBody';

// Alta de inscripción, en pasos: evento → animal → datos → participación →
// confirmar. Primer tramo: morfología y pruebas individuales con jinete. Las
// pruebas de yunta y de equipo se listan pero no se pueden elegir todavía.
//
// Las reglas NO viven acá: las valida el servidor antes de escribir, y si algo
// no cumple contesta 422 con la lista de códigos (docs/README.md
// §Inscripciones). Este asistente existe para que el socio elija bien, no para
// decidir si puede. Por eso "habilitada" y "cupo" guían la selección, pero el
// que manda es el POST: entre que se pinta la pantalla y que se confirma puede
// entrar otro expositor y llenar el cupo.

const PASOS = ['evento', 'avisoEvento', 'animal', 'datos', 'participacion', 'confirmar'];
const TITULOS = {
  alertas: 'Antes de empezar',
  evento: 'Elegí el evento',
  avisoEvento: 'Condiciones del evento',
  animal: 'Elegí el animal',
  datos: 'Datos de la inscripción',
  participacion: 'Participación',
  alerta3: 'Antes de confirmar',
  confirmar: 'Confirmar',
  jinete: 'Elegí el jinete',
  domador: 'Elegí el domador',
  listo: 'Inscripción confirmada',
};

const SEXOS = [{ v: 1, label: 'Macho' }, { v: 2, label: 'Hembra' }, { v: 0, label: 'Castrado' }];

export default function AltaInscripcionScreen({ t, topInset, onSalir, onHecho }) {
  const [paso, setPaso] = React.useState('alertas');
  const [sel, setSel] = React.useState({
    evento: null, animal: null, sexo: null, presentacion: null,
    cabania: '', provincia: '', localidad: '', renspa: '',
    morfologia: null, tipoAptitud: null, pruebas: [],
  });
  // Dónde guardar el jinete que se elija en el paso 'jinete'.
  const [destinoJinete, setDestinoJinete] = React.useState(null);
  const [resultado, setResultado] = React.useState(null);

  const set = (cambios) => setSel((s) => ({ ...s, ...cambios }));

  const atras = () => {
    if (paso === 'alertas') return onSalir();
    // El aviso no está en PASOS: su vuelta es a participación, y desde
    // confirmar también, para no obligar a aceptarlo de nuevo.
    if (paso === 'alerta3') return setPaso('participacion');
    if (paso === 'jinete') return setPaso('participacion');
    if (paso === 'listo') return onHecho();
    const i = PASOS.indexOf(paso);
    if (i <= 0) return onSalir();
    setPaso(PASOS[i - 1]);
  };

  const elegirJinete = (destino) => { setDestinoJinete(destino); setPaso('jinete'); };

  const guardarJinete = (persona) => {
    const rol = destinoJinete?.rol === 'domador' ? 'domador' : 'jinete';
    if (destinoJinete?.tipo === 'morfologia') set({ morfologia: { jinete: persona } });
    if (destinoJinete?.tipo === 'tipoAptitud') set({ tipoAptitud: { jinete: persona } });
    if (destinoJinete?.tipo === 'prueba') {
      set({ pruebas: sel.pruebas.map((p) => (p.prueba === destinoJinete.id ? { ...p, [rol]: persona } : p)) });
    }
    setDestinoJinete(null);
    setPaso('participacion');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={atras} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: t.text, flex: 1 }} numberOfLines={1}>
          {paso === 'jinete' && destinoJinete?.rol === 'domador' ? TITULOS.domador : TITULOS[paso]}
        </Text>
      </View>

      {paso === 'alertas' && <PasoAlertas t={t} onSeguir={() => setPaso('evento')} onSalir={onSalir} />}
      {paso === 'evento' && <PasoEvento t={t} onElegir={(evento) => { set({ evento }); setPaso('avisoEvento'); }} />}
      {paso === 'avisoEvento' && (
        <PasoAvisoEvento t={t} evento={sel.evento} onSeguir={() => setPaso('animal')} onVolver={() => setPaso('evento')} />
      )}
      {paso === 'animal' && (
        <PasoAnimal t={t} evento={sel.evento} onElegir={(animal, sexo, presentacion) => {
          set({ animal, sexo, presentacion }); setPaso('datos');
        }} />
      )}
      {paso === 'datos' && <PasoDatos t={t} sel={sel} set={set} onSeguir={() => setPaso('participacion')} />}
      {paso === 'participacion' && (
        <PasoParticipacion
          t={t} sel={sel} set={set} onJinete={elegirJinete}
          // El aviso del evento (alerta3) es una pantalla propia, como en la
          // web; si el evento no lo trae, se saltea.
          onSeguir={() => setPaso(tieneContenido(sel.evento?.alerta3) ? 'alerta3' : 'confirmar')}
        />
      )}
      {paso === 'jinete' && (
        <PasoJinete t={t} evento={sel.evento} rol={destinoJinete?.rol} onElegir={guardarJinete} />
      )}
      {paso === 'alerta3' && (
        <PasoAlerta3 t={t} evento={sel.evento} onSeguir={() => setPaso('confirmar')} onVolver={() => setPaso('participacion')} />
      )}
      {paso === 'confirmar' && (
        <PasoConfirmar t={t} sel={sel} onHecho={(r) => { setResultado(r); setPaso('listo'); }} />
      )}
      {paso === 'listo' && <PasoListo t={t} resultado={resultado} onCerrar={onHecho} />}
    </View>
  );
}

// ── Estados compartidos ────────────────────────────────────────────

function Cargando({ t }) {
  return <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>;
}

function ErrorCard({ t, texto, onReintentar }) {
  return (
    <Card t={t} style={{ padding: 16, marginHorizontal: 20 }}>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, lineHeight: 19 }}>{texto}</Text>
      {onReintentar && (
        <TouchableOpacity onPress={onReintentar} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <Icon name="refresh" size={15} color={t.accent} />
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.accent }}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const mensaje = (e) => e?.detail || e?.message || 'No se pudo completar la operación';

// ¿Este HTML tiene algo para mostrar? Sin tags ni espacios duros no queda nada
// en varios avisos guardados (`<p>&nbsp;</p>`, `<br>`), y pintarlos igual deja
// una pantalla vacía que el socio tiene que aceptar.
// Texto comparable: sin tags, sin entidades de espacio y sin espacios de más.
// Sirve para saber si dos avisos dicen lo mismo aunque el HTML difiera.
function textoPlano(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Deja una sola aparición de cada texto, la primera (que es la que conserva su
// título, si lo tenía).
function dedup(paginas) {
  const vistos = new Set();
  return paginas.filter((p) => {
    const clave = textoPlano(p.html);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function tieneContenido(html) {
  if (!html) return false;
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim().length > 0;
}

// ── Avisos ─────────────────────────────────────────────────────────

// Los avisos son textos largos (el de un evento son varias pantallas de
// reglamento). Con el botón al final del scroll hay que bajar hasta el fondo
// para aceptar, y mientras el WebView se mide el botón se corre de lugar: un
// toque cae donde el botón ya no está. Por eso el pie va FIJO, fuera del
// scroll, y no se mueve nunca.
function PieAceptar({ t, etiqueta, texto, onAceptar, onVolver }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg }}>
      <Boton t={t} label={texto || 'Aceptar'} accessibilityLabel={etiqueta} onPress={onAceptar} />
      <TouchableOpacity onPress={onVolver} style={{ alignSelf: 'center', paddingTop: 12 }}>
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, color: t.textMute }}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

// Un aviso como popup, igual que la web: título arriba, el HTML adentro y
// «Aceptar» para pasar al siguiente. Lo usan los avisos generales (antes de
// elegir el evento) y los del evento.
function Popup({ t, aviso, onAceptar }) {
  // El modal es más angosto que la pantalla: 24 de margen a cada lado. HtmlBody
  // ya se pone 20 de padding por su cuenta, así que el ancho útil del WebView
  // es el del modal menos esos 40 — y el ScrollView no agrega padding lateral,
  // o se duplicaría.
  const { width } = useWindowDimensions();
  const anchoTexto = width - 48 - 40;
  return (
    <Modal visible={!!aviso} transparent animationType="fade" statusBarTranslucent onRequestClose={onAceptar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxHeight: '80%', borderRadius: 14, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 13, backgroundColor: t.surface2, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text }} numberOfLines={2}>
              {aviso?.titulo || 'Aviso'}
            </Text>
          </View>
          {/* HtmlBody pone su propio margen lateral (width - 40): va sin
              padding alrededor, o el contenido se corta a la derecha. */}
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            {aviso?.html && <HtmlBody html={aviso.html} t={t} ancho={anchoTexto} />}
          </ScrollView>
          <View style={{ padding: 16, paddingTop: 0 }}>
            <Boton t={t} label="Aceptar" accessibilityLabel="Aceptar aviso" onPress={onAceptar} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── 0. Alertas ─────────────────────────────────────────────────────

function PasoAlertas({ t, onSeguir, onSalir }) {
  const [datos, setDatos] = React.useState(null);
  // Los avisos salen como la web: primero los popups, uno por uno, y recién
  // después la página de términos. El texto de `terminos` repite el de la
  // última alerta (la web lo imprime así y la API lo replica a propósito), así
  // que sí, el socio lo ve dos veces: una en el popup y otra en la página. Es
  // lo que la web hace y lo que pide el contrato.
  const [popup, setPopup] = React.useState(0);

  React.useEffect(() => {
    let cancelado = false;
    fetchAlertasAlta()
      .then((r) => {
        if (cancelado) return;
        const d = mapAlertas(r);
        // Sin alertas ni términos la web redirige directo al paso 1.
        if (!d.hayAlgo) return onSeguir();
        setDatos(d);
      })
      // Son informativas: si la lectura falla no vale la pena trabar el alta.
      .catch(() => { if (!cancelado) onSeguir(); })
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!datos) return <Cargando t={t} />;

  const conTexto = datos.alertas.filter((a) => tieneContenido(a.html) || a.titulo);
  const alertaActual = conTexto[popup] || null;

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 10, paddingHorizontal: 20 }}>
          Términos y condiciones generales
        </Text>
        {tieneContenido(datos.terminos)
          ? <HtmlBody html={datos.terminos} t={t} />
          : <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, paddingHorizontal: 20 }}>Sin términos para mostrar.</Text>}
      </ScrollView>

      <PieAceptar t={t} etiqueta="Aceptar términos" onAceptar={onSeguir} onVolver={onSalir} />

      {/* Un popup por alerta, en el orden de la web: la primera es el primero. */}
      <Popup t={t} aviso={alertaActual} onAceptar={() => setPopup((n) => n + 1)} />
    </>
  );
}

// ── 1. Evento ──────────────────────────────────────────────────────

function PasoEvento({ t, onElegir }) {
  const [eventos, setEventos] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelado = false;
    fetchEventosAlta()
      .then((r) => { if (!cancelado) setEventos((Array.isArray(r) ? r : r?.data || []).map(mapEventoAlta)); })
      .catch((e) => { if (!cancelado) setError(mensaje(e)); });
    return () => { cancelado = true; };
  }, []);

  if (error) return <ErrorCard t={t} texto={error} />;
  if (!eventos) return <Cargando t={t} />;
  if (eventos.length === 0) {
    return (
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, marginHorizontal: 20, lineHeight: 20 }}>
        No hay eventos con la inscripción abierta en este momento.
      </Text>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
      {eventos.map((e) => (
        <TouchableOpacity key={e.id} onPress={() => onElegir(e)} activeOpacity={0.8}>
          <Card t={t} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{e.nombre}</Text>
                {e.inscripcionHasta && (
                  <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
                    Cierra el {formatDate(e.inscripcionHasta)}
                  </Text>
                )}
              </View>
              <Icon name="arrow" size={16} color={t.textMute} />
            </View>
            {e.porRehacer && (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.accent, marginTop: 8 }}>
                Habilitado para rehacer
              </Text>
            )}
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── 1-bis. Condiciones del evento ──────────────────────────────────

// Lo que la web muestra en expositores_alerta2.php (y alerta3.php) después de
// elegir el evento: las condiciones de ESE evento — tarifas, cierre de
// inscripciones, reglas de funcionales. Vienen en el propio evento de A1.
//
// Si el evento no trae ninguna, el paso se saltea: no tiene sentido una
// pantalla con un botón y nada arriba.
function PasoAvisoEvento({ t, evento, onSeguir, onVolver }) {
  // Todo lo que el evento tenga para avisar, como páginas: un «Aceptar» por
  // pantalla. Antes los `alertas` iban como popup ENCIMA de la página, y eso
  // obligaba a dos clicks para pasar un solo aviso — el popup no avanzaba el
  // paso, sólo se cerraba.
  //
  // Se saltean las que no tienen contenido visible: `alerta3` suele venir con
  // HTML vacío (`<p>&nbsp;</p>`), y una pantalla en blanco con un botón es un
  // click al pedo.
  //
  // Y se descartan las repetidas: el evento suele traer el MISMO texto en su
  // aviso y en `alerta2` (la misma duplicación que `terminos` con la última
  // alerta). Dos páginas seguidas con el mismo contenido parecen un botón que
  // no responde — tocás Aceptar, cambia de página y ves exactamente lo mismo.
  // `alerta3` NO va acá: en la web es expositores_alerta3.php, que corre al
  // final —lee de la sesión el propietario, la condición y las pruebas, y su
  // formulario es el que postea a paso7—. O sea que es la pantalla de
  // confirmación, no un aviso del evento. Va en PasoConfirmar.
  const paginas = dedup([
    ...(evento?.alertas || []).map((a) => ({ titulo: a.titulo, html: a.html })),
    { titulo: null, html: evento?.alerta2 },
  ].filter((p) => tieneContenido(p.html)));

  const [pagina, setPagina] = React.useState(0);

  React.useEffect(() => {
    if (paginas.length === 0) onSeguir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paginas.length === 0) return <Cargando t={t} />;

  const actual = paginas[pagina];
  const ultima = pagina >= paginas.length - 1;

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginBottom: 14, paddingHorizontal: 20 }} numberOfLines={2}>
          {evento?.nombre}
        </Text>
        {actual.titulo && (
          <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginBottom: 8, paddingHorizontal: 20 }}>{actual.titulo}</Text>
        )}
        {paginas.length > 1 && (
          <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.textDim, marginBottom: 10, paddingHorizontal: 20 }}>
            {pagina + 1} de {paginas.length}
          </Text>
        )}
        <HtmlBody html={actual.html} t={t} />
      </ScrollView>

      <PieAceptar
        t={t}
        etiqueta="Aceptar condiciones"
        onAceptar={() => (ultima ? onSeguir() : setPagina((n) => n + 1))}
        onVolver={onVolver}
      />
    </>
  );
}

// ── 2. Animal ──────────────────────────────────────────────────────

function PasoAnimal({ t, evento, onElegir }) {
  const [sba, setSba] = React.useState('');
  const [rp, setRp] = React.useState('');
  const [sexo, setSexo] = React.useState(null);
  const [resultados, setResultados] = React.useState(null); // null = sin buscar
  const [buscando, setBuscando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [elegido, setElegido] = React.useState(null);
  const [presentacion, setPresentacion] = React.useState(null);

  const puedeBuscar = (!!sba.trim() || !!rp.trim()) && sexo !== null && !buscando;

  const buscar = async () => {
    if (!puedeBuscar) return;
    // El teclado numérico tapa media pantalla: los resultados aparecerían
    // abajo, fuera de la vista.
    Keyboard.dismiss();
    setBuscando(true); setError(null); setResultados(null); setElegido(null);
    try {
      const r = await buscarAnimalesAlta({ sba: sba.trim(), rp: rp.trim(), sexo, evento: evento?.id });
      setResultados((Array.isArray(r) ? r : r?.data || []).map(mapAnimalAlta));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ gap: 14 }}>
        <Field t={t} label="S.B.A." placeholder="Número de S.B.A." value={sba} onChange={setSba} keyboardType="number-pad" />
        <Field t={t} label="R.P." placeholder="Número de R.P." value={rp} onChange={setRp} keyboardType="number-pad" />
        <View>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>Sexo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SEXOS.map((s) => (
              <Opcion key={s.v} t={t} label={s.label} activa={sexo === s.v} onPress={() => setSexo(s.v)} />
            ))}
          </View>
        </View>
      </View>

      <Boton t={t} label="Buscar" onPress={buscar} disabled={!puedeBuscar} loading={buscando} style={{ marginTop: 18 }} />

      {error && <View style={{ marginTop: 16 }}><ErrorCard t={t} texto={error} /></View>}

      {resultados && resultados.length === 0 && (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 18 }}>
          No encontramos animales con esos datos.
        </Text>
      )}

      {resultados && resultados.length > 0 && (
        <View style={{ marginTop: 18, gap: 10 }}>
          {resultados.map((a) => {
            const bloqueado = a.yaInscripto === true;
            const activo = elegido?.id === a.id;
            return (
              <TouchableOpacity key={a.id} onPress={() => !bloqueado && setElegido(a)} activeOpacity={0.8} disabled={bloqueado}>
                <Card t={t} style={{ padding: 14, borderColor: activo ? t.accent : t.border }}>
                  <Text style={{ fontFamily: F.display, fontSize: 15, color: bloqueado ? t.textDim : t.text }}>{a.nombre}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
                    {[a.sba && `S.B.A. ${a.sba}`, a.rp && `R.P. ${a.rp}`].filter(Boolean).join(' · ')}
                  </Text>
                  {bloqueado && (
                    // También con una inscripción rechazada: el rechazo es
                    // definitivo para ese evento.
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6 }}>
                      Ya está inscripto en este evento
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {elegido && (
        <>
          <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Presentación</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Opcion t={t} label="Cabestro" activa={presentacion === 'C'} onPress={() => setPresentacion('C')} />
            <Opcion t={t} label="Montado" activa={presentacion === 'M'} onPress={() => setPresentacion('M')} />
          </View>
          <Boton
            t={t} label="Continuar" disabled={!presentacion}
            onPress={() => onElegir(elegido, sexo, presentacion)}
            style={{ marginTop: 20 }}
          />
        </>
      )}
    </ScrollView>
  );
}

function Opcion({ t, label, activa, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: activa ? withAlpha(t.accent, 0.15) : t.surface, borderWidth: 1, borderColor: activa ? t.accent : t.border, alignItems: 'center' }}
    >
      <Text style={{ color: activa ? t.accent : t.text, fontFamily: F.bodyMed, fontSize: 13.5 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── 3. Datos ───────────────────────────────────────────────────────

function PasoDatos({ t, sel, set, onSeguir }) {
  // El Renspa sólo se pide si el evento lo pide: en los demás ni se muestra.
  const pideRenspa = !!sel.evento?.pideRenspa;
  // Criador y propietario, como los muestra paso4 de la web. `criador` no
  // viene en GET /animales/{id} (sale null); sí en el raíz del pedigree, que
  // para un animal son un par de KB. El EXPOSITOR no se elige ni se manda: el
  // servidor lo deriva del dueño del animal, así que es el propietario.
  const [ficha, setFicha] = React.useState(null);
  // Las cabañas que el socio ya usó. Son strings: la lista sale de sus propias
  // inscripciones, no de un catálogo, así que una nueva aparece sola la próxima
  // vez sin que haya que darla de alta en ningún lado.
  const [cabanias, setCabanias] = React.useState(null);

  React.useEffect(() => {
    let cancelado = false;
    fetchCabanias()
      .then((r) => {
        if (cancelado) return;
        setCabanias((Array.isArray(r) ? r : r?.data || []).filter(Boolean));
      })
      // Sin lista se puede escribir igual: el POST acepta texto libre.
      .catch(() => { if (!cancelado) setCabanias([]); });
    return () => { cancelado = true; };
  }, []);

  React.useEffect(() => {
    let cancelado = false;
    fetchAnimalPedigree(sel.animal.id)
      .then((r) => {
        if (cancelado) return;
        const a = r?.animal || r;
        setFicha({ propietario: a?.propietario?.nombre || null, criador: a?.criador?.nombre || null });
      })
      .catch(() => { if (!cancelado) setFicha({ propietario: null, criador: null }); });
    return () => { cancelado = true; };
  }, [sel.animal.id]);
  const completo = !!sel.cabania.trim() && !!sel.provincia.trim() && !!sel.localidad.trim()
    && (!pideRenspa || !!sel.renspa.trim());

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Card t={t} style={{ marginBottom: 22 }}>
        <Dato t={t} label="Animal" value={sel.animal?.nombre} />
        <Dato t={t} label="Criador" value={ficha ? ficha.criador : '…'} />
        <Dato t={t} label="Propietario" value={ficha ? ficha.propietario : '…'} />
        <Dato t={t} label="Expositor" value={ficha ? ficha.propietario : '…'} last />
      </Card>

      <View style={{ gap: 14 }}>
        <SelectorCabania
          t={t}
          cabanias={cabanias}
          valor={sel.cabania}
          onElegir={(v) => set({ cabania: v })}
        />
        <Field t={t} label="Provincia" placeholder="Provincia" value={sel.provincia} onChange={(v) => set({ provincia: v })} />
        <Field t={t} label="Localidad" placeholder="Localidad" value={sel.localidad} onChange={(v) => set({ localidad: v })} />
        {pideRenspa && (
          <Field t={t} label="Renspa" placeholder="Número de Renspa" value={sel.renspa} onChange={(v) => set({ renspa: v })} />
        )}
      </View>
      <Boton t={t} label="Continuar" onPress={onSeguir} disabled={!completo} style={{ marginTop: 22 }} />
    </ScrollView>
  );
}

// Selector de cabaña: un campo que abre un buscador. El socio puede tener
// decenas de cabañas, así que una lista desplegada no sirve — hay que escribir
// para encontrarla.
//
// El mismo cuadro de búsqueda hace de campo para una cabaña nueva: lo que se
// escribe filtra la lista y, además, se ofrece tal cual al pie («Usar …»). El
// POST acepta texto libre, así que una cabaña nueva no necesita nada más, y la
// próxima vez aparece sola en la lista (sale de las inscripciones del socio).
function SelectorCabania({ t, cabanias, valor, onElegir }) {
  const [abierto, setAbierto] = React.useState(false);
  const [busca, setBusca] = React.useState('');

  const lista = cabanias || [];
  const filtradas = busca.trim()
    ? lista.filter((c) => c.toLowerCase().includes(busca.trim().toLowerCase()))
    : lista;
  const escrito = busca.trim();
  // Si lo escrito ya está en la lista, no tiene sentido ofrecerlo como nuevo.
  const ofrecerNueva = !!escrito && !lista.some((c) => c.toLowerCase() === escrito.toLowerCase());

  const elegir = (v) => { onElegir(v); setAbierto(false); setBusca(''); };

  return (
    <View>
      <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>Cabaña</Text>
      <TouchableOpacity
        onPress={() => setAbierto(true)}
        accessibilityLabel="Cabaña"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: valor ? t.accent : t.border }}
      >
        <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: valor ? t.text : t.textDim }} numberOfLines={1}>
          {valor || 'Elegir o cargar la cabaña'}
        </Text>
        {cabanias === null
          ? <ActivityIndicator color={t.accent} />
          : <Icon name="arrow" size={16} color={t.textMute} />}
      </TouchableOpacity>

      <Modal visible={abierto} animationType="slide" statusBarTranslucent onRequestClose={() => setAbierto(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 54 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 }}>
            <TouchableOpacity onPress={() => setAbierto(false)} accessibilityLabel="Cerrar" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={18} color={t.text} />
            </TouchableOpacity>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text, flex: 1 }}>Cabaña</Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Field t={t} label="Buscar o escribir una nueva" placeholder="Nombre de la cabaña" value={busca} onChange={setBusca} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 8 }} keyboardShouldPersistTaps="handled">
            {ofrecerNueva && (
              <TouchableOpacity
                onPress={() => elegir(escrito)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 10, backgroundColor: withAlpha(t.accent, 0.12), borderWidth: 1, borderColor: t.accent }}
              >
                <Icon name="check" size={15} color={t.accent} />
                <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: t.accent }} numberOfLines={1}>
                  Usar «{escrito}»
                </Text>
              </TouchableOpacity>
            )}
            {filtradas.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => elegir(c)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 10, backgroundColor: valor === c ? withAlpha(t.accent, 0.15) : t.surface, borderWidth: 1, borderColor: valor === c ? t.accent : t.border }}
              >
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 13.5, color: t.text }} numberOfLines={1}>{c}</Text>
                {valor === c && <Icon name="check" size={15} color={t.accent} />}
              </TouchableOpacity>
            ))}
            {filtradas.length === 0 && !ofrecerNueva && (
              <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, paddingTop: 8 }}>
                {lista.length === 0 ? 'Escribí el nombre de tu cabaña.' : 'Ninguna coincide con la búsqueda.'}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── 4. Participación ───────────────────────────────────────────────

function PasoParticipacion({ t, sel, set, onJinete, onSeguir }) {
  const [opciones, setOpciones] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelado = false;
    fetchOpcionesAlta(sel.evento.id, { animal: sel.animal.id, sexo: sel.sexo, presentacion: sel.presentacion })
      .then((r) => { if (!cancelado) setOpciones(mapOpciones(r)); })
      .catch((e) => { if (!cancelado) setError(mensaje(e)); });
    return () => { cancelado = true; };
  }, [sel.evento.id, sel.animal.id, sel.sexo, sel.presentacion]);

  if (error) return <ErrorCard t={t} texto={error} />;
  if (!opciones) return <Cargando t={t} />;

  const togglePrueba = (prueba, categoria) => {
    const yaEsta = sel.pruebas.find((p) => p.prueba === prueba.id && p.categoria === categoria.id);
    if (yaEsta) return set({ pruebas: sel.pruebas.filter((p) => p !== yaEsta) });
    // Una misma prueba no puede ir dos veces: cambiar de categoría reemplaza.
    const sinEsaPrueba = sel.pruebas.filter((p) => p.prueba !== prueba.id);
    set({ pruebas: [...sinEsaPrueba, { prueba: prueba.id, categoria: categoria.id, nombre: prueba.nombre, categoriaNombre: categoria.nombre, jinete: null }] });
  };

  const algoElegido = !!sel.morfologia || !!sel.tipoAptitud || sel.pruebas.length > 0;

  // El jinete es obligatorio en morfología, en tipo y aptitud y en cada prueba
  // (el servidor lo valida con JineteMorfologia y JineteFaltante). Avisarlo acá
  // evita que el socio cargue todo y se entere recién con un 422.
  const faltan = [
    sel.morfologia && !sel.morfologia.jinete && 'el jinete de morfología',
    sel.tipoAptitud && !sel.tipoAptitud.jinete && 'el jinete de tipo y aptitud',
    ...sel.pruebas.filter((p) => !p.jinete).map((p) => `el jinete de ${p.nombre}`),
  ].filter(Boolean);
  const completo = algoElegido && faltan.length === 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginHorizontal: 20, lineHeight: 19 }}>
        {sel.animal.nombre} · {sel.evento.nombre}
      </Text>

      <Participacion
        t={t} titulo="Morfología" datos={opciones.morfologia}
        valor={sel.morfologia}
        onToggle={() => set({ morfologia: sel.morfologia ? null : { jinete: null } })}
        onJinete={() => onJinete({ tipo: 'morfologia' })}
      />

      <Participacion
        t={t} titulo="Tipo y aptitud" datos={opciones.tipoAptitud}
        valor={sel.tipoAptitud}
        onToggle={() => set({ tipoAptitud: sel.tipoAptitud ? null : { jinete: null } })}
        onJinete={() => onJinete({ tipo: 'tipoAptitud' })}
      />

      <SectionLabel t={t} style={{ marginTop: 26 }}>Pruebas</SectionLabel>
      <View style={{ marginHorizontal: 20, gap: 14 }}>
        {opciones.pruebas.map((p) => {
          const elegida = sel.pruebas.find((x) => x.prueba === p.id);
          // Yunta y equipo quedan para el tramo siguiente: elegir compañero o
          // equipo necesita sus propias pantallas y sus propias reglas.
          const soportada = p.modalidad === 'individual';
          // Una prueba con una sola categoría se dibuja en UNA línea: el
          // nombre de la prueba hace de etiqueta del checkbox. Varias de esas
          // categorías vienen sin nombre, y la fila quedaba con un checkbox
          // suelto y el cupo, sin decir de qué.
          const unica = soportada && p.categorias.length === 1 ? p.categorias[0] : null;
          return (
            <Card key={p.id} t={t} style={{ padding: 14 }}>
              {!unica && (
                <Text style={{ fontFamily: F.display, fontSize: 15, color: soportada ? t.text : t.textDim }}>{p.nombre}</Text>
              )}
              {!soportada ? (
                <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textDim, marginTop: 6 }}>
                  {p.modalidad === 'yunta' ? 'Las pruebas de yunta' : 'Las pruebas de equipo'} se inscriben por la web por ahora.
                </Text>
              ) : unica ? (
                <>
                  <FilaCategoria
                    t={t}
                    // Con nombre de categoría, los dos; sin nombre, sólo la
                    // prueba (si no, la fila no dice de qué es el checkbox).
                    etiqueta={unica.nombre ? `${p.nombre} · ${unica.nombre}` : p.nombre}
                    categoria={unica}
                    marcada={elegida?.categoria === unica.id}
                    onPress={() => togglePrueba(p, unica)}
                    destacada
                  />
                  {elegida && (
                    <Actores t={t} elegida={elegida} onActor={(rol) => onJinete({ tipo: 'prueba', id: p.id, rol })} />
                  )}
                </>
              ) : (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {p.categorias.map((c) => (
                    <FilaCategoria
                      key={c.id} t={t}
                      etiqueta={c.nombre || p.nombre}
                      categoria={c}
                      marcada={elegida?.categoria === c.id}
                      onPress={() => togglePrueba(p, c)}
                    />
                  ))}
                  {elegida && (
                    <Actores t={t} elegida={elegida} onActor={(rol) => onJinete({ tipo: 'prueba', id: p.id, rol })} />
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </View>

      <View style={{ marginHorizontal: 20 }}>
        <Boton t={t} label="Continuar" onPress={onSeguir} disabled={!completo} style={{ marginTop: 24 }} />
        {!algoElegido ? (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textDim, marginTop: 10, textAlign: 'center' }}>
            Elegí al menos una participación.
          </Text>
        ) : faltan.length > 0 && (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textDim, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
            Falta {faltan.join(', ')}.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// Una categoría: checkbox, etiqueta y el cupo (o «lista de espera»), todo en
// una línea.
function FilaCategoria({ t, etiqueta, categoria: c, marcada, onPress, destacada }) {
  return (
    <TouchableOpacity
      onPress={() => c.habilitada && onPress()}
      disabled={!c.habilitada}
      accessibilityLabel={etiqueta}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: marcada ? t.accent : t.border, backgroundColor: marcada ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {marcada && <Icon name="check" size={13} color={t.bg} stroke={3} />}
      </View>
      <Text
        style={{ flex: 1, fontFamily: destacada ? F.display : F.body, fontSize: destacada ? 15 : 13.5, color: c.habilitada ? t.text : t.textDim }}
        numberOfLines={1}
      >
        {etiqueta}
      </Text>
      {c.listaEspera
        ? <Chip t={t} label="Lista de espera" />
        : c.cupo != null && <Chip t={t} label={`${c.ocupacion ?? 0}/${c.cupo}`} />}
    </TouchableOpacity>
  );
}

// Jinete y domador de una prueba. El jinete es obligatorio en casi todas (lo
// valida el servidor); el domador es opcional y la web lo ofrece igual.
function Actores({ t, elegida, onActor }) {
  return (
    <>
      <SelectorJinete t={t} jinete={elegida.jinete} onPress={() => onActor('jinete')} />
      <SelectorJinete t={t} jinete={elegida.domador} rol="domador" onPress={() => onActor('domador')} />
    </>
  );
}

// Morfología y Tipo y aptitud: mismo shape ({categoria, habilitada}) y misma
// pantalla.
//
// `habilitada` viene del jurado y es INDEPENDIENTE de que haya categoría: la
// categoría la calcula el servidor contra las categorías morfológicas cargadas
// en el evento, por fecha de nacimiento, sexo y presentación. Si no hay ninguna
// que matchee, vuelve null — y entonces esto NO se puede inscribir: el alta
// daría 422 CategoriaSinCalcular. Por eso sin categoría se informa y no se
// ofrece, en vez de prometer que «se calcula después».
function Participacion({ t, titulo, datos, valor, onToggle, onJinete }) {
  const sinCategoria = !!datos?.habilitada && !datos?.categoria;
  return (
    <>
      <SectionLabel t={t} style={{ marginTop: 20 }}>{titulo}</SectionLabel>
      <View style={{ marginHorizontal: 20 }}>
        {!datos?.habilitada ? (
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textDim }}>No está habilitada en este evento.</Text>
        ) : sinCategoria ? (
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textDim, lineHeight: 18 }}>
            Este evento no tiene una categoría para este animal.
          </Text>
        ) : (
          <>
            <Opcion
              t={t}
              label={valor ? `Participa — ${datos.categoria.nombre}` : 'No participa'}
              activa={!!valor}
              onPress={onToggle}
            />
            {valor && <SelectorJinete t={t} jinete={valor.jinete} onPress={onJinete} />}
          </>
        )}
      </View>
    </>
  );
}

function SelectorJinete({ t, jinete, onPress, rol }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }}>
      <Icon name="user" size={16} color={t.accent} />
      <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13, color: jinete ? t.text : t.textMute }}>
        {jinete
          ? `${jinete.apellido || ''} ${jinete.nombre || ''}`.trim()
          : (rol === 'domador' ? 'Elegir domador (opcional)' : 'Elegir jinete')}
      </Text>
      <Icon name="arrow" size={15} color={t.textMute} />
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

// ── Jinete ─────────────────────────────────────────────────────────

function PasoJinete({ t, evento, onElegir, rol }) {
  // Mismo formulario para los dos: la A5 de domadores acepta los mismos tres
  // campos que la A4 (en OR en vez de AND) y devuelve el mismo shape, salvo que
  // no trae deuda — los domadores no pagan canon.
  const esDomador = rol === 'domador';
  const [nombre, setNombre] = React.useState('');
  const [apellido, setApellido] = React.useState('');
  const [documento, setDocumento] = React.useState('');
  const [resultados, setResultados] = React.useState(null);
  const [buscando, setBuscando] = React.useState(false);
  const [error, setError] = React.useState(null);

  // La A4 pide al menos uno de los tres y los combina con AND (LIKE %x%).
  const puedeBuscar = (!!nombre.trim() || !!apellido.trim() || !!documento.trim()) && !buscando;

  const buscar = async () => {
    if (!puedeBuscar) return;
    Keyboard.dismiss();
    setBuscando(true); setError(null); setResultados(null);
    try {
      const filtros = { nombre: nombre.trim(), apellido: apellido.trim(), documento: documento.trim() };
      const r = esDomador
        ? await buscarDomadores(filtros)
        : await buscarJinetes({ ...filtros, evento: evento?.id });
      setResultados((Array.isArray(r) ? r : r?.data || []).map(mapJinete));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ gap: 14 }}>
        <Field t={t} label="Apellido" placeholder="Apellido del jinete" value={apellido} onChange={setApellido} />
        <Field t={t} label="Nombre" placeholder="Nombre del jinete" value={nombre} onChange={setNombre} />
        <Field t={t} label="Documento" placeholder="Número de documento" value={documento} onChange={setDocumento} keyboardType="number-pad" />
      </View>
      <Boton t={t} label="Buscar" onPress={buscar} disabled={!puedeBuscar} loading={buscando} style={{ marginTop: 18 }} />

      {error && <View style={{ marginTop: 16 }}><ErrorCard t={t} texto={error} /></View>}
      {resultados && resultados.length === 0 && (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 18 }}>
          No encontramos {esDomador ? 'domadores' : 'jinetes'} con esos datos.
        </Text>
      )}

      <View style={{ marginTop: 18, gap: 10 }}>
        {(resultados || []).map((j) => (
          <TouchableOpacity key={j.id} onPress={() => !j.tieneDeuda && onElegir(j)} disabled={j.tieneDeuda} activeOpacity={0.8}>
            <Card t={t} style={{ padding: 14 }}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: j.tieneDeuda ? t.textDim : t.text }}>
                {`${j.apellido || ''} ${j.nombre || ''}`.trim()}
              </Text>
              {j.documento && (
                <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>Doc. {j.documento}</Text>
              )}
              {j.tieneDeuda && (
                // La deuda se evalúa a la fecha del evento, no a la de hoy.
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6 }}>
                  Tiene la cuota impaga a la fecha del evento
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ── 4-bis. El aviso previo a confirmar ─────────────────────────────

// `alerta3` del evento, en su propia pantalla: en la web es
// expositores_alerta3.php, la página cuyo formulario postea a paso7. Se acepta
// acá y recién después se ve el resumen y se confirma.
function PasoAlerta3({ t, evento, onSeguir, onVolver }) {
  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <HtmlBody html={evento?.alerta3} t={t} />
      </ScrollView>
      <PieAceptar t={t} etiqueta="Acepto" texto="Acepto" onAceptar={onSeguir} onVolver={onVolver} />
    </>
  );
}

// ── 5. Confirmar ───────────────────────────────────────────────────

function PasoConfirmar({ t, sel, onHecho }) {
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [errores, setErrores] = React.useState([]);

  const confirmar = async () => {
    setEnviando(true); setError(null); setErrores([]);
    try {
      const r = await crearInscripcion({
        evento: sel.evento.id,
        animal: animalAPayload(sel.animal.id),
        sexo: sel.sexo,
        presentacion: sel.presentacion,
        cabania: sel.cabania,
        provincia: sel.provincia.trim(),
        localidad: sel.localidad.trim(),
        renspa: sel.renspa.trim(),
        // Las reglas de Otoño son de los eventos 61/62, cerrados desde 2012.
        otonio: 0,
        ficcc: 0,
        morfologia: sel.morfologia ? { jinete: sel.morfologia.jinete?.id ?? null } : null,
        tipo_aptitud: sel.tipoAptitud ? { jinete: sel.tipoAptitud.jinete?.id ?? null } : null,
        pruebas: sel.pruebas.map((p) => ({
          prueba: p.prueba, categoria: p.categoria,
          jinete: p.jinete?.id ?? null, domador: p.domador?.id ?? null,
        })),
      });
      onHecho(mapAltaCreada(r));
    } catch (e) {
      // 422: la lista de reglas que no se cumplieron, cada una con su código.
      if (e?.status === 422) setErrores(describirErrores(e.errores));
      else setError(mensaje(e));
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20 }}>
      <Card t={t}>
        <Dato t={t} label="Evento" value={sel.evento?.nombre} />
        <Dato t={t} label="Animal" value={sel.animal?.nombre} />
        <Dato t={t} label="Presentación" value={sel.presentacion === 'C' ? 'Cabestro' : 'Montado'} />
        <Dato t={t} label="Cabaña" value={sel.cabania} />
        <Dato t={t} label="Ubicación" value={[sel.localidad, sel.provincia].filter(Boolean).join(', ')} last />
      </Card>

      <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Participación</SectionLabel>
      <Card t={t}>
        <Dato t={t} label="Morfología" value={sel.morfologia ? 'Participa' : 'No participa'} />
        <Dato t={t} label="Tipo y aptitud" value={sel.tipoAptitud ? 'Participa' : 'No participa'} last={sel.pruebas.length === 0} />
        {sel.pruebas.map((p, n) => (
          // Varias categorías vienen sin nombre: ahí alcanza con decir que
          // participa, en vez de mostrar un guión como si faltara el dato.
          <Dato key={p.prueba} t={t} label={p.nombre} value={p.categoriaNombre || 'Participa'} last={n === sel.pruebas.length - 1} />
        ))}
      </Card>


      </View>

      <View style={{ paddingHorizontal: 20 }}>
      {errores.length > 0 && (
        <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: withAlpha(t.live, 0.1), borderWidth: 1, borderColor: withAlpha(t.live, 0.4) }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text, marginBottom: 8 }}>
            No se pudo inscribir
          </Text>
          {errores.map((e, n) => (
            <Text key={n} style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, lineHeight: 18, marginTop: 4 }}>
              · {e.texto}
            </Text>
          ))}
        </View>
      )}
      {error && <View style={{ marginTop: 20 }}><ErrorCard t={t} texto={error} /></View>}
        <Boton t={t} label="Confirmar inscripción" onPress={confirmar} disabled={enviando} loading={enviando} style={{ marginTop: 24 }} />
      </View>
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

// ── Listo ──────────────────────────────────────────────────────────

function PasoListo({ t, resultado, onCerrar }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: withAlpha(t.success, 0.15), alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="check" size={30} color={t.success} stroke={2.5} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 19, color: t.text, textAlign: 'center' }}>
          Inscripción N° {resultado?.id}
        </Text>
        {resultado?.estadoNombre && (
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.textMute, marginTop: 5 }}>{resultado.estadoNombre}</Text>
        )}
      </View>

      {resultado?.precio != null && (
        <Card t={t}>
          <Dato t={t} label="Total" value={`$ ${resultado.precio}`} last={!resultado.pruebas?.length} />
          {(resultado.pruebas || []).map((p, n) => (
            <Dato key={n} t={t} label={p.listaEspera ? 'Prueba (lista de espera)' : 'Prueba'} value={p.precio != null ? `$ ${p.precio}` : '—'} last={n === resultado.pruebas.length - 1} />
          ))}
        </Card>
      )}

      {resultado?.pruebas === null && (
        // Un 201 es un alta hecha aunque la API no haya podido releer las
        // pruebas: reintentar daría 409.
        <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, lineHeight: 18, marginTop: 16 }}>
          La inscripción quedó registrada. El detalle de las pruebas vas a poder verlo en Mis inscripciones.
        </Text>
      )}

      <Boton t={t} label="Listo" onPress={onCerrar} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}
