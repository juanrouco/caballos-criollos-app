import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, Card, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { useAuth } from '../AuthContext';
import { useMenu } from '../MenuContext';
import {
  fetchInscripciones, fetchInscripcion, fetchCertificado,
  mapListado, mapInscripcion, mapCertificado, descargarCertificadoPdf,
} from '../api';
import { descargarArchivo, compartirArchivo } from '../descargas';

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

  React.useEffect(() => { if (status === 'out') setVista({ nombre: 'lista' }); }, [status]);

  const titulo = vista.nombre === 'certificado' ? 'Certificado'
    : vista.nombre === 'detalle' ? 'Inscripción'
    : 'Mis inscripciones';

  const volver = () => {
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
      </View>

      {status === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : status === 'out' ? (
        <SinSesion t={t} onIngresar={() => openSection('cuenta')} />
      ) : vista.nombre === 'certificado' ? (
        <CertificadoView t={t} id={vista.id} />
      ) : vista.nombre === 'detalle' ? (
        <DetalleView t={t} id={vista.id} onCertificado={() => setVista({ nombre: 'certificado', id: vista.id })} />
      ) : (
        <ListaView t={t} onAbrir={(id) => setVista({ nombre: 'detalle', id })} />
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

function ListaView({ t, onAbrir }) {
  const { dato, error, reintentar } = useCarga(
    () => fetchInscripciones().then(mapListado), [],
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

function DetalleView({ t, id, onCertificado }) {
  const { dato, error, reintentar } = useCarga(
    () => fetchInscripcion(id).then((r) => mapInscripcion(r?.inscripcion)), [id],
  );
  if (!dato) return <Estado t={t} error={error} onReintentar={reintentar} />;

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
