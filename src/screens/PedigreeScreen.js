import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Icon, Crest, Card, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { fetchAnimales } from '../api';

const SEX_LABEL  = { M: 'Macho', H: 'Hembra', C: 'Castrado' };
const SEX_TO_API = { Macho: 'M', Hembra: 'H' };
// /animales soporta hasta 200; 50 es el default del backend. Si la página se
// llena, mostramos el aviso "refiná la búsqueda" en vez de paginar.
const LIMIT = 50;

const FIELDS = [
  { id: 'nombre',  label: 'Nombre',  placeholder: 'Nombre del animal', type: 'text' },
  { id: 'sba',     label: 'S.B.A.',  placeholder: 'Número de S.B.A.',  type: 'number' },
  { id: 'rp',      label: 'R.P.',    placeholder: 'Número de R.P.',    type: 'number' },
  { id: 'sexo',    label: 'Sexo',    placeholder: 'Macho / Hembra',    type: 'select', opts: ['Macho', 'Hembra'] },
  { id: 'criador', label: 'Criador', placeholder: 'Número de criador', type: 'number' },
];

export default function PedigreeScreen({ t, navigation }) {
  const [values, setValues]   = React.useState({});
  const [results, setResults] = React.useState(null); // null = aún no se buscó
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(null);
  // Guard contra resoluciones viejas (si el usuario edita o re-busca antes
  // de que termine el fetch anterior).
  const reqIdRef = React.useRef(0);

  const setField = (id, v) => {
    reqIdRef.current++;
    setValues((s) => ({ ...s, [id]: v }));
    setResults(null); setError(null); setLoading(false);
  };
  const activeCount = FIELDS.filter((f) => values[f.id] && String(values[f.id]).trim()).length;

  const onSearch = () => {
    if (activeCount === 0 || loading) return;
    const params = {
      nombre:         values.nombre?.trim()  || undefined,
      sba:            values.sba?.trim()     || undefined,
      rp:             values.rp?.trim()      || undefined,
      sexo:           SEX_TO_API[values.sexo] || undefined,
      numero_criador: values.criador?.trim() || undefined,
      limit: LIMIT,
    };
    const myId = ++reqIdRef.current;
    setLoading(true); setError(null); setResults(null);
    fetchAnimales(params)
      .then((res) => {
        if (myId !== reqIdRef.current) return;
        setResults(res.data || []);
        setLoading(false);
      })
      .catch((e) => {
        if (myId !== reqIdRef.current) return;
        setError(e.message || 'No se pudo realizar la búsqueda.');
        setLoading(false);
      });
  };

  const onClear = () => {
    reqIdRef.current++;
    setValues({}); setResults(null); setError(null); setLoading(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, color: t.textMute, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Genealogía</Text>
        <Text style={{ fontFamily: F.display, fontSize: 38, color: t.text }}>Buscar pedigree</Text>
        <Text style={{ fontSize: 13, color: t.textMute, marginTop: 8 }}>Completá uno o más campos para filtrar.</Text>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {FIELDS.map((f) => (
          <FieldRow key={f.id} f={f} value={values[f.id] || ''} onChange={(v) => setField(f.id, v)} t={t} />
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <TouchableOpacity disabled={activeCount === 0 || loading} onPress={onSearch} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: activeCount > 0 ? t.accent : t.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: activeCount > 0 && !loading ? 1 : 0.6 }}>
            {loading
              ? <ActivityIndicator color={t.bg} size="small" />
              : <Icon name="search" size={16} color={activeCount > 0 ? t.bg : t.textDim} />}
            <Text style={{ color: activeCount > 0 ? t.bg : t.textDim, fontFamily: F.bodyBold, fontSize: 14 }}>
              {loading ? 'Buscando…' : `Buscar${activeCount > 0 ? ` · ${activeCount} campo${activeCount > 1 ? 's' : ''}` : ''}`}
            </Text>
          </TouchableOpacity>
          {activeCount > 0 && !loading && (
            <TouchableOpacity onPress={onClear} style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ color: t.textMute, fontFamily: F.bodyMed, fontSize: 13 }}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {results === null && !error && !loading && (
        <View style={{ paddingHorizontal: 32, paddingTop: 32, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: withAlpha(t.accent, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="search" size={22} color={t.accent} stroke={1.6} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text, marginBottom: 5 }}>Buscá un pedigree</Text>
          <Text style={{ fontSize: 12.5, color: t.textMute, textAlign: 'center', lineHeight: 19 }}>Podés combinar campos: por ejemplo Sexo + Criador, o Nombre + R.P.</Text>
        </View>
      )}

      {error && (
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Card t={t}>
            <View style={{ padding: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 12 }}>{error}</Text>
              <TouchableOpacity onPress={onSearch} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
                <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {results !== null && !error && (
        <View style={{ marginTop: 18 }}>
          <SectionLabel t={t}>{results.length} {results.length === 1 ? 'resultado' : 'resultados'}{results.length === LIMIT ? '+' : ''}</SectionLabel>
          <View style={{ paddingHorizontal: 20 }}>
            {results.length === 0 ? (
              <Card t={t}><Text style={{ padding: 24, textAlign: 'center', fontSize: 13, color: t.textMute }}>No se encontraron caballos que coincidan con todos los filtros.</Text></Card>
            ) : (
              <>
                <Card t={t}>
                  {results.map((h, i) => (
                    <ResultRow key={h.id} h={h} t={t} navigation={navigation} showDivider={i < results.length - 1} />
                  ))}
                </Card>
                {results.length === LIMIT && (
                  <Text style={{ fontSize: 11, color: t.textMute, marginTop: 10, textAlign: 'center' }}>
                    Mostrando los primeros {LIMIT}. Refiná la búsqueda para acotar.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function ResultRow({ h, t, navigation, showDivider }) {
  const sub = [SEX_LABEL[h.sexo], h.propietario?.nombre].filter(Boolean).join(' · ');
  return (
    <View>
      <TouchableOpacity onPress={() => navigation.navigate('HorseDetail', { id: h.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
        <Crest size={36} color={t.accent} bg={withAlpha(t.accent, 0.07)} ring={withAlpha(t.accent, 0.2)} horse />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: t.text }} numberOfLines={1}>{h.nombre}</Text>
          {!!sub && <Text style={{ fontSize: 11, color: t.textMute, marginTop: 4 }} numberOfLines={1}>{sub}</Text>}
          <Text style={{ fontSize: 10.5, color: t.textDim, marginTop: 3, fontFamily: F.mono }}>R.P. {h.rp || '—'} · S.B.A. {h.sba || '—'}</Text>
        </View>
        <Icon name="arrowUR" size={16} color={t.textDim} />
      </TouchableOpacity>
      {showDivider && <Divider t={t} style={{ marginLeft: 66 }} />}
    </View>
  );
}

function FieldRow({ f, value, onChange, t }) {
  const filled = !!String(value).trim();
  return (
    <View>
      <Text style={{ fontSize: 10, color: t.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: F.bodyBold, marginBottom: 6 }}>{f.label}</Text>
      {f.type === 'select' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {f.opts.map((opt) => {
            const on = String(value).toLowerCase() === opt.toLowerCase();
            return (
              <TouchableOpacity key={opt} onPress={() => onChange(on ? '' : opt)} style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: on ? withAlpha(t.accent, 0.15) : t.surface, borderWidth: 1, borderColor: on ? t.accent : t.border, alignItems: 'center' }}>
                <Text style={{ color: on ? t.accent : t.text, fontFamily: F.bodyMed, fontSize: 13.5 }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: filled ? t.accent : t.border }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={f.placeholder}
            placeholderTextColor={t.textDim}
            keyboardType={f.type === 'number' ? 'number-pad' : 'default'}
            style={{ flex: 1, paddingVertical: 11, color: t.text, fontFamily: F.body, fontSize: 14 }}
          />
          {filled && (
            <TouchableOpacity onPress={() => onChange('')}><Icon name="x" size={15} color={t.textMute} /></TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
