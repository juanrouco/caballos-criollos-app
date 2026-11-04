import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Keyboard, useWindowDimensions } from 'react-native';
import { Icon, Card, Divider, SectionLabel, Field, Boton, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { describirErrores, describirErroresEquipo } from '../erroresInscripcion';
import { alternarCategoria } from '../reglasAlta';
import {
  fetchEventosAlta, buscarAnimalesAlta, fetchOpcionesAlta, buscarJinetes, buscarDomadores, crearInscripcion,
  mapEventoAlta, mapAnimalAlta, mapOpciones, mapJinete, mapAltaCreada, animalAPayload,
  fetchAnimalPedigree, fetchAlertasAlta, fetchCabanias, mapAlertas,
  buscarYuntaCandidatos, fetchEquipos, mapYuntaCandidato, mapEquipo, companieroAPayload,
  crearEquipo, mapEquipoCreado, integranteAPayload,
} from '../api';
import HtmlBody from '../HtmlBody';

// Alta de inscripción, en pasos: evento → animal → datos → participación →
// confirmar. Cada participación lleva lo suyo: la individual un jinete, la
// yunta un compañero, el equipo un trío (que se puede elegir de los que ya
// existen o cargar desde acá).
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
  yunta: 'Elegí el compañero',
  equipo: 'Elegí el equipo',
  equipoNuevo: 'Equipo nuevo',
  listo: 'Inscripción confirmada',
};

const SEXOS = [{ v: 1, label: 'Macho' }, { v: 2, label: 'Hembra' }, { v: 0, label: 'Castrado' }];

// El S.B.A. es un entero positivo, y conviene validarlo acá: el teclado es
// numérico pero pegar texto lo saltea, y la API castea a 0 lo que no es número.
// Con eso `yunta-candidatos` devolvía un fatal de PHP (200 con HTML) en vez de
// una lista, y `animales` es peor en silencio — busca por S.B.A. 0 y contesta
// animales que no son los pedidos, sin ningún aviso. El R.P. no se valida: ese
// sí es alfanumérico (hay R.P. con letras).
const sbaValido = (v) => /^\d+$/.test(v.trim()) && Number(v.trim()) > 0;

// El Renspa se escribe `00.000.0.00000/00`: 13 números, con los puntos y la
// barra que los separan — 17 caracteres en total.
//
// En el servidor lo único que se valida es el largo, y está duplicado: la API en
// class.preparacionalta.php:124 y la web otra vez en
// expositores_inscripcion_paso4.php:133, las dos con `strlen != 17`. El formato
// no lo mira ninguna, así que un POST directo con 17 caracteres cualesquiera
// entra (probado: «XXXXXXXXXXXXXXXXX» creó un alta).
//
// Lo que sí es estricto es el navegador: la web pone una máscara
// (`formatearInputEspecial`, paso4:1007) que descarta todo lo que no sea número
// y arma el formato sola. Copiamos esa máscara en vez de validar un patrón, para
// que la app deje tipear exactamente lo mismo que la web — ni más permisiva ni
// más estricta. Con la máscara puesta, pedir 17 caracteres es pedir 13 números.
const RENSPA_LARGO = 17;
const RENSPA_EJEMPLO = '00.000.0.00000/00';
const renspaValido = (v) => v.trim().length === RENSPA_LARGO;

// Igual que la web: los dígitos, cortados en 13, con los separadores puestos.
function enmascararRenspa(v) {
  const d = String(v || '').replace(/\D/g, '');
  let r = d.slice(0, 2);
  if (d.length > 2) r += `.${d.slice(2, 5)}`;
  if (d.length > 5) r += `.${d.slice(5, 6)}`;
  if (d.length > 6) r += `.${d.slice(6, 11)}`;
  if (d.length > 11) r += `/${d.slice(11, 13)}`;
  return r;
}

// Los tres buscadores que piden un S.B.A. avisan igual. Con el campo vacío no
// dice nada: en dos de los tres el S.B.A. es opcional.
function AvisoSba({ t, sba }) {
  if (!sba.trim() || sbaValido(sba)) return null;
  return (
    <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textDim, marginTop: 10, lineHeight: 18 }}>
      El S.B.A. es un número: escribilo sin letras ni espacios.
    </Text>
  );
}

