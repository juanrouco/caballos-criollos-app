import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Crest, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { formatDate } from '../format';
import { fetchAnimalPedigree, mapAnimalPedigree, fetchMeritosAnimal, mapMerito, meritosPorTemporada } from '../api';

// Cache por id de animal — mismo patrón que EventDetailScreen: evita re-fetch
// y spinner al volver al mismo caballo dentro de la sesión.
const animalCache = new Map();
// Los méritos van en su propio cache: son otra request y un animal puede estar
// cacheado de antes de que existiera la sección.
const meritosCache = new Map();

// 4-gen pedigree tree: 3 columns × 8 rows.
// Cada nodo del árbol trae su propio `id` compuesto (`pdre:N` / `exis:N` /
// `extr:N`, ver el contrato de `/animales/{id}/pedigree`), así que tocarlo abre
// su ficha sin resolver nada por nombre ni por S.B.A. Los huecos del árbol
// (ancestro desconocido ⇒ `null`) y el caso raro de un nodo con nombre pero sin
// id quedan como celda muerta: ni tocable ni con pinta de botón.
function PedigreeNode({ parent, t, level, onPress }) {
  const accent = level === 1;
  const fontSize = level === 1 ? 13 : level === 2 ? 11.5 : 10.5;
  if (!parent || !parent.name) {
    return <View style={{ flex: 1, backgroundColor: withAlpha(t.surface2, 0.35), borderRadius: 6 }} />;
  }
  const sub = [parent.year, parent.sex].filter(Boolean).join(' · ');
  const tocable = !!(parent.id && onPress);
  // Mismo estilo tocable o no: el objetivo es que se pueda tocar, no cambiar
  // cómo se lee el árbol (y con id tiene casi todo nodo con datos, así que
  // destacarlos no distinguiría nada).
  const cuerpo = (
    <>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize, color: accent ? t.accent : t.text }}>{parent.name}</Text>
      {!!sub && <Text style={{ fontSize: level === 1 ? 10 : 9, color: t.textMute, marginTop: 3, fontFamily: F.mono }}>{sub}</Text>}
    </>
  );
  const estilo = { flex: 1, backgroundColor: accent ? t.surface2 : t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 6, padding: level === 1 ? 10 : 7, justifyContent: 'center' };
  if (!tocable) return <View style={estilo}>{cuerpo}</View>;
  return (
    <TouchableOpacity
      onPress={() => onPress(parent.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Ver el pedigree de ${parent.name}`}
      style={estilo}
    >
      {cuerpo}
    </TouchableOpacity>
  );
}

function PedigreeTree({ h, t, onPressAncestro }) {
  const sire = h.sire || {}, dam = h.dam || {};
  const ss = sire.sire || {}, sd = sire.dam || {}, ds = dam.sire || {}, dd = dam.dam || {};
  const ROW = 46, GAP = 5;
  const h4 = ROW * 4 + GAP * 3;
  const h2 = ROW * 2 + GAP;
  const on = onPressAncestro;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {/* Col 1: parents */}
      <View style={{ flex: 1.05, gap: GAP }}>
        <View style={{ height: h4 }}><PedigreeNode parent={h.sire} t={t} level={1} onPress={on} /></View>
        <View style={{ height: h4 }}><PedigreeNode parent={h.dam} t={t} level={1} onPress={on} /></View>
      </View>
      {/* Col 2: grandparents */}
      <View style={{ flex: 0.97, gap: GAP }}>
        <View style={{ height: h2 }}><PedigreeNode parent={sire.sire} t={t} level={2} onPress={on} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={sire.dam} t={t} level={2} onPress={on} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={dam.sire} t={t} level={2} onPress={on} /></View>
        <View style={{ height: h2 }}><PedigreeNode parent={dam.dam} t={t} level={2} onPress={on} /></View>
      </View>
      {/* Col 3: great-grandparents */}
      <View style={{ flex: 0.97, gap: GAP }}>
        {[ss.sire, ss.dam, sd.sire, sd.dam, ds.sire, ds.dam, dd.sire, dd.dam].map((p, i) => (
          <View key={i} style={{ height: ROW }}><PedigreeNode parent={p} t={t} level={3} onPress={on} /></View>
        ))}
      </View>
    </View>
  );
}

// ¿Hay al menos un ancestro con ficha para abrir? Decide si va la ayuda de
// «tocá un ancestro»: en un árbol todo hueco, prometer un tap sería mentira.
function hayAncestroTocable(h) {
  const nodos = [];
  const push = (n) => { if (n) { nodos.push(n); push(n.sire); push(n.dam); } };
  push(h?.sire); push(h?.dam);
  return nodos.some((n) => n.id && n.name);
}

// Los méritos (los del Premio Solanet, que son los únicos que hay) agrupados
// por temporada. El título dice «Méritos» a secas, por pedido. Sin méritos no hay
// sección: la mayoría de los animales no tiene ninguno, y un título sobre una
// lista vacía se lee como que algo falló.
function Meritos({ t, meritos }) {
  const grupos = React.useMemo(() => meritosPorTemporada(meritos), [meritos]);
  if (!grupos.length) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <SectionLabel t={t}>Méritos</SectionLabel>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        {grupos.map((g) => (
          <View key={g.temporada || 'sin-temporada'}>
            {!!g.temporada && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 10.5, color: t.accent, letterSpacing: 1.6, fontFamily: F.bodyBold }}>
                  {g.temporada}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              </View>
            )}
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
              {g.meritos.map((m, i) => (
                <View
                  key={`${m.evento}-${m.prueba}-${i}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 14.5, color: t.text }} numberOfLines={2}>{m.logro}</Text>
                    <Text style={{ fontSize: 11.5, color: t.textMute, marginTop: 2 }} numberOfLines={1}>
                      {[m.prueba, m.categoria].filter(Boolean).join(' · ')}
                    </Text>
                    {!!m.evento && (
                      <Text style={{ fontSize: 11, color: t.textDim, marginTop: 3 }} numberOfLines={2}>{m.evento}</Text>
                    )}
                  </View>
                  {/* «PES», igual que el puntaje de morfología en los resultados
                      del evento: es el mismo número de la misma tabla de méritos.
                      «PUNTOS» queda para el puntaje del evento (tipo y aptitud,
                      rodeos), que es otra escala. */}
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.mono, fontSize: 14, color: t.text }}>{m.puntosLabel}</Text>
                    <Text style={{ fontSize: 9, color: t.accent, letterSpacing: 1, fontFamily: F.bodyBold }}>PES</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BackButton({ t, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
      <Icon name="arrowL" size={18} color={t.text} />
    </TouchableOpacity>
  );
}

