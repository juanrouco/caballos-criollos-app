import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Icon, Card, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { useAuth } from '../AuthContext';
import { useMenu } from '../MenuContext';
import { emitirCarnet, rotarCarnet, mapCarnet, descargarCarnetPdf, fetchPerfil, mapPerfil } from '../api';
import { errorCarnet } from '../erroresInscripcion';
import { descargarArchivo, compartirArchivo } from '../descargas';

// Sección "Mi carnet": el carnet de socio con su QR (#63).
//
// El QR lo dibuja la app desde `url` en vez de depender del PDF: el socio lo
// saca en la tranquera, y esperar una descarga y pelear con el visor del
// teléfono para mostrar un cuadradito no es aceptable ahí. El PDF queda en un
// botón, para imprimir o guardar.
//
// Lo que se muestra alrededor del QR —nombre, número, categoría— sale de
// `/perfil`, no del carnet: el endpoint del carnet devuelve sólo la url y la
// fecha. Se piden juntos para que la tarjeta se arme de una.

// Se vuelve a pedir en CADA apertura, a propósito. `POST /perfil/carnet` es
// idempotente, y es la única forma de enterarse de una rotación hecha desde
// otro teléfono o por la ACCC: no hay push ni evento para eso. Un carnet
// guardado y no refrescado puede estar mostrando un QR muerto.
export default function CarnetScreen({ t, topInset, onBack }) {
  const { status } = useAuth();
  const { openSection } = useMenu();
  const [datos, setDatos] = React.useState(null); // null = cargando
  const [error, setError] = React.useState(null);
  const [intento, setIntento] = React.useState(0);
  const [confirmandoRotar, setConfirmandoRotar] = React.useState(false);

  React.useEffect(() => {
    if (status !== 'in') return undefined;
    let cancelado = false;
    setDatos(null); setError(null);
    Promise.all([emitirCarnet(), fetchPerfil().catch(() => null)])
      .then(([c, p]) => {
        if (cancelado) return;
        const carnet = mapCarnet(c);
        if (!carnet) { setError(errorCarnet({ code: 'sin_carnet' })); return; }
        setDatos({ carnet, perfil: mapPerfil(p?.perfil) || null });
      })
      .catch((e) => { if (!cancelado) setError(errorCarnet(e)); });
    return () => { cancelado = true; };
  }, [status, intento]);

  const reintentar = () => setIntento((n) => n + 1);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={confirmandoRotar ? () => setConfirmandoRotar(false) : onBack}
          accessibilityLabel="Volver"
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }} numberOfLines={1}>
          {confirmandoRotar ? 'Renovar el código' : 'Mi carnet'}
        </Text>
      </View>

      {status === 'out' ? (
        <SinSesion t={t} onIngresar={() => openSection('cuenta')} />
      ) : confirmandoRotar ? (
        <ConfirmarRotar
          t={t}
          onVolver={() => setConfirmandoRotar(false)}
          onHecho={() => { setConfirmandoRotar(false); reintentar(); }}
        />
      ) : error ? (
        <Card t={t} style={{ padding: 16, marginHorizontal: 20 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, lineHeight: 19 }}>{error.texto}</Text>
          {/* Sin botón cuando no se es socio: insistir daría lo mismo, y
              ofrecerlo hace creer que falló algo y que se puede arreglar. */}
          {error.reintentable && (
            <TouchableOpacity onPress={reintentar} accessibilityLabel="Reintentar" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Icon name="refresh" size={15} color={t.accent} />
              <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.accent }}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </Card>
      ) : !datos ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>
      ) : (
        <Carnet t={t} datos={datos} onRotar={() => setConfirmandoRotar(true)} />
      )}
    </View>
  );
}