export default function AltaInscripcionScreen({ t, topInset, onSalir, onHecho }) {
  const [paso, setPaso] = React.useState('alertas');
  const [sel, setSel] = React.useState({
    evento: null, animal: null, sexo: null, presentacion: null,
    cabania: '', provincia: '', localidad: '', renspa: '',
    morfologia: null, tipoAptitud: null, pruebas: [],
  });
  // Dónde guardar el jinete que se elija en el paso 'jinete'.
  const [destinoJinete, setDestinoJinete] = React.useState(null);
  // Qué prueba está eligiendo compañero o equipo.
  const [destinoUnidad, setDestinoUnidad] = React.useState(null);
  const [resultado, setResultado] = React.useState(null);

  const set = (cambios) => setSel((s) => ({ ...s, ...cambios }));

  const atras = () => {
    if (paso === 'alertas') return onSalir();
    // El aviso no está en PASOS: su vuelta es a participación, y desde
    // confirmar también, para no obligar a aceptarlo de nuevo.
    if (paso === 'alerta3') return setPaso('participacion');
    if (paso === 'equipoNuevo') return setPaso('equipo');
    if (paso === 'jinete' || paso === 'yunta' || paso === 'equipo') return setPaso('participacion');
    if (paso === 'listo') return onHecho();
    const i = PASOS.indexOf(paso);
    if (i <= 0) return onSalir();
    setPaso(PASOS[i - 1]);
  };

  const elegirJinete = (destino) => { setDestinoJinete(destino); setPaso('jinete'); };

  const elegirUnidad = (destino) => {
    setDestinoUnidad(destino);
    setPaso(destino.modalidad === 'equipo' ? 'equipo' : 'yunta');
  };

  const parchearPrueba = (cambios) => set({
    pruebas: sel.pruebas.map((p) => (
      p.prueba === destinoUnidad.prueba && p.categoria === destinoUnidad.categoria ? { ...p, ...cambios } : p
    )),
  });

  const guardarCompaniero = (candidato) => {
    parchearPrueba({ companiero: candidato });
    setDestinoUnidad(null);
    setPaso('participacion');
  };

  // J-3: al elegir el equipo, los dos compañeros y el jinete del propio animal
  // salen del padrón — el socio no los elige, como en la web.
  const guardarEquipo = (equipo) => {
    const propios = equipo.animales.filter((a) => a.id === sel.animal.id);
    const otros = equipo.animales.filter((a) => a.id !== sel.animal.id);
    parchearPrueba({
      equipo,
      companiero: otros[0] || null,
      companiero2: otros[1] || null,
      jinete: propios[0]?.jinete || null,
    });
    setDestinoUnidad(null);
    setPaso('participacion');
  };

  // Un equipo recién creado se deja elegido igual que uno de la lista. Sin
  // equipo (no se pudo leer, o no sirve para esta prueba) se vuelve a la lista,
  // que se vuelve a pedir al montarse y ya lo va a incluir.
  const equipoCreado = (equipo) => {
    if (equipo) return guardarEquipo(equipo);
    setPaso('equipo');
  };

  const guardarJinete = (persona) => {
    const rol = destinoJinete?.rol === 'domador' ? 'domador' : 'jinete';
    if (destinoJinete?.tipo === 'morfologia') set({ morfologia: { jinete: persona } });
    if (destinoJinete?.tipo === 'tipoAptitud') set({ tipoAptitud: { jinete: persona } });
    if (destinoJinete?.tipo === 'prueba') {
      set({ pruebas: sel.pruebas.map((p) => (
        p.prueba === destinoJinete.id && p.categoria === destinoJinete.categoria ? { ...p, [rol]: persona } : p
      )) });
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
          // Volver atrás y cambiar el animal, el sexo o la presentación deja sin
          // sentido lo ya elegido: las opciones las calcula el servidor con esos
          // tres datos. Lo más visible es tipo y aptitud, que con cabestro suele
          // quedar sin categoría: la pantalla lo informa y ya no lo ofrece, pero
          // la elección seguía viva y el pie pedía un jinete que no se podía
          // elegir — sin forma de desmarcarlo, el alta quedaba trabada. Las
          // pruebas son peor: sus categorías, compañeros y equipos son de otro
          // animal. Si los tres datos no cambiaron, no se toca nada: volver a
          // mirar el animal no es rehacer la inscripción.
          const otro = animal.id !== sel.animal?.id || sexo !== sel.sexo || presentacion !== sel.presentacion;
          set(otro
            ? { animal, sexo, presentacion, morfologia: null, tipoAptitud: null, pruebas: [] }
            : { animal, sexo, presentacion });
          setPaso('datos');
        }} />
      )}
      {paso === 'datos' && <PasoDatos t={t} sel={sel} set={set} onSeguir={() => setPaso('participacion')} />}
      {paso === 'participacion' && (
        <PasoParticipacion
          t={t} sel={sel} set={set} onJinete={elegirJinete} onUnidad={elegirUnidad}
          // El aviso del evento (alerta3) es una pantalla propia, como en la
          // web; si el evento no lo trae, se saltea.
          onSeguir={() => setPaso(tieneContenido(sel.evento?.alerta3) ? 'alerta3' : 'confirmar')}
        />
      )}
      {paso === 'jinete' && (
        <PasoJinete t={t} evento={sel.evento} rol={destinoJinete?.rol} onElegir={guardarJinete} />
      )}
      {paso === 'yunta' && (
        <PasoYunta t={t} sel={sel} destino={destinoUnidad} onElegir={guardarCompaniero} />
      )}
      {paso === 'equipo' && (
        <PasoEquipo t={t} sel={sel} destino={destinoUnidad} onElegir={guardarEquipo} onNuevo={() => setPaso('equipoNuevo')} />
      )}
      {paso === 'equipoNuevo' && (
        <PasoEquipoNuevo t={t} sel={sel} destino={destinoUnidad} onCreado={equipoCreado} />
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

  // El S.B.A. vacío vale, que se puede buscar sólo por R.P.; con letras no se
  // busca aunque el R.P. alcance, porque los dos campos van en la misma consulta.
  const sbaListo = !sba.trim() || sbaValido(sba);
  const puedeBuscar = sbaListo && (!!sba.trim() || !!rp.trim()) && sexo !== null && !buscando;

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

      <AvisoSba t={t} sba={sba} />
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
                    {datosAnimal(a)}
                  </Text>
                  {esExtranjero(a) && (
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: t.textMute, marginTop: 4 }}>
                      Registro extranjero
                    </Text>
                  )}
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
    && (!pideRenspa || renspaValido(sel.renspa));

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
          <View>
            <Field t={t} label="Renspa" placeholder={RENSPA_EJEMPLO} value={sel.renspa} keyboardType="number-pad" onChange={(v) => set({ renspa: enmascararRenspa(v) })} />
            {!!sel.renspa.trim() && !renspaValido(sel.renspa) && (
              <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textDim, marginTop: 8, lineHeight: 18 }}>
                El Renspa tiene 13 números — los puntos y la barra los pone la app: {RENSPA_EJEMPLO}.
              </Text>
            )}
          </View>
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

