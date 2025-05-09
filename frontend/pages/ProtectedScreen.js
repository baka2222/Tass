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
import { Home, Search, CreditCard, User } from 'lucide-react-native';
import { API_BASE_URL } from '../apiConfig';

const Tab = createBottomTabNavigator();

export function HomeScreen({navigation}) {
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
        if (saved) setAddress(saved);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert('Ошибка', 'Нет интернет-соединения');
        setLoading(false);
        return;
      }
      const token = await AsyncStorage.getItem('accessToken');
      try {
        const [adsRes, storesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/ads/`, 
            // { headers: { Authorization: `Bearer ${token}` }}
          ),
          fetch(`${API_BASE_URL}/stores/`, 
            // { headers: { Authorization: `Bearer ${token}` }}
          ),
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
              <LocationIcon width={24} height={24} />
            </View>
          </View>
        </View>
        <View style={styles.searchBox}>
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
            <Text style={styles.searchPlaceholder} onPress={() => setIsFocused(true)}>
              {searchValue || 'Что желаете?                                              '}
            </Text>
          )}
        </View>
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
        {storesData.length > 0 ? storesData.map(category => (
          <View key={category.id} style={styles.categoryBox}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.moreButton}>Больше →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Array.isArray(category.stores) && category.stores.length > 0 ? category.stores.map(store => (
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
      <View style={styles.orderButton}>
        <Text style={styles.orderPrice}>400 с</Text>
        <Text style={styles.orderTime}>45 мин</Text>
      </View>
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
            case 'Корзина': return <CreditCard color={color} size={size} />;
            case 'Профиль': return <User color={color} size={size} />;
          }
        },
      })}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Поиск" component={HomeScreen} />
      <Tab.Screen name="Корзина" component={HomeScreen} />
      <Tab.Screen name="Профиль" component={HomeScreen} />
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
});
