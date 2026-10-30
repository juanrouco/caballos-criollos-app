import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Icon, Card, Divider, F } from '../components';
import { withAlpha } from '../theme';
import { useAuth } from '../AuthContext';
import { fetchPerfil, mapPerfil, OLVIDO_CLAVE_URL } from '../api';

// Sección "Mi cuenta": login del socio, sus datos y el cambio de clave.
//
// Se monta como overlay del menú lateral, así que recibe t / topInset / onBack
// por props (no vía navegación) y las sub-pantallas son sub-estados, no rutas —
// igual que ReglamentosScreen.
//
// Las credenciales son las del sitio (usuario o email + clave). Lo que la API
// distingue con un `code` y acá tiene cartel propio: email sin verificar,
// cuenta pendiente de aprobación y cuenta duplicada. Ver docs/README.md
// §Autenticación.

// Los tres casos en que la clave es correcta pero no se puede entrar. El texto
// lo pone la API (está redactado para mostrar); acá sólo el título y el ícono.
const AVISOS = {
  email_no_verificado: { icon: 'mail',     titulo: 'Verificá tu email' },
  cuenta_pendiente:    { icon: 'user',     titulo: 'Cuenta pendiente de aprobación' },
  cuenta_duplicada:    { icon: 'building', titulo: 'Cuenta duplicada' },
};

// Un error de login o de cambio de clave → qué mostrar. Los `code` conocidos van
// como cartel; el resto, como línea de error abajo del formulario.
function describeError(e) {
  if (e?.code && AVISOS[e.code]) return { aviso: e.code, texto: e.detail };
  // La API responde lo mismo para usuario inexistente, clave incorrecta y
  // cuenta deshabilitada: no dice cuál fue, y nosotros tampoco.
  if (e?.status === 401) return { texto: 'Usuario o clave incorrectos' };
  if (e?.detail) return { texto: e.detail };
  // Sin status es una falla de red: el mensaje ya viene en español.
  return { texto: e?.message || 'No se pudo completar la operación' };
}

export default function CuentaScreen({ t, topInset, onBack }) {
  const { status, login, logout, cambiarClave } = useAuth();
  const [view, setView] = React.useState('perfil'); // 'perfil' | 'clave'
  const [flash, setFlash] = React.useState(null);   // confirmación para la vuelta
  const [avisoLogin, setAvisoLogin] = React.useState(null); // error que sobrevive al logout

  // Al perder la sesión volvemos a la vista principal: si estábamos cambiando la
  // clave, el formulario ya no tiene a qué cuenta aplicarse.
  React.useEffect(() => { if (status === 'out') setView('perfil'); }, [status]);

  const titulo = status === 'in' && view === 'clave' ? 'Cambiar clave' : 'Mi cuenta';
  const volver = view === 'clave' ? () => setView('perfil') : onBack;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: topInset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={volver} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: t.text, flex: 1 }} numberOfLines={1}>{titulo}</Text>
      </View>

      {status === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : status === 'out' ? (
        <LoginView
          t={t}
          login={login}
          avisoInicial={avisoLogin}
          onInteract={() => setAvisoLogin(null)}
        />
      ) : view === 'clave' ? (
        <ClaveView
          t={t}
          cambiarClave={cambiarClave}
          onOk={() => { setFlash('Tu clave fue cambiada'); setView('perfil'); }}
          onSesionPerdida={async (texto) => { setAvisoLogin({ texto }); await logout(); }}
        />
      ) : (
        <PerfilView
          t={t}
          flash={flash}
          onFlashHide={() => setFlash(null)}
          onCambiarClave={() => setView('clave')}
        />
      )}
    </View>
  );
}

// ── Login ──────────────────────────────────────────────────────────