function PasoParticipacion({ t, sel, set, onJinete, onUnidad, onSeguir }) {
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

  // Por prueba se puede elegir una categoría común más cualquier cantidad de
  // propias (src/reglasAlta.js, con el `propia` que trae cada categoría). Tocar
  // una común reemplaza a la común anterior; tocar una propia se suma. Cada
  // categoría lleva su propio jinete, domador y compañero, así que las ya
  // elegidas se conservan tal como estaban.
  const togglePrueba = (prueba, categoria) => {
    const actuales = sel.pruebas.filter((p) => p.prueba === prueba.id).map((p) => p.categoria);
    const quedan = alternarCategoria(prueba.categorias, actuales, categoria.id);
    const otrasPruebas = sel.pruebas.filter((p) => p.prueba !== prueba.id);
    const deEsta = quedan.map((catId) => {
      const previa = sel.pruebas.find((p) => p.prueba === prueba.id && p.categoria === catId);
      if (previa) return previa;
      const cat = prueba.categorias.find((c) => c.id === catId);
      return {
        prueba: prueba.id, categoria: catId, modalidad: prueba.modalidad,
        nombre: prueba.nombre, categoriaNombre: cat?.nombre || null,
        jinete: null, domador: null, companiero: null, companiero2: null, equipo: null,
      };
    });
    set({ pruebas: [...otrasPruebas, ...deEsta] });
  };

  const algoElegido = !!sel.morfologia || !!sel.tipoAptitud || sel.pruebas.length > 0;

  // Cómo nombrar una prueba en los avisos: con la categoría cuando hay varias
  // elegidas de la misma prueba, porque si no no se sabe a cuál le falta algo.
  const rotulo = (p) => (
    sel.pruebas.filter((x) => x.prueba === p.prueba).length > 1 && p.categoriaNombre
      ? `${p.nombre} · ${p.categoriaNombre}`
      : p.nombre
  );

  // El jinete es obligatorio en morfología, en tipo y aptitud y en cada prueba
  // (el servidor lo valida con JineteMorfologia y JineteFaltante). Avisarlo acá
  // evita que el socio cargue todo y se entere recién con un 422.
  //
  // Qué le falta a una prueba, según su modalidad.
  const faltaDe = (p) => {
    if (p.modalidad === 'equipo') {
      if (!p.equipo) return `el equipo de ${rotulo(p)}`;
      // J-4: el trío se arma con los dos compañeros y el jinete del propio
      // animal, todos del padrón. El POST sólo exige el equipo, así que un
      // trío incompleto pasaría y quedaría mal inscripto.
      if (!p.companiero || !p.companiero2 || !p.jinete) return `el trío completo de ${rotulo(p)}`;
      return null;
    }
    if (p.modalidad === 'yunta' && !p.companiero) return `el compañero de ${rotulo(p)}`;
    if (!p.jinete) return `el jinete de ${rotulo(p)}`;
    return null;
  };

  // Regla 4.5: el compañero viaja en un campo por categoría sola, así que dos
  // pruebas con yunta en la misma categoría se pisan — el POST da 400.
  const categoriasConYunta = sel.pruebas.filter((p) => p.modalidad === 'yunta' || p.modalidad === 'equipo').map((p) => p.categoria);
  const yuntaRepetida = categoriasConYunta.some((c, i) => categoriasConYunta.indexOf(c) !== i);

  const faltan = [
    sel.morfologia && !sel.morfologia.jinete && 'el jinete de morfología',
    sel.tipoAptitud && !sel.tipoAptitud.jinete && 'el jinete de tipo y aptitud',
    ...sel.pruebas.map(faltaDe),
  ].filter(Boolean);
  const completo = algoElegido && faltan.length === 0 && !yuntaRepetida;

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
          const entradaDe = (catId) => sel.pruebas.find((x) => x.prueba === p.id && x.categoria === catId);
          // Una prueba con una sola categoría se dibuja en UNA línea: el nombre
          // de la prueba hace de etiqueta del checkbox. Varias de esas
          // categorías vienen sin nombre, y la fila quedaba con un checkbox
          // suelto y el cupo, sin decir de qué.
          const unica = p.categorias.length === 1 ? p.categorias[0] : null;
          const elegidas = sel.pruebas.filter((x) => x.prueba === p.id);
          const actores = (c) => {
            const entrada = entradaDe(c.id);
            if (!entrada) return null;
            return (
              <Actores
                t={t} prueba={p} elegida={entrada}
                contexto={elegidas.length > 1 ? c.nombre : null}
                onActor={(rol) => onJinete({ tipo: 'prueba', id: p.id, categoria: c.id, rol })}
                onUnidad={() => onUnidad({ prueba: p.id, categoria: c.id, modalidad: p.modalidad })}
              />
            );
          };
          return (
            <Card key={p.id} t={t} style={{ padding: 14 }}>
              {!unica && (
                <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{p.nombre}</Text>
              )}
              {unica ? (
                <>
                  <FilaCategoria
                    t={t}
                    etiqueta={unica.nombre ? `${p.nombre} · ${unica.nombre}` : p.nombre}
                    categoria={unica}
                    marcada={!!entradaDe(unica.id)}
                    onPress={() => togglePrueba(p, unica)}
                    destacada
                  />
                  {actores(unica)}
                </>
              ) : (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {/* Cada categoría elegida lleva sus propios actores debajo:
                      con varias de la misma prueba, un bloque suelto al pie no
                      diría a cuál pertenece el jinete. */}
                  {p.categorias.map((c) => (
                    <View key={c.id}>
                      <FilaCategoria
                        t={t}
                        etiqueta={c.nombre || p.nombre}
                        categoria={c}
                        marcada={!!entradaDe(c.id)}
                        onPress={() => togglePrueba(p, c)}
                      />
                      {actores(c)}
                    </View>
                  ))}
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
        ) : yuntaRepetida ? (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textDim, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
            No se pueden inscribir dos pruebas de yunta o equipo en la misma categoría.
          </Text>
        ) : faltan.length > 0 && (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textDim, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
            {/* Varias pruebas terminan en punto («F.Z.B.»), así que el punto
                final se agrega sólo si no quedó uno. */}
            {puntoFinal(`Falta ${faltan.join(', ')}`)}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// El cupo de una categoría, rotulado: «2/5» solo no dice qué es. `cupo` 0 o
// null es «sin límite configurado» (CupoService:113) y no se muestra.
//
// Completa con el mismo criterio que el validador: ocupación >= cupo
// (CupoService:122). Una categoría completa no se puede elegir.
//
// ⚠️ Salvo lista de espera (Freno de Oro), que admite más que el cupo y por eso
// nunca bloquea. Y hay un caso límite conocido: la ocupación de `opciones` NO
// descuenta la unidad propia del animal, cosa que el validador sí hace
// (CupoService:116), así que una categoría justo en el límite donde el animal
// ya cuenta se ve completa acá y el POST la aceptaría. Es a propósito: se
// prefiere no ofrecer algo que casi seguro termina en 422 CupoLleno.
const completa = (c) => c.cupo > 0 && (c.ocupacion ?? 0) >= c.cupo;
const cupoTexto = (c) => (completa(c) ? 'Cupo completo' : `Cupo ${c.ocupacion ?? 0}/${c.cupo}`);
const sePuedeElegir = (c) => c.habilitada && (c.listaEspera || !completa(c));

// Una categoría: checkbox, etiqueta y el cupo (o «lista de espera»), todo en
// una línea.
//
// Una ya marcada se puede tocar siempre, aunque haya dejado de ser elegible: la
// regla es sobre ELEGIR, no sobre desmarcar. El caso real es la carrera por el
// último cupo — se marca una categoría en x-1/x, otro socio la completa, y al
// confirmar vuelve el 422 CupoLleno. Al volver atrás las opciones se piden de
// nuevo y la categoría ya se ve completa, pero seguía marcada y bloqueada: no
// había forma de sacarla, Confirmar fallaba siempre y el alta quedaba trabada
// sin más salida que empezar de cero.
function FilaCategoria({ t, etiqueta, categoria: c, marcada, onPress, destacada }) {
  const sePuedeTocar = marcada || sePuedeElegir(c);
  return (
    <TouchableOpacity
      onPress={() => sePuedeTocar && onPress()}
      disabled={!sePuedeTocar}
      accessibilityLabel={etiqueta}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: marcada ? t.accent : withAlpha(t.border, sePuedeElegir(c) ? 1 : 0.5), backgroundColor: marcada ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {marcada && <Icon name="check" size={13} color={t.bg} stroke={3} />}
      </View>
      <Text
        style={{ flex: 1, fontFamily: destacada ? F.display : F.body, fontSize: destacada ? 15 : 13.5, color: sePuedeElegir(c) ? t.text : t.textDim }}
        numberOfLines={1}
      >
        {etiqueta}
      </Text>
      {c.listaEspera
        ? <Chip t={t} label="Lista de espera" />
        : c.cupo > 0 && <Chip t={t} label={cupoTexto(c)} tono={completa(c) ? 'lleno' : null} />}
    </TouchableOpacity>
  );
}

// Qué se elige en cada prueba, según su modalidad:
//  - individual: jinete (obligatorio) y domador (opcional)
//  - yunta: lo mismo más el compañero
//  - equipo: SÓLO el equipo. El jinete no se elige — sale del padrón del equipo
//    (regla 3.1: obligatorio salvo en Aparte Campero, «donde sale del equipo»).
//
// `contexto` es el nombre de la categoría, y va sólo cuando de la misma prueba
// hay varias elegidas: ahí se repiten los selectores y «Elegir jinete» solo no
// dice de cuál.
function Actores({ t, prueba, elegida, contexto, onActor, onUnidad }) {
  const esEquipo = prueba.modalidad === 'equipo';
  return (
    <>
      {esEquipo ? (
        <SelectorUnidad t={t} elegida={elegida} modalidad="equipo" contexto={contexto} onPress={onUnidad} />
      ) : (
        <>
          <SelectorJinete t={t} jinete={elegida.jinete} contexto={contexto} onPress={() => onActor('jinete')} />
          <SelectorJinete t={t} jinete={elegida.domador} rol="domador" contexto={contexto} onPress={() => onActor('domador')} />
          {prueba.modalidad === 'yunta' && (
            <SelectorUnidad t={t} elegida={elegida} modalidad="yunta" contexto={contexto} onPress={onUnidad} />
          )}
        </>
      )}
    </>
  );
}

// El compañero de yunta, o el equipo con el trío que trae.
function SelectorUnidad({ t, elegida, modalidad, contexto, onPress }) {
  const esEquipo = modalidad === 'equipo';
  const elegido = esEquipo ? elegida.equipo : elegida.companiero;
  const vacio = esEquipo ? 'Elegir equipo' : 'Elegir compañero de yunta';
  return (
    <>
      <TouchableOpacity onPress={onPress} accessibilityLabel={rotular(vacio, contexto)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }}>
        <Icon name={esEquipo ? 'building' : 'tree'} size={16} color={t.accent} />
        <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13, color: elegido ? t.text : t.textMute }} numberOfLines={1}>
          {elegido ? elegido.nombre : vacio}
        </Text>
        <Icon name="arrow" size={15} color={t.textMute} />
      </TouchableOpacity>
      {/* Lo que el equipo aporta, para que se vea qué se va a inscribir: el
          socio no elige estos datos, salen del padrón (J-3). */}
      {esEquipo && elegida.equipo && (
        <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 6, lineHeight: 17 }}>
          {[elegida.companiero?.nombre, elegida.companiero2?.nombre].filter(Boolean).join(' · ') || 'Sin compañeros en el padrón'}
          {elegida.jinete ? ` — jinete ${nombreJinete(elegida.jinete)}` : ' — sin jinete en el padrón'}
        </Text>
      )}
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

// El rótulo accesible de un selector: lo que dice, más la categoría cuando hace
// falta distinguirlo de otro igual.
const rotular = (texto, contexto) => (contexto ? `${texto} · ${contexto}` : texto);

// Cierra una frase sin duplicar el punto. Hace falta porque varios nombres de
// prueba ya terminan en punto («F.Z.B.», «R.J. Dowdall» no, pero sí las
// siglas), y quedaba «Falta el jinete de F.Z.B..».
const puntoFinal = (s) => (s.endsWith('.') ? s : `${s}.`);

// Cómo se nombra a un jinete o domador en toda la pantalla: apellido y nombre,
// como en el padrón.
const nombreJinete = (j) => (j ? `${j.apellido || ''} ${j.nombre || ''}`.trim() || null : null);

// La línea de datos de una tarjeta de animal. Lleva lo mismo que la tabla de
// buscar_caballos_resultado.php: S.B.A., R.P., fecha de nacimiento y pelo. Con
// el S.B.A. y el R.P. solos no alcanza — el mismo par puede existir en dos
// registros y las tarjetas quedan idénticas salvo por el nombre.
const datosAnimal = (a) => [
  a?.sba && `S.B.A. ${a.sba}`,
  a?.rp && `R.P. ${a.rp}`,
  a?.fechaNacimiento && formatDate(a.fechaNacimiento),
  a?.pelo,
].filter(Boolean).join(' · ');

// Un animal de registro extranjero no se distingue por los números, así que la
// tarjeta lo dice. La tabla sale del propio id (`extr:123`).
const esExtranjero = (a) => animalAPayload(a?.id)?.tabla === 'IdExtr';

function SelectorJinete({ t, jinete, onPress, rol, contexto }) {
  const vacio = rol === 'domador' ? 'Elegir domador (opcional)' : 'Elegir jinete';
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={rotular(vacio, contexto)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }}>
      <Icon name="user" size={16} color={t.accent} />
      <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13, color: jinete ? t.text : t.textMute }}>
        {jinete ? nombreJinete(jinete) : vacio}
      </Text>
      <Icon name="arrow" size={15} color={t.textMute} />
    </TouchableOpacity>
  );
}

