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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import LocationIcon from '../assets/location-icon.svg';
import SearchIcon from '../assets/search-refraction.svg';
import { Home, Search, CreditCard, User, ShoppingBag, Utensils, Bike } from 'lucide-react-native';
import { API_BASE_URL } from '../apiConfig';
import { SearchScreen } from './SearchPage';
import { useDispatch, useSelector } from 'react-redux';
import ProfileScreen from './ProfilePage';
import OrdersScreen from './OrderListPage';

const Tab = createBottomTabNavigator();

const IconButtonsRow = ({ navigation }) => (
  <View style={styles.iconsRow}>
    <TouchableOpacity 
      style={styles.iconButton}
      onPress={() => navigation.navigate('Поиск')}
    >
      <ShoppingBag size={24} color="#217B4B" />
      <Text style={styles.iconText}>Продукты</Text>
    </TouchableOpacity>

    <TouchableOpacity 
      style={styles.iconButton}
      onPress={() => navigation.navigate('Поиск')}
    >
      <Utensils size={24} color="#217B4B" />
      <Text style={styles.iconText}>Доставка еды</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.iconButton}
      onPress={() => navigation.navigate('Courier')}>
      <Bike size={24} color="#217B4B" />
      <Text style={styles.iconText}>Курьер</Text>
    </TouchableOpacity>
  </View>
);

