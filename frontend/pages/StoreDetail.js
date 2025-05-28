import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  SafeAreaView,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import SearchIcon from '../assets/search-refraction.svg';
import { ChevronLeft, Plus, Minus, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../store/slices/cartSlice';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

export default function StoreDetailScreen({ route, navigation }) {
  const storeIdParam = route?.params?.storeId;
  const storeId = parseInt(storeIdParam, 10);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  
  const [store, setStore] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [storyModal, setStoryModal] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [detailModal, setDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [token, setToken] = useState(null)

  useEffect(() => {
  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Ошибка при получении токена из AsyncStorage:', error);
    }
  };

  loadToken();
}, []);


  const cartItems = useSelector(state =>
    state.cart.items.filter(i => i.store?.id === storeId)
  );
  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!storeIdParam || isNaN(storeId)) {
      navigation.goBack();
      return;
    }

    const controller = new AbortController();
    
    const loadData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stores/${storeId}/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        
        if (!response.ok) throw new Error('Store load failed');
        
        const data = await response.json();
        setStore(data);
        setIsLiked(data.is_liked || false);
      } catch (error) {
        if (error.name !== 'AbortError') {
          Alert.alert('Ошибка', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) loadData();
    
    return () => controller.abort();
  }, [storeId, isConnected, token]);

  const handleLike = async () => {
    if (likeLoading) return;
    
    setLikeLoading(true);
    try {
      const newLikeState = !isLiked;
      const endpoint = newLikeState ? 'like' : 'unlike';
      
      await fetch(`${API_BASE_URL}/stores/${storeId}/${endpoint}/`, {
        method: newLikeState ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsLiked(newLikeState);
    } catch (error) {
      setIsLiked(!isLiked); // Откат состояния при ошибке
    } finally {
      setLikeLoading(false);
    }
  };

  const adjustQuantity = (item, delta) => {
    const existing = cartItems.find(i => i.id === item.id);
    const newQty = Math.max((existing?.quantity || 0) + delta, 0);
    
    if (newQty === 0) {
      dispatch(updateQuantity({ id: item.id, storeId, quantity: 0 }));
    } else if (existing) {
      dispatch(updateQuantity({ id: item.id, storeId, quantity: newQty }));
    } else if (delta > 0) {
      dispatch(addToCart({
        id: item.id,
        store: { id: store.id, name: store.name },
        category: item.category ? { id: item.category.id, name: item.category.name } : null,
        name: item.name,
        description: item.description,
        image: item.image,
        price: item.price,
      }));
    }
  };

  const openDetail = item => {
    const others = store.product_categories?.flatMap(c => c.products)?.filter(p => p.id !== item.id) || [];
    setDetailProduct({
      ...item,
      related: others.sort(() => 0.5 - Math.random()).slice(0, 5)
    });
    setDetailModal(true);
  };

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#217B4B" />;
  if (!isConnected) return <Text style={styles.loader}>Нет интернет-соединения</Text>;
  if (!store) return <Text style={styles.loader}>Магазин не найден</Text>;

  const allProducts = store.product_categories?.flatMap(c => c.products) || [];
  const categories = [{ id: 'all', name: 'Все' }, ...(store.product_categories || [])];
  const filteredProducts = (activeCategory === 'all'
    ? allProducts
    : store.product_categories.find(c => c.id.toString() === activeCategory)?.products || []
  ).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: store.banner }} style={[styles.banner, { height: width * 0.6 }]} />
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={28} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.likeButton}
            onPress={handleLike}
            disabled={likeLoading}
          >
            <Heart
              size={28}
              color={isLiked ? '#FF4444' : '#333'}
              fill={isLiked ? '#FF4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoWrap}>
          <Text style={styles.name}>{store.name}</Text>
          {store.description && <Text style={styles.desc}>{store.description}</Text>}
          <Text style={[styles.status, { color: store.is_open ? '#0D68F1' : '#ff4444' }]}>
            {store.is_open ? 'Сейчас открыт' : 'Сейчас закрыт'}
          </Text>
        </View>

        {store.stories?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stories}>
            {store.stories.map((s, idx) => (
              <TouchableOpacity 
                key={s.id} 
                onPress={() => { setStoryIndex(idx); setStoryModal(true); }}
              >
                <Image source={{ uri: s.icon }} style={styles.storyIcon} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Modal visible={storyModal} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.storyModalContainer} 
            activeOpacity={1}
            onPress={() => setStoryModal(false)}
          >
            {store.stories[storyIndex]?.image && (
              <Image 
                source={{ uri: store.stories[storyIndex].image }} 
                style={styles.storyFullImage} 
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </Modal>

        <View style={styles.searchWrap}>
          <SearchIcon width={20} height={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchBar}
            placeholder="Поиск товара"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tab, activeCategory === cat.id.toString() && styles.tabActive]}
                onPress={() => setActiveCategory(cat.id.toString())}
              >
                <Text style={activeCategory === cat.id.toString() ? styles.tabTextActive : styles.tabText}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={i => i.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const qty = cartItems.find(i => i.id === item.id)?.quantity || 0;
            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => openDetail(item)}>
                  <Image source={{ uri: item.image }} style={styles.image} />
                </TouchableOpacity>
                <Text style={styles.pname}>{item.name}</Text>
                <Text style={styles.prodDesc}>{item.description}</Text>
                {qty === 0 ? (
                  <View style={styles.panelInactive}>
                    <Text style={styles.priceInactive}>{item.price} с</Text>
                    <Plus size={20} color="#21A25D" onPress={() => adjustQuantity(item, 1)} />
                  </View>
                ) : (
                  <View style={styles.panelActive}>
                    <Minus size={20} color="#fff" onPress={() => adjustQuantity(item, -1)} />
                    <Text style={styles.qtyText}>{qty}</Text>
                    <Plus size={20} color="#fff" onPress={() => adjustQuantity(item, 1)} />
                  </View>
                )}
              </View>
            );
          }}
        />
      </ScrollView>

      <View style={[styles.orderButton, { bottom: insets.bottom + 16 }]}>
        <Text style={styles.orderPrice}>{total.toFixed(2)} с</Text>
      </View>

      {detailProduct && (
        <Modal visible={detailModal} transparent animationType="slide">
          <SafeAreaView style={styles.detailContainer}>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <Image source={{ uri: detailProduct.image }} style={styles.detailImage} />
              <Text style={styles.detailName}>{detailProduct.name}</Text>
              <Text style={styles.detailDesc}>{detailProduct.description}</Text>
              {detailProduct.related?.length > 0 && (
                <>
                  <Text style={styles.relatedTitle}>С этим покупают</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
                    {detailProduct.related.map(prod => {
                      const rq = cartItems.find(i => i.id === prod.id)?.quantity || 0;
                      return (
                        <View key={prod.id} style={styles.relatedCard}>
                          <Image source={{ uri: prod.image }} style={styles.relatedImage} />
                          <Text numberOfLines={1} style={styles.relatedName}>{prod.name}</Text>
                          {rq === 0 ? (
                            <View style={styles.panelInactive}>
                              <Text style={styles.priceInactiveSmall}>{prod.price} с</Text>
                              <Plus size={16} color="#12A54D" onPress={() => adjustQuantity(prod, 1)} />
                            </View>
                          ) : (
                            <View style={styles.panelActive}>
                              <Minus size={16} color="#fff" onPress={() => adjustQuantity(prod, -1)} />
                              <Text style={styles.qtyText}>{rq}</Text>
                              <Plus size={16} color="#fff" onPress={() => adjustQuantity(prod, 1)} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </ScrollView>
            <View style={styles.detailFooter}>
              <Text style={styles.detailPrice}>{detailProduct.price} с</Text>
              <TouchableOpacity 
                style={styles.detailAdd} 
                onPress={() => {
                  adjustQuantity(detailProduct, 1);
                  setDetailModal(false);
                }}
              >
                <Text style={styles.detailAddText}>В корзину</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.detailClose, { top: insets.top + 8 }]} 
              onPress={() => setDetailModal(false)}
            >
              <Text style={styles.detailCloseText}>✕</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  loader: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  banner: { 
    width: '100%', 
    resizeMode: 'cover' 
  },
  headerButtons: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  likeButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  infoWrap: { 
    padding: 16 
  },
  desc: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 8 
  },
  name: { 
    fontSize: 24, 
    fontWeight: '700' 
  },
  status: { 
    fontSize: 14, 
    marginTop: 4 
  },
  stories: { 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  storyIcon: { 
    width: 60, 
    height: 60, 
    borderRadius: 12, 
    marginRight: 12, 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  storyModalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  storyFullImage: { 
    width: '100%', 
    height: '100%' 
  },
  searchWrap: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f2f2f2', 
    borderRadius: 24, 
    margin: 16, 
    paddingHorizontal: 12 
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchBar: { 
    flex: 1, 
    height: 40 
  },
  tabsContainer: { 
    height: 50 
  },
  tabsContent: { 
    paddingLeft: 16, 
    alignItems: 'center' 
  },
  tab: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    backgroundColor: '#eee', 
    borderRadius: 20, 
    marginRight: 8 
  },
  tabActive: { 
    backgroundColor: '#217B4B' 
  },
  tabText: { 
    color: '#333' 
  },
  tabTextActive: { 
    color: '#fff' 
  },
  row: { 
    justifyContent: 'space-between' 
  },
  list: { 
    padding: 16, 
    paddingBottom: height * 0.1 
  },
  card: { 
    width: ITEM_WIDTH, 
    marginBottom: 16 
  },
  image: { 
    width: '100%', 
    aspectRatio: 1, 
    borderRadius: 8, 
    backgroundColor: '#f9f9f9' 
  },
  pname: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginTop: 8 
  },
  prodDesc: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4, 
    marginBottom: 8 
  },
  panelInactive: { 
    backgroundColor: '#EAEAEA', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 8, 
    borderRadius: 12, 
    flexDirection: 'row', 
    width: '80%' 
  },
  panelActive: { 
    backgroundColor: '#21A25D', 
    padding: 8, 
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',justifyContent: 'space-between' , width: '80%' },
  priceLeft: { fontSize: 14, fontWeight: '600', color: '#217B4B', marginRight: 8 },
  priceInactive: { fontSize: 14, fontWeight: '600', color: '#21A25D', marginRight: 8 },  
  priceLeftSmall: { fontSize: 12, fontWeight: '600', color: '#21A25D', marginRight: 8 },
  priceInactiveSmall: { fontSize: 12, fontWeight: '600', color: '#12A54D', marginRight: 8 },  
  qtyText: { marginHorizontal: 8, fontSize: 14, color: '#fff' },
  orderButton: { position: 'absolute', right: 24, backgroundColor: '#1c6b36', borderRadius: 36, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  orderPrice: { color: '#fff', fontWeight: '600', fontSize: 16, marginRight: 8 },
  orderTime: { color: '#fff', fontSize: 12, opacity: 0.8 },
  detailContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  detailContent: { padding: 16, backgroundColor: '#fff', borderRadius: 12, margin: 16 },
  detailImage: { width: '100%', height: height * 0.4, borderRadius: 8 },
  detailName: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  detailDesc: { fontSize: 14, color: '#666', marginTop: 8 },
  relatedTitle: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  relatedScroll: { paddingVertical: 12 },
  relatedCard: { width: 120, marginRight: 12 },
  relatedImage: { width: 120, height: 120, borderRadius: 8 },
  relatedName: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4 },
  relatedPanel: {},
  detailFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  detailPrice: { fontSize: 18, fontWeight: '700' },
  detailAdd: { backgroundColor: '#217B4B', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  detailAddText: { color: '#fff', fontWeight: '600' },
  detailClose: { position: 'absolute', right: 16 },
  detailCloseText: { 
  fontSize: 32, // больше размер
  color: '#000', // другой цвет
  fontWeight: 'bold', // жирный
  textShadowColor: '#fff', // тень для контраста (опционально)
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
},
});