function LoginView({ t, login, avisoInicial, onInteract }) {
  const [usuario, setUsuario] = React.useState('');
  const [clave, setClave] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(avisoInicial || null);

  const puedeEnviar = !!usuario.trim() && !!clave && !enviando;

  const onSubmit = async () => {
    if (!puedeEnviar) return;
    setEnviando(true); setError(null);
    try {
      await login(usuario, clave);
      // Con éxito el provider cambia el status y esta vista se desmonta: no
      // hace falta limpiar nada acá.
    } catch (e) {
      setError(describeError(e));
      setEnviando(false);
    }
  };

  const editar = (set) => (v) => { set(v); if (error) { setError(null); onInteract?.(); } };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20, marginBottom: 22 }}>
        Ingresá con las mismas credenciales que usás en caballoscriollos.com.
      </Text>

      <View style={{ gap: 16 }}>
        <Field
          t={t} label="Usuario o email" placeholder="socio@ejemplo.com"
          value={usuario} onChange={editar(setUsuario)}
          autoComplete="username" keyboardType="email-address"
        />
        <Field
          t={t} label="Clave" placeholder="Tu clave del sitio"
          value={clave} onChange={editar(setClave)}
          secureTextEntry autoComplete="current-password"
          onSubmitEditing={onSubmit}
        />
      </View>

      {error && <ErrorBlock t={t} error={error} />}

      <Boton t={t} label="Ingresar" onPress={onSubmit} disabled={!puedeEnviar} loading={enviando} style={{ marginTop: 22 }} />

      <TouchableOpacity
        onPress={() => Linking.openURL(OLVIDO_CLAVE_URL)}
        style={{ alignSelf: 'center', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.accent }}>¿Olvidaste tu clave?</Text>
        <Icon name="arrowUR" size={13} color={t.accent} />
      </TouchableOpacity>

      <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textDim, lineHeight: 17, textAlign: 'center', marginTop: 4 }}>
        El recupero se hace en el sitio: te llega un mail con un link que vence en una hora.
      </Text>
    </ScrollView>
  );
}

// ── Perfil ─────────────────────────────────────────────────────────

function PerfilView({ t, flash, onFlashHide, onCambiarClave }) {
  const [perfil, setPerfil] = React.useState(null); // null = cargando
  const [error, setError] = React.useState(null);
  const [recarga, setRecarga] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setPerfil(null); setError(null);
    fetchPerfil()
      .then((r) => { if (!cancelled) setPerfil(mapPerfil(r?.perfil) || {}); })
      .catch((e) => { if (!cancelled) setError(describeError(e).texto); });
    return () => { cancelled = true; };
  }, [recarga]);


  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {flash && (
        <TouchableOpacity onPress={onFlashHide} activeOpacity={0.9} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 18, backgroundColor: withAlpha(t.success, 0.14), borderWidth: 1, borderColor: withAlpha(t.success, 0.45) }}>
          <Icon name="check" size={16} color={t.success} />
          <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 13, color: t.text }}>{flash}</Text>
        </TouchableOpacity>
      )}

      {error ? (
        <Card t={t} style={{ padding: 16 }}>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: t.textMute, lineHeight: 19 }}>{error}</Text>
          <TouchableOpacity onPress={() => setRecarga((n) => n + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <Icon name="refresh" size={15} color={t.accent} />
            <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: t.accent }}>Reintentar</Text>
          </TouchableOpacity>
        </Card>
      ) : perfil === null ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name="user" size={32} color={t.accent} stroke={1.6} />
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text, textAlign: 'center' }}>
              {perfil.nombre || 'Mi cuenta'}
            </Text>
            {perfil.socio?.numero && (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: t.textMute, marginTop: 5, letterSpacing: 0.4 }}>
                Socio N° {perfil.socio.numero}
              </Text>
            )}
          </View>

          <Card t={t}>
            <Dato t={t} label="Email" value={perfil.email} />
            <Dato t={t} label="Teléfono" value={perfil.telefono} />
            <Dato t={t} label="Celular" value={perfil.celular} />
            {/* Es la categoría del socio (Activo, Adherente, Vitalicio…), NO una
                vigencia: "Activo" no quiere decir "al día". Por eso se rotula
                como categoría, igual que pide el contrato de la API. */}
            <Dato t={t} label="Categoría" value={perfil.socio?.categoria} />
            <Dato t={t} label="Nombre en el padrón" value={perfil.socio?.nombrePadron} last />
          </Card>

          {/* Cerrar sesión no está acá: vive en el menú lateral, que es de donde
              el socio lo busca sin tener que entrar a ver sus datos. */}
          <Boton t={t} label="Cambiar clave" onPress={onCambiarClave} style={{ marginTop: 22 }} />
        </>
      )}
    </ScrollView>
  );
}

function Dato({ t, label, value, last }) {
  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
        <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 5 }}>{label}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 14.5, color: value ? t.text : t.textDim }}>
          {value || '—'}
        </Text>
      </View>
      {!last && <Divider t={t} />}
    </>
  );
}

// ── Cambio de clave ────────────────────────────────────────────────