function Chip({ t, label, tono }) {
  const color = tono === 'lleno' ? t.live : t.accent;
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: withAlpha(color, 0.13) }}>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 10.5, color }}>{label}</Text>
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
        <Field t={t} label="Apellido" placeholder={`Apellido del ${esDomador ? 'domador' : 'jinete'}`} value={apellido} onChange={setApellido} />
        <Field t={t} label="Nombre" placeholder={`Nombre del ${esDomador ? 'domador' : 'jinete'}`} value={nombre} onChange={setNombre} />
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
                {nombreJinete(j)}
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

// ── Compañero de yunta ─────────────────────────────────────────────

// J-1 (regla 4.4): un compañero con `permitido: false` ya está inscripto en esa
// prueba y categoría con OTRO compañero. El POST no lo frena salvo de rebote,
// así que si la app lo deja pasar queda una yunta cruzada. Por eso acá no se
// puede elegir.
function PasoYunta({ t, sel, destino, onElegir }) {
  const [sba, setSba] = React.useState('');
  const [sexo, setSexo] = React.useState(null);
  const [resultados, setResultados] = React.useState(null);
  const [buscando, setBuscando] = React.useState(false);
  const [error, setError] = React.useState(null);

  // El sexo decide en qué tabla se busca (hembra en Exis, el resto en Pdre; en
  // los dos casos también en Extr), así que es obligatorio.
  //
  // Acá el S.B.A. es el único dato para buscar, así que además de válido tiene
  // que estar: vacío no sirve.
  const puedeBuscar = sbaValido(sba) && (sexo === 1 || sexo === 2) && !buscando;

  const buscar = async () => {
    if (!puedeBuscar) return;
    Keyboard.dismiss();
    setBuscando(true); setError(null); setResultados(null);
    try {
      const r = await buscarYuntaCandidatos({
        sba: sba.trim(), sexo,
        evento: sel.evento?.id, prueba: destino?.prueba, categoria: destino?.categoria,
        animal: sel.animal?.id,
      });
      setResultados((Array.isArray(r) ? r : r?.data || []).map(mapYuntaCandidato));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ gap: 14 }}>
        <Field t={t} label="S.B.A. del compañero" placeholder="Número de S.B.A." value={sba} onChange={setSba} keyboardType="number-pad" />
        <View>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>Sexo del compañero</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Opcion t={t} label="Macho" activa={sexo === 1} onPress={() => setSexo(1)} />
            <Opcion t={t} label="Hembra" activa={sexo === 2} onPress={() => setSexo(2)} />
          </View>
        </View>
      </View>
      <AvisoSba t={t} sba={sba} />
      <Boton t={t} label="Buscar" onPress={buscar} disabled={!puedeBuscar} loading={buscando} style={{ marginTop: 18 }} />

      {error && <View style={{ marginTop: 16 }}><ErrorCard t={t} texto={error} /></View>}
      {resultados && resultados.length === 0 && (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 18 }}>
          No existe animal con ese S.B.A.
        </Text>
      )}

      <View style={{ marginTop: 18, gap: 10 }}>
        {(resultados || []).map((c) => {
          const propio = c.id === sel.animal?.id; // regla 4.2
          const bloqueado = !c.permitido || propio;
          return (
            <TouchableOpacity key={c.id} onPress={() => !bloqueado && onElegir(c)} disabled={bloqueado} activeOpacity={0.8}>
              <Card t={t} style={{ padding: 14 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: bloqueado ? t.textDim : t.text }}>{c.nombre}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
                  {datosAnimal(c)}
                </Text>
                {propio && (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6 }}>
                    Es el animal que estás inscribiendo
                  </Text>
                )}
                {!propio && !c.permitido && (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6 }}>
                    Ya está inscripto en esta categoría con otra yunta
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Equipo ─────────────────────────────────────────────────────────

// J-2: sólo los equipos donde figura este animal, que es lo único que garantiza
// la pertenencia — el POST apenas verifica que el equipo exista. La API los trae
// del año en curso (qué rango vale es una decisión pendiente del negocio).
//
// Tenga equipos o no, el socio puede cargar uno nuevo desde acá (PasoEquipoNuevo).
function PasoEquipo({ t, sel, destino, onElegir, onNuevo }) {
  const [equipos, setEquipos] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelado = false;
    fetchEquipos({
      animal: sel.animal?.id, evento: sel.evento?.id,
      prueba: destino?.prueba, categoria: destino?.categoria,
    })
      .then((r) => { if (!cancelado) setEquipos((Array.isArray(r) ? r : r?.data || []).map(mapEquipo)); })
      .catch((e) => { if (!cancelado) setError(mensaje(e)); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorCard t={t} texto={error} />;
  if (!equipos) return <Cargando t={t} />;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
      {equipos.length === 0 && (
        <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20 }}>
          Este animal no figura en ningún equipo de este año.
        </Text>
      )}
      {equipos.map((e) => {
        // 4.6: jinete con deuda ⇒ deshabilitado, con los nombres.
        // 4.10: bloqueado ⇒ un integrante ya está en otro equipo en esa prueba.
        const bloqueado = !e.habilitado || e.bloqueado;
        return (
          <TouchableOpacity key={e.id} onPress={() => !bloqueado && onElegir(e)} disabled={bloqueado} activeOpacity={0.8}>
            <Card t={t} style={{ padding: 14 }}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: bloqueado ? t.textDim : t.text }}>{e.nombre}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 4, lineHeight: 17 }}>
                {e.animales.map((a) => a.nombre).filter(Boolean).join(' · ') || 'Sin integrantes'}
              </Text>
              {!e.habilitado && (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6, lineHeight: 17 }}>
                  Jinetes no vigentes: {e.jinetesInhabilitados.join(', ') || 'sin detalle'}
                </Text>
              )}
              {e.bloqueado && (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: t.live, marginTop: 6, lineHeight: 17 }}>
                  {e.bloqueadoPor || 'Un integrante'} ya está inscripto en esta prueba con otro equipo
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={onNuevo} accessibilityLabel="Cargar un equipo nuevo"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: equipos.length ? 8 : 18, padding: 14, borderRadius: 12, backgroundColor: withAlpha(t.accent, 0.1), borderWidth: 1, borderColor: t.accent }}
      >
        <Icon name="plus" size={16} color={t.accent} />
        <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13.5, color: t.accent }}>Cargar un equipo nuevo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Crear un equipo desde la app: el `equipo_agregar.php` de la web. Tres
