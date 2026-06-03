import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Icon, Card, F } from '../components';
import { fetchNoticias, mapNoticia } from '../api';

const NEWS_PHOTO = { uri: 'https://caballoscriollos.com/web/_recursos/noticias/imagenes/big/2025010305263856808.png' };
const PAGE_SIZE = 10;

export default function NewsScreen({ t, navigation }) {
  // items: null = loading inicial, [] = vacío / error inicial, [...] = ok.
  const [items, setItems]               = React.useState(null);
  const [error, setError]               = React.useState(null);
  const [loadingMore, setLoadingMore]   = React.useState(false);
  const [reachedEnd, setReachedEnd]     = React.useState(false);
  const offsetRef = React.useRef(0);
  // Descartar respuestas viejas si re-disparamos antes de que termine la anterior.
  const reqIdRef  = React.useRef(0);

  const fetchPage = React.useCallback((reset) => {
    const myId   = ++reqIdRef.current;
    const offset = reset ? 0 : offsetRef.current;
    if (reset) {
      setItems(null); setError(null); setReachedEnd(false); offsetRef.current = 0;
    } else {
      setLoadingMore(true); setError(null);
    }
    fetchNoticias({ limit: PAGE_SIZE, offset })
      .then((r) => {
        if (myId !== reqIdRef.current) return;
        const page = (r.data || []).map(mapNoticia);
        offsetRef.current = offset + page.length;
        setItems((prev) => (reset ? page : [...(prev || []), ...page]));
        // Página corta = no hay más. El backend no manda `total` en este shape.
        if (page.length < PAGE_SIZE) setReachedEnd(true);
        setLoadingMore(false);
      })
      .catch((e) => {
        if (myId !== reqIdRef.current) return;
        setError(e.message || 'No se pudieron cargar las noticias.');
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

  const renderItem = ({ item: n }) => (
    <TouchableOpacity onPress={() => navigation.navigate('NewsDetail', { id: n.id, tag: n.tag })}>
      <Card t={t}>
        <View style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
          <Image source={n.thumb ? { uri: n.thumb } : NEWS_PHOTO} style={{ width: 72, height: 72, borderRadius: 8 }} resizeMode="cover" />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {(!!n.tag || !!n.date) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {!!n.tag && (
                  <Text style={{ fontSize: 10, color: t.accent, letterSpacing: 1.4, textTransform: 'uppercase' }} numberOfLines={1}>{n.tag}</Text>
                )}
                {!!n.date && (
                  <Text style={{ fontSize: 11, color: t.textMute, fontFamily: F.mono }}>{n.date}</Text>
                )}
              </View>
            )}
            <Text style={{ fontFamily: F.display, fontSize: 15, color: t.text }} numberOfLines={2}>{n.title}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowL" size={18} color={t.text} />
        </TouchableOpacity>
        <Text style={{ fontFamily: F.display, fontSize: 28, color: t.text }}>Noticias</Text>
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
          <Text style={{ fontSize: 13, color: t.textMute, textAlign: 'center' }}>No hay noticias.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 10 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={Footer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