// Las reglas completas las valida el servidor (y las rechaza, no las corrige):
// mínimo 6 caracteres, sin espacios al borde, hasta 72 bytes y sin emojis. Acá
// chequeamos sólo lo que da feedback inmediato y evita un viaje al servidor.
function validarLocal(nueva, repetida) {
  if (nueva.length < 6) return 'La clave nueva tiene que tener al menos 6 caracteres';
  if (nueva !== nueva.trim()) return 'La clave nueva no puede empezar ni terminar con espacios';
  if (nueva !== repetida) return 'Las dos claves nuevas no coinciden';
  return null;
}

function ClaveView({ t, cambiarClave, onOk, onSesionPerdida }) {
  const [actual, setActual] = React.useState('');
  const [nueva, setNueva] = React.useState('');
  const [repetida, setRepetida] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);

  const puedeEnviar = !!actual && !!nueva && !!repetida && !enviando;

  const onSubmit = async () => {
    if (!puedeEnviar) return;
    const local = validarLocal(nueva, repetida);
    if (local) { setError({ texto: local }); return; }
    setEnviando(true); setError(null);
    try {
      await cambiarClave(actual, nueva);
      onOk();
    } catch (e) {
      // La clave cambió en otro lado entre la verificación y la escritura: no se
      // escribió nada y hay que volver al login.
      if (e?.code === 'clave_cambiada') { onSesionPerdida(e.detail); return; }
      setError(describeError(e));
      setEnviando(false);
    }
  };

  const editar = (set) => (v) => { set(v); if (error) setError(null); };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: F.body, fontSize: 13.5, color: t.textMute, lineHeight: 20, marginBottom: 22 }}>
        La clave nueva vale para la app y para el sitio. Al cambiarla se cierran las sesiones de la app en todos tus teléfonos.
      </Text>

      <View style={{ gap: 16 }}>
        <Field t={t} label="Clave actual" placeholder="La de hoy" value={actual} onChange={editar(setActual)} secureTextEntry autoComplete="current-password" />
        <Field t={t} label="Clave nueva" placeholder="Al menos 6 caracteres" value={nueva} onChange={editar(setNueva)} secureTextEntry autoComplete="new-password" />
        <Field t={t} label="Repetir clave nueva" placeholder="De nuevo" value={repetida} onChange={editar(setRepetida)} secureTextEntry autoComplete="new-password" onSubmitEditing={onSubmit} />
      </View>

      {error && <ErrorBlock t={t} error={error} />}

      <Boton t={t} label="Guardar clave nueva" onPress={onSubmit} disabled={!puedeEnviar} loading={enviando} style={{ marginTop: 22 }} />

      <Text style={{ fontFamily: F.body, fontSize: 11.5, color: t.textDim, lineHeight: 17, marginTop: 16 }}>
        Desde que la cambiás acá, la app distingue mayúsculas y minúsculas en tu clave.
      </Text>
    </ScrollView>
  );
}

// ── Primitivas del formulario ──────────────────────────────────────

function Field({ t, label, placeholder, value, onChange, secureTextEntry, autoComplete, keyboardType, onSubmitEditing }) {
  const filled = !!String(value).trim();
  return (
    <View>
      <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: filled ? t.accent : t.border }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={t.textDim}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'go' : 'next'}
          accessibilityLabel={label}
          style={{ flex: 1, paddingVertical: 11, color: t.text, fontFamily: F.body, fontSize: 14 }}
        />
      </View>
    </View>
  );
}

function Boton({ t, label, onPress, disabled, loading, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{ padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? t.surface2 : t.accent, borderWidth: 1, borderColor: disabled ? t.border : t.accent, ...style }}
    >
      {loading
        ? <ActivityIndicator color={disabled ? t.textMute : t.bg} />
        : <Text style={{ fontFamily: F.bodyBold, fontSize: 14.5, color: disabled ? t.textDim : t.bg, letterSpacing: 0.3 }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function ErrorBlock({ t, error }) {
  const aviso = error.aviso ? AVISOS[error.aviso] : null;
  if (!aviso) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <Icon name="x" size={14} color={t.live} />
        <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 12.5, color: t.live, lineHeight: 18 }}>{error.texto}</Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, marginTop: 18, backgroundColor: withAlpha(t.live, 0.1), borderWidth: 1, borderColor: withAlpha(t.live, 0.4) }}>
      <Icon name={aviso.icon} size={18} color={t.live} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text, marginBottom: 4 }}>{aviso.titulo}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 12.5, color: t.textMute, lineHeight: 18 }}>{error.texto}</Text>
      </View>
    </View>
  );
}
