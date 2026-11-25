import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
import { Icon, Card, F } from '../components';
import { withAlpha } from '../theme';
import {
  fetchEventos, fetchEventoCategorias, mapEvent, todayISO,
  fetchNoticias, mapNoticia,
} from '../api';
import { useLive } from '../LiveContext';

const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };
// IdCategoria fijo de "Remates" en el backend. Si se mueve, también se
// actualiza el hardcode (no hay endpoint que mapee disciplinas → categoría).
const REMATES_CATEGORIA_ID = 13;
const PAGE_EVENTS  = 20;
const PAGE_REMATES = 12;

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Rango de fechas de un mes, acotado por hoy según el eje: «Próximos» no tiene
// por qué mostrar lo que ya pasó de este mes, ni «Pasados» lo que falta.
export function rangoDelMes(clave, hoyISO, pasados) {
  const [Y, M] = String(clave).split('-').map(Number);
  const ultimo = new Date(Y, M, 0).getDate();
  const desde = `${clave}-01`;
  const hasta = `${clave}-${String(ultimo).padStart(2, '0')}`;
  return pasados
    ? { fecha_desde: desde, fecha_hasta: hasta < hoyISO ? hasta : hoyISO }
    : { fecha_desde: desde > hoyISO ? desde : hoyISO, fecha_hasta: hasta };
}