// animales, cada uno con su jinete, y un nombre que no esté usado este año.
//
// El primero es el animal que se está inscribiendo, y acá su jinete SÍ lo elige
// el socio — al revés que en el alta, donde sale del padrón del equipo (J-3).
//
// Las reglas las decide el POST (422 `equipo_invalido`, docs/README.md
// §POST /equipos): de este lado sólo se evita mandar lo que seguro no pasa
// (nombre vacío, un casillero sin llenar, el mismo animal dos veces).
function PasoEquipoNuevo({ t, sel, destino, onCreado }) {
  const [nombre, setNombre] = React.useState('');
  // El animal del alta va primero y fijo, con el sexo con que se lo buscó.
  const [integrantes, setIntegrantes] = React.useState([
    { animal: sel.animal, sexo: sel.sexo, jinete: null },
    { animal: null, sexo: null, jinete: null },
    { animal: null, sexo: null, jinete: null },
  ]);
  // Qué casillero está eligiendo animal o jinete: {i, tipo}.
  const [eligiendo, setEligiendo] = React.useState(null);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [errores, setErrores] = React.useState([]);
  // Creado pero inservible para esta prueba: ya no se puede reintentar.
  const [trabado, setTrabado] = React.useState(null);

  const parchear = (i, cambios) => setIntegrantes((xs) => xs.map((x, j) => (j === i ? { ...x, ...cambios } : x)));

  const elegirAnimal = (i, animal, sexo) => {
    setEligiendo(null);
    // El POST lo rechaza con `AnimalRepetido` (la web no lo miraba): mejor
    // decirlo al toque que después de cargar los tres.
    if (integrantes.some((x, j) => j !== i && x.animal?.id === animal.id)) {
      return setError('Ese animal ya está en el equipo: el trío son tres distintos.');
    }
    setError(null);
    parchear(i, { animal, sexo });
  };

  const completo = !!nombre.trim() && integrantes.every((x) => x.animal && x.jinete);

  const crear = async () => {
    if (!completo || enviando) return;
    Keyboard.dismiss();
    setEnviando(true); setError(null); setErrores([]);
    try {
      const r = await crearEquipo({
        nombre: nombre.trim(),
        // `evento` es obligatorio; prueba y categoría van para que el 201
        // traiga `habilitado` y `bloqueado` ya evaluados.
        evento: sel.evento?.id, prueba: destino?.prueba, categoria: destino?.categoria,
        animales: integrantes.map((x) => ({
          animal: integranteAPayload(x.animal, x.sexo),
          jinete: x.jinete?.id ?? null,
        })),
      });
      const equipo = mapEquipoCreado(r);
      // Desde acá el equipo YA existe: reintentar daría `NombreRepetido`. Si no
      // se puede dejar elegido, se vuelve a la lista, que lo va a mostrar.
      if (!equipo || equipo.incompleto) return onCreado(null);
      if (!equipo.habilitado || equipo.bloqueado) return setTrabado(equipo);
      onCreado(equipo);
    } catch (e) {
      if (e?.code === 'equipo_invalido') setErrores(describirErroresEquipo(e.errores));
      else setError(mensaje(e));
    } finally {
      setEnviando(false);
    }
  };

  if (trabado) {
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card t={t} style={{ padding: 16 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{trabado.nombre}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 8, lineHeight: 19 }}>
            El equipo quedó creado, pero no se puede inscribir en esta prueba:
          </Text>
          {!trabado.habilitado && (
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.live, marginTop: 8, lineHeight: 18 }}>
              Jinetes no vigentes: {trabado.jinetesInhabilitados.join(', ') || 'sin detalle'}
            </Text>
          )}
          {trabado.bloqueado && (
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.live, marginTop: 8, lineHeight: 18 }}>
              {trabado.bloqueadoPor || 'Un integrante'} ya está inscripto en esta prueba con otro equipo
            </Text>
          )}
        </Card>
        <Boton t={t} label="Volver a los equipos" onPress={() => onCreado(null)} style={{ marginTop: 18 }} />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Field t={t} label="Nombre del equipo" placeholder="Como lo van a nombrar" value={nombre} onChange={setNombre} />
        <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, marginTop: 8, lineHeight: 18 }}>
          No puede repetir el nombre de otro equipo de este año.
        </Text>

        <SectionLabel t={t} style={{ marginTop: 22, paddingHorizontal: 0 }}>Los tres integrantes</SectionLabel>
        <View style={{ gap: 10 }}>
          {integrantes.map((x, i) => (
            <Card key={i} t={t} style={{ padding: 14 }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase' }}>
                {ROTULO_INTEGRANTE[i]}
              </Text>
              <SelectorIntegrante
                t={t} animal={x.animal} contexto={ROTULO_INTEGRANTE[i]} fijo={i === 0}
                onPress={() => setEligiendo({ i, tipo: 'animal' })}
              />
              <SelectorJinete
                t={t} jinete={x.jinete} contexto={ROTULO_INTEGRANTE[i]}
                onPress={() => setEligiendo({ i, tipo: 'jinete' })}
              />
            </Card>
          ))}
        </View>

        {error && <View style={{ marginTop: 16 }}><ErrorCard t={t} texto={error} /></View>}
        {errores.length > 0 && (
          <Card t={t} style={{ padding: 16, marginTop: 16, borderColor: t.live }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: t.live, letterSpacing: 0.5 }}>No se pudo crear el equipo</Text>
            {errores.map((e, i) => (
              <Text key={i} style={{ fontFamily: F.body, fontSize: 13, color: t.text, marginTop: 8, lineHeight: 19 }}>{e.texto}</Text>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border }}>
        {!completo && (
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, marginBottom: 10 }}>
            Falta el nombre, los tres animales y el jinete de cada uno.
          </Text>
        )}
        <Boton t={t} label="Crear el equipo" onPress={crear} disabled={!completo || enviando} loading={enviando} />
      </View>

      <Modal visible={!!eligiendo} animationType="slide" statusBarTranslucent onRequestClose={() => setEligiendo(null)}>
        <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 54 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 14 }}>
            <TouchableOpacity onPress={() => setEligiendo(null)} accessibilityLabel="Cerrar" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={18} color={t.text} />
            </TouchableOpacity>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text, flex: 1 }} numberOfLines={1}>
              {eligiendo?.tipo === 'jinete' ? TITULOS.jinete : 'Elegí el animal'}
            </Text>
          </View>
          {eligiendo?.tipo === 'jinete' ? (
            <PasoJinete
              t={t} evento={sel.evento}
              onElegir={(j) => { parchear(eligiendo.i, { jinete: j }); setEligiendo(null); }}
            />
          ) : (
            <BuscarIntegrante t={t} onElegir={(a, s) => elegirAnimal(eligiendo.i, a, s)} />
          )}
        </View>
      </Modal>
    </>
  );
}