function SinSesion({ t, onIngresar }) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={{ fontFamily: F.body, fontSize: 14, color: t.textMute, lineHeight: 21 }}>
        El carnet es tuyo, así que hay que entrar con tu cuenta para verlo.
      </Text>
      <TouchableOpacity onPress={onIngresar} style={{ marginTop: 18, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

function Carnet({ t, datos, onRotar }) {
  // `numero` y `categoria` cuelgan de `perfil.socio`, no del nivel de arriba:
  // una cuenta puede existir sin estar en el padrón.
  const { carnet, perfil } = datos;
  const socio = perfil?.socio || null;
  const [bajando, setBajando] = React.useState(false);
  const [avisoPdf, setAvisoPdf] = React.useState(null);

  const bajarPdf = async () => {
    setBajando(true); setAvisoPdf(null);
    try {
      const uri = await descargarCarnetPdf((url, headers) => descargarArchivo(url, headers, 'carnet.pdf'));
      const ok = await compartirArchivo(uri, { mimeType: 'application/pdf', titulo: 'Carnet de socio' });
      if (!ok) setAvisoPdf('Este teléfono no tiene con qué compartir el archivo.');
    } catch (e) {
      setAvisoPdf(errorCarnet(e).texto);
    } finally {
      setBajando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      {/* El QR grande y sobre blanco: lo que importa es que una cámara ajena lo
          lea de una, con el teléfono a contraluz en una tranquera. */}
      <Card t={t} style={{ padding: 22, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12 }}>
          <QRCode value={carnet.url} size={200} backgroundColor="#fff" color="#000" />
        </View>

        {!!perfil?.nombre && (
          <Text style={{ fontFamily: F.display, fontSize: 19, color: t.text, marginTop: 18, textAlign: 'center' }}>
            {perfil.nombre}
          </Text>
        )}
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, color: t.textMute, marginTop: 4 }}>
          {[socio?.numero && `Socio N° ${socio.numero}`, socio?.categoria].filter(Boolean).join(' · ')}
        </Text>
      </Card>

      {/* La misma leyenda que imprime el PDF: el carnet dice quién es el socio,
          no si está al día. */}
      <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textDim, lineHeight: 17, marginTop: 12, textAlign: 'center' }}>
        Datos declarados en la cuenta del socio. No informa estado de cuota.
      </Text>

      {!!avisoPdf && (
        <Card t={t} style={{ padding: 15, marginTop: 16 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.text, lineHeight: 19 }}>{avisoPdf}</Text>
        </Card>
      )}

      <TouchableOpacity
        onPress={bajando ? undefined : bajarPdf}
        disabled={bajando}
        accessibilityLabel="Bajar el carnet en PDF"
        style={{ marginTop: 20, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, opacity: bajando ? 0.6 : 1 }}
      >
        {bajando
          ? <ActivityIndicator color={t.bg} />
          : <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Bajar en PDF</Text>}
      </TouchableOpacity>

      <Divider t={t} style={{ marginTop: 26 }} />

      {/* Renovar es destructivo para terceros: rompe el impreso y el de otro
          teléfono sin avisarles. Va abajo, apagado, y pasa por confirmación. */}
      <Text style={{ fontFamily: F.body, fontSize: 12, color: t.textMute, lineHeight: 18, marginTop: 18 }}>
        Si creés que alguien más tiene una copia de tu código, podés renovarlo.
      </Text>
      <TouchableOpacity
        onPress={onRotar}
        accessibilityLabel="Renovar el código"
        style={{ marginTop: 10, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border }}
      >
        <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: t.textMute }}>Renovar el código</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// La rotación no se deshace y rompe cosas que el socio no tiene a la vista: el
// carnet impreso, el guardado en la galería, el que muestra su otro teléfono.
// Nada de eso se entera — el contrato no avisa a nadie. Por eso se dice antes y
// con todas las letras.
function ConfirmarRotar({ t, onVolver, onHecho }) {
  const [rotando, setRotando] = React.useState(false);
  const [error, setError] = React.useState(null);

  const rotar = async () => {
    setRotando(true); setError(null);
    try {
      await rotarCarnet();
      onHecho();
    } catch (e) {
      setError(errorCarnet(e).texto);
    } finally {
      setRotando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>¿Renovar el código?</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20, marginTop: 8 }}>
        Vas a tener un código nuevo y el de ahora deja de servir en el acto.
      </Text>

      <Card t={t} style={{ padding: 15, marginTop: 16, borderColor: withAlpha(t.live, 0.35) }}>
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.live, lineHeight: 19 }}>
          Si tenés el carnet impreso, guardado como imagen, o abierto en otro
          teléfono, esas copias dejan de validar y no hay aviso. Vas a tener que
          volver a bajarlo donde lo necesites.
        </Text>
      </Card>

      {!!error && (
        <Card t={t} style={{ padding: 15, marginTop: 16 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.text, lineHeight: 19 }}>{error}</Text>
        </Card>
      )}

      {/* Mismo criterio que eliminar una inscripción: el relleno va en salir. */}
      <View style={{ marginTop: 'auto', paddingTop: 24 }}>
        <TouchableOpacity
          onPress={rotando ? undefined : rotar}
          disabled={rotando}
          accessibilityLabel="Aceptar y renovar"
          style={{ padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: withAlpha(t.live, 0.45), opacity: rotando ? 0.6 : 1 }}
        >
          {rotando
            ? <ActivityIndicator color={t.live} />
            : <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.live }}>Aceptar</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onVolver} disabled={rotando}
          accessibilityLabel="Cancelar y volver"
          style={{ marginTop: 10, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent, opacity: rotando ? 0.6 : 1 }}
        >
          <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: t.bg }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