export function HomeScreen({ navigation }) {
    const dispatch = useDispatch();
    const totalPrice = useSelector(state => state.cart.total);
  const [address, setAddress] = useState('Не указан');
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [ads, setAds] = useState([]);
  const [storesData, setStoresData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('deliveryAddress');
        if (saved) setAddress(saved.slice(1, -1));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyNjExMTY3MDA2LCJpYXQiOjE3NDcyNTM0MDYsImp0aSI6IjcwNjFhMjgyNGMxZDQ2M2NiNzlhMjMyYTExZjZhZTI4IiwidXNlcl9pZCI6MX0.GtWMQWzkGx4BAxHHS3Flv1TlPHYsgmCVAOLLxagX9f8')
  }, []);

  const [token, setToken] = useState(null)
  
    useEffect(() => {
      try {
        AsyncStorage.getItem('token').then((token) => {
          if (token) {
            setToken(token)
          }
        });
      } catch (error) {
        console.error('Error retrieving token from AsyncStorage', error);
      }
    }, [])

  useEffect(() => {
    (async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert('Ошибка', 'Нет интернет-соединения');
        setLoading(false);
        return;
      }
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyNjExMTY3MDA2LCJpYXQiOjE3NDcyNTM0MDYsImp0aSI6IjcwNjFhMjgyNGMxZDQ2M2NiNzlhMjMyYTExZjZhZTI4IiwidXNlcl9pZCI6MX0.GtWMQWzkGx4BAxHHS3Flv1TlPHYsgmCVAOLLxagX9f8';
      try {
        const [adsRes, storesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/ads/`, { headers: { Authorization: `Bearer ${token}` }}),
          fetch(`${API_BASE_URL}/stores/`, { headers: { Authorization: `Bearer ${token}` }}),
        ]);
        if (adsRes.status === 401 || storesRes.status === 401) {
          await AsyncStorage.multiRemove(['accessToken','refreshToken']);
          setAds([]);
          setStoresData([]);
        } else {
          const adsJson = await adsRes.json().catch(() => []);
          const storesJson = await storesRes.json().catch(() => []);
          setAds(Array.isArray(adsJson)? adsJson : []);
          setStoresData(Array.isArray(storesJson)? storesJson : []);
        }
      } catch {
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSearchPress = () => {
    navigation.navigate('Поиск');
    setIsFocused(true);
  };

  const handleMorePress = () => {
    navigation.navigate('Поиск');
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>Адрес доставки</Text>
              <Text style={styles.addressText}>{address}</Text>
            </View>
            <View style={styles.headerIcon}>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <LocationIcon width={24} height={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBox} onPress={handleSearchPress}>
          <SearchIcon width={24} height={24} style={styles.searchIcon} />
          {isFocused ? (
            <TextInput
              style={styles.searchInput}
              value={searchValue}
              onChangeText={setSearchValue}
              onBlur={() => !searchValue && setIsFocused(false)}
              autoFocus
            />
          ) : (
            <Text style={styles.searchPlaceholder}>
              {searchValue || 'Что желаете?                                              '}
            </Text>
          )}
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sliderBox}>
          {ads.length > 0 ? ads.map(ad => (
            <Image
              key={ad.id}
              source={{ uri: ad.cropped || ad.image }}
              style={[styles.sliderImg, { width: 280, height: 100 }]}
            />
          )) : (
            <Text style={styles.emptyText}>Реклама не доступна</Text>
          )}
        </ScrollView>

        <IconButtonsRow navigation={navigation} />

        {storesData.length > 0 ? storesData.map(category => (
          <View key={category.id} style={styles.categoryBox}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <TouchableOpacity onPress={handleMorePress}>
                <Text style={styles.moreButton}>Больше →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {category.stores?.length > 0 ? category.stores.map(store => (
                <View key={store.id} style={styles.sliderItem}>
                  <TouchableOpacity onPress={() => navigation.navigate('StoreDetail', { storeId: store.id })}>
                    <Image
                      source={{ uri: store.banner }}
                      style={[styles.categoryImg, { width: 158, height: 80 }]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.sliderItemTitle}>{store.name}</Text>
                  <Text style={styles.sliderItemTime}>{store.description}</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>Магазины не найдены</Text>
              )}
            </ScrollView>
          </View>
        )) : (
          <Text style={styles.emptyText}>Категории не найдены</Text>
        )}
      </ScrollView>
      <TouchableOpacity
      onPress={() => navigation.navigate('Order')}>
      <View style={styles.orderButton}>
        <Text style={styles.orderPrice}>{totalPrice}.00 c</Text>
        <Text style={styles.orderTime}>К корзине</Text>
      </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#217B4B',
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Главная': return <Home color={color} size={size} />;
            case 'Поиск': return <Search color={color} size={size} />;
            case 'Заказы': return <CreditCard color={color} size={size} />;
            case 'Профиль': return <User color={color} size={size} />;
          }
        },
      })}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Поиск" component={SearchScreen} />
      <Tab.Screen name="Заказы" component={OrdersScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { marginBottom: 16 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  addressBox: { flex: 1 },
  addressLabel: { fontSize: 16, color: '#999' },
  addressText: { fontSize: 18, fontWeight: '500' },
  headerIcon: { padding: 8, borderRadius: 20, backgroundColor: '#eee' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingHorizontal: 12, borderRadius: 24, height: 48, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchPlaceholder: { color: '#999', fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16 },
  sliderBox: { flexDirection: 'row', marginBottom: 24 },
  sliderImg: { marginRight: 16, borderRadius: 12 },
  emptyText: { color: '#999', textAlign: 'center', width: '100%', marginVertical: 8 },
  categoryBox: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryTitle: { fontSize: 20, fontWeight: '600' },
  moreButton: { fontSize: 14, color: '#21a038' },
  sliderItem: { width: 158, marginRight: 8 },
  categoryImg: { borderRadius: 12 },
  sliderItemTitle: { fontSize: 14, fontWeight: 600, color: '#091938', marginLeft: 8, marginTop: 8 },
  sliderItemTime: { fontSize: 12, color: '#666', marginLeft: 8 },
  orderButton: { position: 'absolute', bottom: 16, right: 24, backgroundColor: '#1c6b36', borderRadius: 36, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  orderPrice: { color: '#fff', fontWeight: '600', fontSize: 16 },
  orderTime: { color: '#fff', fontSize: 12, opacity: 0.8 },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  iconButton: {
    alignItems: 'center',
    width: '30%',
  },
  iconText: {
    marginTop: 8,
    fontSize: 12,
    color: '#217B4B',
    textAlign: 'center',
  },
});