const ROTULO_INTEGRANTE = ['El que inscribís', 'Segundo animal', 'Tercer animal'];

function SelectorIntegrante({ t, animal, contexto, fijo, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={fijo} accessibilityLabel={rotular('Elegir animal', contexto)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }}
    >
      <Icon name="tree" size={16} color={t.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: animal ? t.text : t.textMute }} numberOfLines={1}>
          {animal?.nombre || 'Elegir animal'}
        </Text>
        {!!datosAnimal(animal) && (
          <Text style={{ fontFamily: F.body, fontSize: 11, color: t.textMute, marginTop: 2 }}>
            {datosAnimal(animal)}
          </Text>
        )}
      </View>
      {!fijo && <Icon name="arrow" size={15} color={t.textMute} />}
    </TouchableOpacity>
  );
}

// Los integrantes se buscan con la misma A2 que el animal del alta, que es la
// misma búsqueda del popup de la web (hembra en Exis + Extr; macho y castrado
// en Pdre + Extr). Sin `evento`: que un integrante ya esté inscripto no le
// impide estar en el equipo.
//
// ⚠️ El sexo es la ETIQUETA que elige el socio, no un dato del animal — la API
// devuelve el mismo que se buscó, y es el que viaja en el payload. Por eso acá
// hay que ofrecer «Castrado», que la yunta no ofrece: los castrados son cuatro
// de cada diez integrantes reales, y buscarlos como machos los guardaría con el
// sexo equivocado.
function BuscarIntegrante({ t, onElegir }) {
  const [sba, setSba] = React.useState('');
  const [rp, setRp] = React.useState('');
  const [sexo, setSexo] = React.useState(null);
  const [resultados, setResultados] = React.useState(null);
  const [buscando, setBuscando] = React.useState(false);
  const [error, setError] = React.useState(null);

  const sbaListo = !sba.trim() || sbaValido(sba);
  const puedeBuscar = sbaListo && (!!sba.trim() || !!rp.trim()) && sexo !== null && !buscando;

  const buscar = async () => {
    if (!puedeBuscar) return;
    Keyboard.dismiss();
    setBuscando(true); setError(null); setResultados(null);
    try {
      const r = await buscarAnimalesAlta({ sba: sba.trim(), rp: rp.trim(), sexo });
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
        <Field t={t} label="S.B.A. del integrante" placeholder="Número de S.B.A." value={sba} onChange={setSba} keyboardType="number-pad" />
        <Field t={t} label="R.P. del integrante" placeholder="Número de R.P." value={rp} onChange={setRp} keyboardType="number-pad" />
        <View>
          <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>Sexo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SEXOS.map((s) => (
              <Opcion key={s.v} t={t} label={s.label} activa={sexo === s.v} onPress={() => setSexo(s.v)} />
            ))}
          </View>
        </View>
      </View>
      <AvisoSba t={t} sba={sba} />
      <Boton t={t} label="Buscar" onPress={buscar} disabled={!puedeBuscar} loading={buscando} style={{ marginTop: 18 }} />

      {error && <View style={{ marginTop: 16 }}><ErrorCard t={t} texto={error} /></View>}
      {resultados && resultados.length === 0 && (
        <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, marginTop: 18 }}>
          No encontramos animales con esos datos.
        </Text>
      )}

      <View style={{ marginTop: 18, gap: 10 }}>
        {(resultados || []).map((a) => (
          <TouchableOpacity key={a.id} onPress={() => onElegir(a, sexo)} accessibilityLabel={`Elegir ${a.nombre}`} activeOpacity={0.8}>
            <Card t={t} style={{ padding: 14 }}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }}>{a.nombre}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textMute, marginTop: 3 }}>
                {datosAnimal(a)}
              </Text>
              {esExtranjero(a) && (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: t.textMute, marginTop: 4 }}>
                  Registro extranjero
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
          // `tabla` y `sexo` del compañero salen del propio candidato: un par
          // incoherente da 400.
          yunta: p.companiero ? companieroAPayload(p.companiero) : null,
          yunta2: p.companiero2 ? companieroAPayload(p.companiero2) : null,
          equipo: p.equipo?.id ?? null,
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
        {!!sel.evento?.pideRenspa && <Dato t={t} label="Renspa" value={sel.renspa} />}
        <Dato t={t} label="Ubicación" value={[sel.localidad, sel.provincia].filter(Boolean).join(', ')} last />
      </Card>

      <SectionLabel t={t} style={{ marginTop: 24, paddingHorizontal: 0 }}>Participación</SectionLabel>
      <Card t={t}>
        <Dato
          t={t} label="Morfología"
          value={sel.morfologia ? 'Participa' : 'No participa'}
          detalle={sel.morfologia ? conQuien({ jinete: sel.morfologia.jinete }) : null}
        />
        <Dato
          t={t} label="Tipo y aptitud"
          value={sel.tipoAptitud ? 'Participa' : 'No participa'}
          detalle={sel.tipoAptitud ? conQuien({ jinete: sel.tipoAptitud.jinete }) : null}
          last={sel.pruebas.length === 0}
        />
        {sel.pruebas.map((p, n) => (
          // Varias categorías vienen sin nombre: ahí alcanza con decir que
          // participa, en vez de mostrar un guión como si faltara el dato.
          <Dato
            key={p.prueba} t={t} label={p.nombre}
            value={p.categoriaNombre || 'Participa'}
            detalle={conQuien(p)}
            last={n === sel.pruebas.length - 1}
          />
        ))}
      </Card>


      </View>

      <View style={{ paddingHorizontal: 20 }}>
      {errores.length > 0 && (
        <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: withAlpha(t.live, 0.1), borderWidth: 1, borderColor: withAlpha(t.live, 0.4) }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text, marginBottom: 8 }}>
            No se pudo inscribir
          </Text>
          {errores.map((e, n) => {
            const donde = dondeFalla(sel, e);
            return (
              <Text key={n} style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, lineHeight: 18, marginTop: 4 }}>
                · {donde ? `${donde}: ` : ''}{e.texto}
              </Text>
            );
          })}
        </View>
      )}
      {error && <View style={{ marginTop: 20 }}><ErrorCard t={t} texto={error} /></View>}
        <Boton t={t} label="Confirmar inscripción" onPress={confirmar} disabled={enviando} loading={enviando} style={{ marginTop: 24 }} />
      </View>
    </ScrollView>
  );
}