export default function HorseDetailScreen({ t, navigation, route }) {
  const insets = useSafeAreaInsets();
  // Padding inferior para que el pedigree no quede tapado por la botonera
  // flotante (que respeta el inset del nav bar en Android / home indicator).
  const bottomPad = 80 + Math.max(22, insets.bottom + 8);
  const id = route.params?.id;
  const [horse, setHorse] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (id == null) { setError('Falta el id del animal.'); return; }
    let cancelled = false;
    const cached = animalCache.get(String(id));
    if (cached) { setHorse(cached); setError(null); return; }
    setHorse(null); setError(null);
    fetchAnimalPedigree(id)
      .then((payload) => {
        if (cancelled) return;
        const mapped = mapAnimalPedigree(payload);
        animalCache.set(String(id), mapped);
        setHorse(mapped);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'No se pudo cargar el animal.'); });
    return () => { cancelled = true; };
  }, [id]);

  // Méritos: van aparte del pedigree porque son otra request y porque pueden
  // fallar sin que la ficha se caiga — contra la API vieja la ruta no existe.
  // `null` = no hay (o no se pudo): la sección no se dibuja.
  const [meritos, setMeritos] = React.useState(null);
  React.useEffect(() => {
    if (id == null) return;
    const clave = String(id);
    if (meritosCache.has(clave)) { setMeritos(meritosCache.get(clave)); return; }
    let cancelled = false;
    setMeritos(null);
    fetchMeritosAnimal(id)
      .then((r) => {
        const lista = (r?.data || []).map(mapMerito);
        meritosCache.set(clave, lista);
        if (!cancelled) setMeritos(lista);
      })
      .catch(() => { if (!cancelled) setMeritos(null); });
    return () => { cancelled = true; };
  }, [id]);

  const onBack = () => navigation.goBack();

  // Tocar un ancestro abre SU ficha. Va `push` y no `navigate` a propósito:
  // `navigate` a la pantalla en la que ya estás no apila, sólo le cambia los
  // params (HorseDetail no declara `getId` en ningún stack), así que el back
  // volvería al animal del que salimos y no al del salto anterior. Con `push`
  // cada salto es una pantalla más y el back desarma la cadena de a uno; el
  // `animalCache` por id hace que la vuelta no re-fetchee ni muestre spinner.
  // El evento `pantalla` de uso sale solo: `registrarNavegacion` lee
  // `getCurrentRoute()`, que después del push ya es el HorseDetail nuevo con su
  // `id` (`pdre:119914`).
  const onPressAncestro = React.useCallback((ancestroId) => {
    if (!ancestroId) return;
    navigation.push('HorseDetail', { id: ancestroId });
  }, [navigation]);

  if (error) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <BackButton t={t} onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 14 }}>{error}</Text>
          <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
            <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!horse) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <BackButton t={t} onPress={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      </View>
    );
  }

  const idLine = [horse.rp ? `R.P. ${horse.rp}` : '', horse.sba ? `S.B.A. ${horse.sba}` : '']
    .filter(Boolean).join(' · ');
  const metaFields = [
    ['Nacimiento', formatDate(horse.born)],
    ['Sexo',       horse.sex],
    ['Pelaje',     horse.pelaje],
  ].filter(([, v]) => v);
  const conAncestros = hayAncestroTocable(horse);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <BackButton t={t} onPress={onBack} />

        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 22 }}>
          <Crest size={76} color={t.accent} bg={withAlpha(t.accent, 0.07)} ring={withAlpha(t.accent, 0.33)} horse />
          <View style={{ flex: 1, paddingTop: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>{horse.name}</Text>
            {!!idLine && (
              <Text style={{ fontSize: 11, color: t.accent, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 6, fontFamily: F.bodyBold }}>{idLine}</Text>
            )}
          </View>
        </View>

        {metaFields.length > 0 && (
          <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
            {metaFields.map(([k, v], i) => (
              <View key={k} style={{ flex: 1, padding: 12, borderRightWidth: i < metaFields.length - 1 ? 1 : 0, borderRightColor: t.border }}>
                <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {!!horse.propietario && (
          <View style={{ marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Propietario</Text>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{horse.propietario}</Text>
            {!!horse.propietarioNum && (
              <Text style={{ fontSize: 12, color: t.accent, marginTop: 1, fontFamily: F.bodyMed }}>N° {horse.propietarioNum}</Text>
            )}
          </View>
        )}

        {!!horse.criador && (
          <View style={{ marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>Criador</Text>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: t.text }}>{horse.criador}</Text>
            {!!horse.criadorNum && (
              <Text style={{ fontSize: 12, color: t.accent, marginTop: 1, fontFamily: F.bodyMed }}>N° {horse.criadorNum}</Text>
            )}
          </View>
        )}
      </View>

      <SectionLabel t={t} style={conAncestros ? { marginBottom: 4 } : null}>Pedigree · 4 generaciones</SectionLabel>
      {conAncestros && (
        <Text style={{ paddingHorizontal: 20, marginBottom: 12, fontSize: 11, color: t.textMute, fontFamily: F.body }}>
          Tocá un ancestro para ver su ficha.
        </Text>
      )}
      <View style={{ paddingHorizontal: 20 }}>
        <PedigreeTree h={horse} t={t} onPressAncestro={onPressAncestro} />
      </View>

      <Meritos t={t} meritos={meritos} />
    </ScrollView>
  );
}
