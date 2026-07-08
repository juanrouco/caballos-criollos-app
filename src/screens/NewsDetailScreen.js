import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Icon, Card, Divider, SectionLabel, F } from '../components';
import { withAlpha } from '../theme';
import { fetchNoticia, imgUrl } from '../api';
import HtmlBody from '../HtmlBody';

const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };

const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatFechaLong(fecha) {
  const [Y, M, D] = String(fecha || '').split('-');
  const day  = parseInt(D, 10);
  const mIdx = parseInt(M, 10) - 1;
  if (!Number.isFinite(day) || !MONTHS_LONG[mIdx]) return '';
  return `${day} de ${MONTHS_LONG[mIdx]}, ${Y}`;
}

// Cache en memoria por id — mismo patrón que EventDetailScreen.
const newsCache = new Map();

export default function NewsDetailScreen({ t, navigation, route }) {
  const id = route.params?.id;
  const [item, setItem]   = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (id == null) { setError('Falta el id de la noticia.'); return; }
    let cancelled = false;
    const cached = newsCache.get(String(id));
    if (cached) { setItem(cached); setError(null); return; }
    setItem(null); setError(null);
    fetchNoticia(id)
      .then((n) => { if (cancelled) return; newsCache.set(String(id), n); setItem(n); })
      .catch((err) => { if (!cancelled) setError(err.message || 'No se pudo cargar la noticia.'); });
    return () => { cancelled = true; };
  }, [id]);

  const onBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));

  if (error) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={onBack} style={{ position: 'absolute', top: 14, left: 14, zIndex: 1, width: 38, height: 38, borderRadius: 19, backgroundColor: withAlpha(t.bg, 0.8), borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 14 }}>{error}</Text>
          <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
            <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={onBack} style={{ position: 'absolute', top: 14, left: 14, zIndex: 1, width: 38, height: 38, borderRadius: 19, backgroundColor: withAlpha(t.bg, 0.8), borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      </View>
    );
  }

  const imagenes   = item.imagenes || [];
  const heroUrl    = imgUrl(imagenes[0]?.urls?.optimizada, 1080) || imagenes[0]?.urls?.big || imagenes[0]?.urls?.thumb || null;
  const extraImgs  = imagenes.slice(1);
  const archivos   = item.archivos || [];
  const dateFull   = formatFechaLong(item.fecha);
  const cuerpo     = (item.cuerpo || '').trim();
  // El detalle del backend hoy devuelve `categoria_id` (int); el listado ya
  // expone `categoria: { id, nombre }`. Preferimos el nombre del detalle si
  // alguna vez se agrega; mientras tanto, el tag viaja por route.params
  // desde la pantalla que abrió este detalle.
  const tag = item.categoria?.nombre || route.params?.tag || '';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      {/* Hero — mismo tratamiento que EventDetail: foto + fade al pie + back. */}
      <View style={{ height: 220 }}>
        <Image source={heroUrl ? { uri: heroUrl } : NEWS_PHOTO} style={{ width: '100%', height: 220 }} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="newsFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.bg} stopOpacity="0" />
                <Stop offset="1" stopColor={t.bg} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#newsFade)" />
          </Svg>
        </View>
        <TouchableOpacity onPress={onBack} style={{ position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: withAlpha(t.bg, 0.8), borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
        {(item.destacado || !!tag) && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {item.destacado && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: withAlpha(t.bg, 0.85), borderWidth: 1, borderColor: withAlpha(t.accent, 0.4) }}>
                <Text style={{ color: t.accent, fontSize: 10, fontFamily: F.bodyBold }}>DESTACADA</Text>
              </View>
            )}
            {!!tag && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: withAlpha(t.bg, 0.85), borderWidth: 1, borderColor: withAlpha(t.accent, 0.4) }}>
                <Text style={{ color: t.accent, fontSize: 10, fontFamily: F.bodyBold }}>{tag}</Text>
              </View>
            )}
          </View>
        )}
        <Text style={{ fontFamily: F.display, fontSize: 30, color: t.text }}>{item.titulo}</Text>
        {!!dateFull && (
          <Text style={{ fontSize: 13, color: t.textMute, marginTop: 10 }}>{dateFull}</Text>
        )}
        {!!item.copete && (
          <Text style={{ fontSize: 15, color: t.text, marginTop: 18, lineHeight: 22, fontFamily: F.body }}>{item.copete}</Text>
        )}
      </View>

      {!!cuerpo && <HtmlBody html={cuerpo} t={t} />}

      {extraImgs.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <SectionLabel t={t}>Galería</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {extraImgs.map((img) => (
              <View key={img.id} style={{ width: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
                <Image source={{ uri: imgUrl(img.urls?.optimizada, 600) || img.urls?.big || img.urls?.thumb }} style={{ width: 240, height: 160 }} resizeMode="cover" />
                {!!img.epigrafe && (
                  <Text style={{ padding: 10, fontSize: 11, color: t.textMute }} numberOfLines={2}>{img.epigrafe}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {archivos.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <SectionLabel t={t}>Archivos</SectionLabel>
          <View style={{ paddingHorizontal: 20 }}>
            <Card t={t}>
              {archivos.map((a, i) => (
                <View key={a.id}>
                  <TouchableOpacity onPress={() => a.url && Linking.openURL(a.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                    <Icon name="pdf" size={20} color={t.accent} />
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: t.text }} numberOfLines={2}>{a.nombre}</Text>
                    <Icon name="arrowUR" size={16} color={t.textDim} />
                  </TouchableOpacity>
                  {i < archivos.length - 1 && <Divider t={t} style={{ marginLeft: 14 }} />}
                </View>
              ))}
            </Card>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