// Con quién corre: el jinete, el equipo y el compañero que el socio eligió.
// El resumen mostraba sólo la categoría, así que se confirmaba sin ver a quién
// había elegido en cada prueba. Devuelve null si no hay nada que agregar.
function conQuien(p) {
  const jinete = nombreJinete(p?.jinete);
  const domador = nombreJinete(p?.domador);
  const companieros = [p?.companiero?.nombre, p?.companiero2?.nombre].filter(Boolean);
  return [
    p?.equipo?.nombre && `Equipo ${p.equipo.nombre}`,
    companieros.length > 0 && `Con ${companieros.join(' y ')}`,
    jinete && `Jinete ${jinete}`,
    domador && `Domador ${domador}`,
  ].filter(Boolean).join(' · ') || null;
}

// A qué participación corresponde un error del 422. Con varias pruebas
// elegidas, «ya está anotado» sin decir dónde no alcanza para arreglarlo: el
// 422 trae `prueba` y `categoria`, así que los nombramos con lo que el socio
// acaba de elegir. Si no matchea ninguna, no inventamos un rótulo.
function dondeFalla(sel, e) {
  if (e?.prueba == null) return null;
  const p = (sel?.pruebas || []).find(
    (x) => x.prueba === e.prueba && (e.categoria == null || x.categoria === e.categoria),
  );
  if (!p) return null;
  return p.categoriaNombre ? `${p.nombre} · ${p.categoriaNombre}` : p.nombre;
}

function Dato({ t, label, value, detalle, last }) {
  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 5 }}>{label}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14.5, color: value ? t.text : t.textDim }}>{value || '—'}</Text>
        {!!detalle && (
          <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, marginTop: 4, lineHeight: 17 }}>{detalle}</Text>
        )}
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

      {/* El comprobante no muestra importes. El 201 los trae, pero el precio
          de la base no es el que el socio termina pagando (las tarifas del
          evento viven en el texto de la alerta y las sobretasas dependen de la
          categoría de socio), así que mostrarlo confunde más de lo que ayuda.
          La lista de espera sí se avisa: cambia si corre o no. */}
      {(resultado?.pruebas || []).some((p) => p.listaEspera) && (
        <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, lineHeight: 18, marginTop: 16 }}>
          Alguna de las pruebas quedó en lista de espera: el lugar lo confirma la organización.
        </Text>
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