export default function EventsScreen({ t, navigation }) {
  const [filter, setFilter] = React.useState('proximos');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Calendario</Text>
        <Text style={{ fontFamily: F.display, fontSize: 38, color: t.text }}>Eventos</Text>
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 20 }}>
        {[['proximos', 'Próximos'], ['pasados', 'Pasados'], ['remates', 'Remates']].map(([id, label]) => {
          const on = filter === id;
          return (
            <TouchableOpacity key={id} onPress={() => setFilter(id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}>
              <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 12 }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filter === 'remates'
        ? <RematesList t={t} navigation={navigation} />
        : <EventsList  key={filter} t={t} navigation={navigation} filter={filter} />
      }
    </View>
  );
}

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Suma actividades al catálogo, sin repetir y sin perder las de antes. Le
// entran por dos lados: el endpoint del catálogo y las que traen los eventos
// cargados. Devuelve el array previo cuando no entró ninguna nueva: si no, cada
// página dispararía un render con una lista idéntica.
export function sumarActividades(prev, cats) {
  const porId = new Map((prev || []).map((a) => [a.id, a]));
  (cats || []).forEach((c) => {
    if (c && c.id != null && !porId.has(c.id)) porId.set(c.id, { id: c.id, nombre: c.nombre || '' });
  });
  if (porId.size === (prev || []).length) return prev;
  // Alfabético: es el único orden con sentido mientras el backend no mande uno.
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// El vacío nombra el filtro que lo dejó vacío: «no hay eventos» a secas, con
// dos selectores puestos, se lee como que la app no trajo nada.
export function textoVacio(filter, mes, actividad, actividades) {
  const base = filter === 'proximos' ? 'No hay eventos próximos' : 'No hay eventos pasados';
  const [Y, M] = String(mes || '').split('-').map(Number);
  const enMes = Y && M ? ` en ${MESES_LARGOS[M - 1]} de ${Y}` : '';
  const act = actividad != null
    ? ((actividades || []).find((a) => a.id === actividad) || {}).nombre
    : null;
  return `${base}${act ? ` de ${act}` : ''}${enMes}.`;
}

// Botón que abre un panel para elegir mes y año. Reemplaza a una fila de doce
// chips: ocupa un renglón y llega a cualquier mes, no sólo a los doce próximos.
//
// Los meses del lado equivocado del eje van apagados y no se pueden tocar: en
// «Próximos» no hay nada antes de este mes, y en «Pasados» no hay nada después.
// Dejarlos tocables sería ofrecer una búsqueda que siempre da vacío.
function SelectorMes({ t, valor, onElegir, hoyISO, pasados }) {
  const [abierto, setAbierto] = React.useState(false);
  const [Yhoy, Mhoy] = String(hoyISO || '').split('-').map(Number);
  const [anio, setAnio] = React.useState(() => (valor ? Number(String(valor).split('-')[0]) : Yhoy));
  if (!Yhoy) return null;

  const [Ysel, Msel] = valor ? String(valor).split('-').map(Number) : [null, null];
  // Mayúscula sólo en la inicial: un `textTransform: capitalize` dejaría
  // «Todos Los Meses».
  const nombreMes = Ysel ? MESES_LARGOS[Msel - 1] : '';
  const etiqueta = Ysel ? `${nombreMes[0].toUpperCase()}${nombreMes.slice(1)} ${Ysel}` : 'Todos los meses';
  // Hasta dónde se puede navegar con las flechas: diez años para el lado que
  // tiene sentido, y nada para el otro.
  const anioMin = pasados ? Yhoy - 10 : Yhoy;
  const anioMax = pasados ? Yhoy : Yhoy + 10;
  const habilitado = (m) => (anio !== Yhoy ? true : (pasados ? m <= Mhoy : m >= Mhoy));

  const elegir = (m) => {
    setAbierto(false);
    onElegir(`${anio}-${String(m).padStart(2, '0')}`);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 }}>
      <Text style={{ fontSize: 9.5, color: t.textDim, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold }}>Mes</Text>
      <TouchableOpacity
        onPress={() => { setAnio(Ysel || Yhoy); setAbierto(true); }}
        accessibilityLabel="Elegir mes"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: Ysel ? t.accent : t.border, backgroundColor: Ysel ? t.accent : 'transparent' }}
      >
        <Text style={{ color: Ysel ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 11.5 }}>{etiqueta}</Text>
        <Icon name="arrow" size={12} color={Ysel ? t.bg : t.textDim} />
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setAbierto(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <TouchableOpacity activeOpacity={1} style={{ width: '100%', maxWidth: 340, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setAnio((a) => Math.max(anioMin, a - 1))}
                disabled={anio <= anioMin} accessibilityLabel="Año anterior"
                style={{ padding: 8, opacity: anio <= anioMin ? 0.3 : 1 }}
              >
                <Icon name="arrowL" size={16} color={t.text} />
              </TouchableOpacity>
              <Text style={{ fontFamily: F.display, fontSize: 20, color: t.text }}>{anio}</Text>
              <TouchableOpacity
                onPress={() => setAnio((a) => Math.min(anioMax, a + 1))}
                disabled={anio >= anioMax} accessibilityLabel="Año siguiente"
                style={{ padding: 8, opacity: anio >= anioMax ? 0.3 : 1 }}
              >
                <Icon name="arrow" size={16} color={t.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MESES_CORTOS.map((m, i) => {
                const n = i + 1;
                const on = Ysel === anio && Msel === n;
                const puede = habilitado(n);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => puede && elegir(n)}
                    disabled={!puede}
                    accessibilityLabel={`Mes ${m} ${anio}`}
                    accessibilityState={{ disabled: !puede, selected: on }}
                    style={{ width: '22%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border, opacity: puede ? 1 : 0.3 }}
                  >
                    <Text style={{ color: on ? t.bg : t.text, fontFamily: F.bodyBold, fontSize: 12.5 }}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => { setAbierto(false); onElegir(null); }}
              accessibilityLabel="Todos los meses"
              style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border, alignItems: 'center' }}
            >
              <Text style={{ color: t.accent, fontFamily: F.bodyBold, fontSize: 12.5 }}>Todos los meses</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Una fila de chips scrolleable con «Todos» adelante. El accessibilityLabel
// lleva la etiqueta ("Mes: Jun") para que el chip no se confunda con un evento
// que se llame igual.
function Selector({ t, etiqueta, opciones, valor, onElegir, todos }) {
  if (!opciones.length) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 9.5, color: t.textDim, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, paddingHorizontal: 20, marginBottom: 6 }}>
        {etiqueta}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}>
        {[{ clave: null, label: todos }, ...opciones].map((o) => {
          const on = valor === o.clave;
          return (
            <TouchableOpacity
              key={String(o.clave)}
              onPress={() => onElegir(o.clave)}
              accessibilityLabel={`${etiqueta}: ${o.label}`}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? t.accent : 'transparent', borderWidth: 1, borderColor: on ? t.accent : t.border }}
            >
              <Text style={{ color: on ? t.bg : t.textMute, fontFamily: F.bodyBold, fontSize: 11.5 }}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Eventos (próximos / pasados) ─────────────────────────────────

function EventsList({ t, navigation, filter }) {
  const { live } = useLive();
  const [items, setItems]             = React.useState(null); // null = loading inicial
  const [error, setError]             = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reachedEnd, setReachedEnd]   = React.useState(false);
  const offsetRef = React.useRef(0);
  const reqIdRef  = React.useRef(0);
  // Los dos selectores. `mes` es la clave YYYY-MM; `actividad`, el IdCategoria.
  const [mes, setMes] = React.useState(null);
  const [actividad, setActividad] = React.useState(null);
  // Catálogo de actividades: no hay endpoint que lo devuelva, así que se arma
  // con las que van apareciendo en los eventos cargados, y no se achica — si
  // no, elegir una haría desaparecer del selector a todas las demás.
  const [actividades, setActividades] = React.useState([]);

  const fetchPage = React.useCallback(async (reset) => {
    const myId = ++reqIdRef.current;
    if (reset) { offsetRef.current = 0; setItems(null); setError(null); setReachedEnd(false); }
    else       { setLoadingMore(true); setError(null); }
    const offset = reset ? 0 : offsetRef.current;
    const pasados = filter !== 'proximos';
    const params = pasados
      ? { fecha_hasta: todayISO(), limit: PAGE_EVENTS, offset }
      : { fecha_desde: todayISO(), sort: 'fecha_asc', limit: PAGE_EVENTS, offset };
    // Los dos filtros los resuelve la API, no esta pantalla: con la lista
    // paginada, filtrar lo ya traído mostraría media página de resultados
    // mientras el resto todavía no se pidió.
    if (mes) Object.assign(params, rangoDelMes(mes, todayISO(), pasados));
    if (actividad != null) params.id_categorias = String(actividad);
    try {
      const r = await fetchEventos(params);
      if (myId !== reqIdRef.current) return;
      const raw  = r.data || [];
      const page = raw.map(mapEvent).filter((e) => !e.suspendido);
      setActividades((prev) => sumarActividades(prev, raw.flatMap((e) => e.categorias || [])));
      offsetRef.current = offset + raw.length;
      setItems((prev) => (reset ? page : [...(prev || []), ...page]));
      if (raw.length < PAGE_EVENTS) setReachedEnd(true);
      setLoadingMore(false);
    } catch (e) {
      if (myId !== reqIdRef.current) return;
      setError(e.message || 'No se pudieron cargar los eventos.');
      setLoadingMore(false);
      if (reset) setItems([]);
    }
  }, [filter, mes, actividad]);

  React.useEffect(() => { fetchPage(true); }, [fetchPage]);

  // El catálogo de actividades, una vez por eje. Le mandamos la fecha del eje y
  // no la del mes elegido: así la lista de opciones no se achica al moverse de
  // mes, que dejaría afuera a la que está seleccionada.
  //
  // Lo que trae se SUMA a lo derivado de los eventos, no lo reemplaza: el
  // catálogo viene filtrado por fecha y puede no tener alguna categoría que sí
  // está en la lista. Y si falla, quedan sólo las derivadas, que es como
  // funcionaba antes de que el endpoint existiera — en cdev viene vacío, porque
  // la base de la web no tiene eventos, y contra la API vieja da 404.
  React.useEffect(() => {
    let cancelado = false;
    const pasados = filter !== 'proximos';
    fetchEventoCategorias(pasados ? { fecha_hasta: todayISO() } : { fecha_desde: todayISO() })
      .then((r) => { if (!cancelado) setActividades((prev) => sumarActividades(prev, r.data || [])); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [filter]);

  // Datos planos para FlatList: filas de fecha intercaladas con eventos.
  const rows = React.useMemo(() => {
    const out = [];
    let lastFecha = null;
    (items || []).forEach((e) => {
      const fecha = e.fecha || 'sin-fecha';
      if (fecha !== lastFecha) {
        out.push({ type: 'header', key: `h-${fecha}`, date: e.date, dayShort: e.dayShort });
        lastFecha = fecha;
      }
      out.push({ type: 'event', key: `e-${e.id}`, event: e });
    });
    return out;
  }, [items]);

  const onEndReached = () => {
    if (loadingMore || reachedEnd || error) return;
    if (items === null || items.length === 0) return;
    fetchPage(false);
  };

  const cuerpo = () => {
    if (items === null) {
      return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={t.accent} /></View>;
    }
    if (error && items.length === 0) {
      return (
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => fetchPage(true)}>
            <Card t={t}>
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los eventos.</Text>
                <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={{ paddingHorizontal: 20 }}>
          <Card t={t}>
            <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>
                {textoVacio(filter, mes, actividad, actividades)}
            </Text>
          </Card>
        </View>
      );
    }

    const renderRow = ({ item }) => {
      if (item.type === 'header') {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 26, color: t.accent }}>{(item.date || '').split(' ')[0]}</Text>
            <Text style={{ fontSize: 10.5, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase' }}>
              {(item.date || '').split(' ')[1]}{item.dayShort ? ` · ${item.dayShort}` : ''}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
          </View>
        );
      }
      const e = item.event;
      const isLive = !!live && live.evento?.id === e.id;
      return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { id: e.id })}>
            <Card t={t}>
              <View style={{ flexDirection: 'row', gap: 14, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: isLive ? t.live : withAlpha(t.accent, 0.33), backgroundColor: isLive ? t.live : 'transparent' }}>
                      <Text style={{ fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.6, color: isLive ? '#fff' : t.accent }}>{isLive ? '● AHORA' : e.type}</Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: t.text }} numberOfLines={2}>{e.name}</Text>
                  {!!e.location && (
                    <Text style={{ fontSize: 12, color: t.textMute, marginTop: 4 }} numberOfLines={1}>{e.location}</Text>
                  )}
                  {e.disciplines.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      {e.disciplines.map((d, i) => (
                        <View key={`${d}-${i}`} style={{ backgroundColor: t.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10.5, color: t.textMute }}>{d}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Icon name="arrow" size={18} color={t.textDim} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<ListFooter t={t} loadingMore={loadingMore} error={error} hasItems={items.length > 0} reachedEnd={reachedEnd} pageSize={PAGE_EVENTS} totalLoaded={items.length} onRetry={() => fetchPage(false)} />}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SelectorMes
        t={t} valor={mes} onElegir={setMes}
        hoyISO={todayISO()} pasados={filter !== 'proximos'}
      />
      {actividades.length > 0 && (
        <Selector
          t={t} etiqueta="Actividad"
          opciones={actividades.map((a) => ({ clave: a.id, label: a.nombre }))}
          valor={actividad} onElegir={setActividad} todos="Todas"
        />
      )}
      {cuerpo()}
    </View>
  );
}
// ── Remates (noticias categoría 13) ──────────────────────────────

function RematesList({ t, navigation }) {
  const [items, setItems]             = React.useState(null);
  const [error, setError]             = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reachedEnd, setReachedEnd]   = React.useState(false);
  const offsetRef = React.useRef(0);
  const reqIdRef  = React.useRef(0);

  const fetchPage = React.useCallback(async (reset) => {
    const myId = ++reqIdRef.current;
    if (reset) { offsetRef.current = 0; setItems(null); setError(null); setReachedEnd(false); }
    else       { setLoadingMore(true); setError(null); }
    const offset = reset ? 0 : offsetRef.current;
    try {
      const r = await fetchNoticias({
        categoria: REMATES_CATEGORIA_ID,
        sort: 'fecha_desc',
        limit: PAGE_REMATES,
        offset,
      });
      if (myId !== reqIdRef.current) return;
      const page = (r.data || []).map(mapNoticia);
      offsetRef.current = offset + page.length;
      setItems((prev) => (reset ? page : [...(prev || []), ...page]));
      if (page.length < PAGE_REMATES) setReachedEnd(true);
      setLoadingMore(false);
    } catch (e) {
      if (myId !== reqIdRef.current) return;
      setError(e.message || 'No se pudieron cargar los remates.');
      setLoadingMore(false);
      if (reset) setItems([]);
    }
  }, []);

  React.useEffect(() => { fetchPage(true); }, [fetchPage]);

  const onEndReached = () => {
    if (loadingMore || reachedEnd || error) return;
    if (items === null || items.length === 0) return;
    fetchPage(false);
  };

  if (items === null) {
    return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (error && items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => fetchPage(true)}>
          <Card t={t}>
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', marginBottom: 6 }}>No se pudieron cargar los remates.</Text>
              <Text style={{ fontSize: 12, color: t.accent, fontFamily: F.bodyBold }}>Reintentar</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <Card t={t}>
          <Text style={{ padding: 20, fontSize: 12.5, color: t.textMute, textAlign: 'center' }}>No hay remates próximos.</Text>
        </Card>
      </View>
    );
  }

  const renderRow = ({ item: n }) => (
    <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
      <TouchableOpacity onPress={() => navigation.navigate('NewsDetail', { id: n.id, tag: n.tag })}>
        <Card t={t}>
          <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
            <Image source={n.thumb ? { uri: n.thumb } : NEWS_PHOTO} style={{ width: 72, height: 72, borderRadius: 8 }} resizeMode="cover" />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {!!n.dateYear && (
                <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono, marginBottom: 4 }}>{n.dateYear}</Text>
              )}
              <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{n.title}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      renderItem={renderRow}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={<ListFooter t={t} loadingMore={loadingMore} error={error} hasItems={items.length > 0} reachedEnd={reachedEnd} pageSize={PAGE_REMATES} totalLoaded={items.length} onRetry={() => fetchPage(false)} />}
    />
  );
}

// ── Footer compartido ────────────────────────────────────────────

function ListFooter({ t, loadingMore, error, hasItems, reachedEnd, pageSize, totalLoaded, onRetry }) {
  if (loadingMore) {
    return <View style={{ paddingVertical: 18, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (error && hasItems) {
    return (
      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: t.textMute, marginBottom: 6 }}>No se pudo cargar más.</Text>
        <TouchableOpacity onPress={onRetry}>
          <Text style={{ color: t.accent, fontFamily: F.bodyBold, fontSize: 12 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (reachedEnd && totalLoaded > pageSize) {
    return (
      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: t.textMute }}>Llegaste al final.</Text>
      </View>
    );
  }
  return null;
}
