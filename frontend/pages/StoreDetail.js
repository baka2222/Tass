import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import SearchIcon from '../assets/search-refraction.svg';
import { ChevronLeft, Plus, Minus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../store/slices/cartSlice';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../apiConfig';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

export default function StoreDetailScreen({ route, navigation }) {
  const storeId = route?.params?.storeId;
  if (!storeId) { navigation.goBack(); return null; }

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyModal, setStoryModal] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const cart = useSelector(state => state.cart.items);
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) Alert.alert('Нет связи', 'Проверьте интернет');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isConnected) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/stores/${storeId}/`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setStore(data);
      } catch {
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId, isConnected]);

  const allProducts = store?.product_categories?.flatMap(c => c.products) || [];
  const categories = [{ id: 'all', name: 'Все' }, ...(store?.product_categories || [])];
  const filtered = (activeCategory === 'all' ? allProducts : store?.product_categories.find(c => c.id === activeCategory)?.products || [])
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleIncrement = id => dispatch(updateQuantity({ id, quantity: (cart.find(i=>i.id===id)?.quantity||0)+1 }));
  const handleDecrement = id => dispatch(updateQuantity({ id, quantity: Math.max((cart.find(i=>i.id===id)?.quantity||0)-1,0) }));
  const handleAdd = item => dispatch(addToCart({ ...item, storeId }));

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#217B4B" />;
  if (!isConnected) return <Text style={styles.loader}>Нет интернет-соединения</Text>;
  if (!store) return <Text style={styles.loader}>Магазин не найден</Text>;

  const stories = store.stories || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.bannerWrap, { marginTop: -insets.top }]}>        
        {store.banner
          ? <Image source={{ uri: store.banner }} style={[styles.banner, { height: width*0.6 }]} />
          : <View style={[styles.banner, {height: width*0.6, justifyContent:'center',alignItems:'center'}]}><Text>Нет баннера</Text></View>
        }
        <TouchableOpacity style={[styles.back, { top: insets.top+16 }]} onPress={()=>navigation.goBack()}>
          <ChevronLeft size={28} color="#333" />
        </TouchableOpacity>
      </View>

        <View style={{ borderTopLeftRadius: 10, borderBottomRightRadius: 10, paddingTop: 12 }} >
            {store.description ? <Text style={styles.desc}>{store.description}</Text> : null}
        </View>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={[styles.status, { color: store.is_open?'#0D68F1':'#ff4444' }]}>
        {store.is_open ? 'Сейчас открыт' : 'Сейчас закрыт'}
      </Text>

        
      {stories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stories}>
          {stories.map((s, idx)=>(
            <TouchableOpacity key={s.id} onPress={()=>{ setStoryIndex(idx); setStoryModal(true); }}>
              <Image source={{ uri: s.icon }} style={styles.storyIcon} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <></>
      )}

    <View style={styles.searchWrap}>
            <SearchIcon width={20} height={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Поиск товара"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>

      {categories.length > 1 ? (
        <FlatList horizontal data={categories} keyExtractor={c=>c.id.toString()} renderItem={({item})=>(
          <TouchableOpacity style={[styles.tab, activeCategory===item.id&&styles.tabActive]} onPress={()=>setActiveCategory(item.id)}>
            <Text style={activeCategory===item.id?styles.tabTextActive:styles.tabText}>{item.name}</Text>
          </TouchableOpacity>
        )} style={styles.tabs} />
      ) : null}

      {filtered.length === 0 ? (
        <Text style={styles.empty}>Ничего не найдено</Text>
      ) : (
        <FlatList data={filtered} keyExtractor={i=>i.id.toString()} style={{height: height*0.7}} showsVerticalScrollIndicator={false} numColumns={2} columnWrapperStyle={styles.row} renderItem={({item})=>{
          const qty = cart.find(i=>i.id===item.id)?.quantity||0;
          return (
            <View style={styles.card}>
              <Image source={{uri:item.image}} style={styles.image} />
              <Text style={styles.pname}>{item.name}</Text>
              {item.description ? <Text style={styles.prodDesc}>{item.description}</Text> : null}
              {qty>0 ? (
                <View style={[styles.panel, styles.panelActive]}>
                  <TouchableOpacity onPress={()=>handleDecrement(item.id)}><Minus size={25} color="#fff"/></TouchableOpacity>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <TouchableOpacity onPress={()=>handleIncrement(item.id)}><Plus size={25} color="#fff"/></TouchableOpacity>
                </View>
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.price}>{item.price} с</Text>
                  <TouchableOpacity onPress={()=>handleAdd(item)}><Plus size={25} color="#217B4B"/></TouchableOpacity>
                </View>
              )}
            </View>
          );
        }} contentContainerStyle={styles.list} />
      )}

      <View style={styles.orderButton}>
        <Text style={styles.orderPrice}>{total.toFixed(2)} с</Text>
        <Text style={styles.orderTime}>45 мин</Text>
      </View>

      <Modal visible={storyModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={()=>setStoryModal(false)}>
          <Image source={{uri: stories[storyIndex]?.image}} style={styles.modalImage} />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  loader:{flex:1,justifyContent:'center',alignItems:'center'},
  bannerWrap:{overflow:'hidden',height:213},
  banner:{width:'100%',resizeMode:'cover'},
  back:{position:'absolute',left:16,padding:8,backgroundColor:'rgba(255,255,255,0.9)',borderRadius:20,zIndex:1},
  stories:{paddingHorizontal:16,paddingVertical:12, height: 210},
  storyIcon:{width:70,height:70,borderRadius:14,marginRight:12,borderWidth:2,borderColor:'#fff'},
  searchBar:{marginHorizontal:16,padding:12,borderRadius:24,backgroundColor:'#f2f2f2',marginBottom:12},
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 24, marginHorizontal: 16, paddingHorizontal: 12, marginBottom: 10 },
  searchIcon: { marginRight: 8 },
  searchBar: { flex: 1, height: 40 },
  name:{fontSize:26,fontWeight:'700',marginHorizontal:16,marginBottom:5},
  status:{fontSize:16,marginHorizontal:16,marginBottom:5},
  desc:{fontSize:12,color:'#666',marginHorizontal:16,marginBottom:5,lineHeight:20,fontWeight:400},
  tabs:{paddingLeft:16,marginBottom:5,height:100},
  tab:{paddingVertical:8,paddingHorizontal:16,height:36,backgroundColor:'#eee',borderRadius:20,marginRight:8},
  tabActive:{backgroundColor:'#217B4B'},
  tabText:{color:'#333'},
  tabTextActive:{color:'#fff'},
  row:{justifyContent:'space-between'},
  card:{width:ITEM_WIDTH,marginBottom:16},
  image:{width:'100%',aspectRatio:1,borderRadius:12,backgroundColor:'#f5f5f5', padding:8, backgroundColor:'#fff'},
  pname:{fontSize:14,fontWeight:'600',marginTop:8, marginLeft: 8},
  prodDesc:{fontSize:14,color:'#666',marginTop:4, marginLeft: 8, fontWeight: 500},
  panel:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8,padding:8,backgroundColor:'#eee',borderRadius:12,width:'80%'},
  panelActive:{backgroundColor:'#21a038'},
  price:{fontSize:14,fontWeight:'600',color:'#21A25D'},
  qtyText:{color:'#fff',fontSize:14,marginHorizontal:12, fontWeight:'600'},
  list:{paddingHorizontal:16,paddingBottom:100},
  empty:{textAlign:'center',color:'#999',marginTop:19,marginBottom:height*0.3,fontSize:16},
  orderButton:{position:'absolute',bottom:16,right:24,backgroundColor:'#1c6b36',borderRadius:36,paddingVertical:12,paddingHorizontal:20,alignItems:'center',flexDirection:'row'},
  orderPrice:{color:'#fff',fontWeight:'600',fontSize:16,marginRight:8},
  orderTime:{color:'#fff',fontSize:12,opacity:0.8},
  modalContainer:{flex:1,backgroundColor:'rgba(0,0,0,0.9)',justifyContent:'center',alignItems:'center'},
  modalImage:{width:width*0.9,height:height*0.8,resizeMode:'contain',borderRadius:12},
});
