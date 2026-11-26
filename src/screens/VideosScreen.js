import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Icon, F } from '../components';
import VideoCard from '../VideoCard';
import { fetchVideos, mapVideo } from '../api';

const PAGE_SIZE = 20;

export default function VideosScreen({ t, navigation }) {
  const { width } = useWindowDimensions();
  const ancho = width - 40;
  // items: null = cargando, [] = vacío / error inicial, [...] = ok.
  const [items, setItems]             = React.useState(null);
  const [error, setError]             = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reachedEnd, setReachedEnd]   = React.useState(false);
  const offsetRef = React.useRef(0);
  const reqIdRef  = React.useRef(0);

  const fetchPage = React.useCallback((reset) => {
    const myId   = ++reqIdRef.current;
    const offset = reset ? 0 : offsetRef.current;
    if (reset) {
      setItems(null); setError(null); setReachedEnd(false); offsetRef.current = 0;
    } else {
      setLoadingMore(true); setError(null);
    }
    fetchVideos({ limit: PAGE_SIZE, offset })
      .then((r) => {
        if (myId !== reqIdRef.current) return;
        const page = (r.data || []).map(mapVideo);
        offsetRef.current = offset + page.length;
        setItems((prev) => (reset ? page : [...(prev || []), ...page]));
        if (page.length < PAGE_SIZE) setReachedEnd(true);
        setLoadingMore(false);
      })
      .catch((e) => {
        if (myId !== reqIdRef.current) return;
        setError(e.message || 'No se pudieron cargar los videos.');
        setLoadingMore(false);
        if (reset) setItems([]);
      });
  }, []);

  React.useEffect(() => { fetchPage(true); }, [fetchPage]);

  const onEndReached = () => {
    if (loadingMore || reachedEnd || error) return;
    if (items === null || items.length === 0) return;
    fetchPage(false);
  };

  const Footer = () => {
    if (loadingMore) {
      return <View style={{ paddingVertical: 18, alignItems: 'center' }}><ActivityIndicator color={t.accent} /></View>;
    }
    if (error && items && items.length > 0) {
      return (
        <View style={{ paddingVertical: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: t.textMute, marginBottom: 6 }}>No se pudo cargar más.</Text>
          <TouchableOpacity onPress={() => fetchPage(false)}>
            <Text style={{ color: t.accent, fontFamily: F.bodyBold, fontSize: 12 }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (reachedEnd && items && items.length > PAGE_SIZE) {
      return (
        <View style={{ paddingVertical: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: t.textMute }}>Llegaste al final.</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 26, color: t.text }} numberOfLines={1}>Videos y Podcast</Text>
      </View>

      {items === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center', marginBottom: 14 }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchPage(true)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.accent }}>
            <Text style={{ color: t.bg, fontFamily: F.bodyBold, fontSize: 13 }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>No hay videos.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => String(v.id)}
          renderItem={({ item: v }) => (
            <VideoCard t={t} v={v} ancho={ancho} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130, gap: 14 }}
          // Cada tarjeta de YouTube es un WebView: conviene tener pocos
          // vivos a la vez y soltar los que quedaron fuera de pantalla.
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={Footer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
