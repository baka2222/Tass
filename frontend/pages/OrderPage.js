import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Minus, ArrowLeft, Trash2 } from 'lucide-react-native';
import { removeFromCart, updateQuantity, clearCart } from '../store/slices/cartSlice';
import { API_BASE_URL } from '../apiConfig';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELIVERY_FEE = 200;

export default function OrderScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const orderTotal = useSelector(state => state.cart.total);
  const [user, setUser] = useState(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoTouched, setPromoTouched] = useState(false);
  const [promoList, setPromoList] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
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


  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(s => setIsConnected(s.isConnected));
    return unsubscribe;
  }, []);

  // Загрузка списка промокодов
  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/promocodes/`);
        if (!res.ok) throw new Error('Не удалось загрузить промокоды');
        setPromoList(await res.json());
      } catch (e) {
        if (e.name !== 'AbortError') Alert.alert('Ошибка', e.message);
      }
    })();
  }, [isConnected]);

  // Загрузка текущего пользователя
  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        setToken(token);
        const res = await fetch(`${API_BASE_URL}/auth/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Не удалось загрузить данные пользователя');
        setUser(await res.json());
      } catch (e) {
        if (e.name !== 'AbortError') Alert.alert('Ошибка', e.message);
      }
    })();
  }, [isConnected, token]);

  // Поиск введённого промокода
  const promoEntry = promoList.find(
    p => p.code.toUpperCase() === promoCode.trim().toUpperCase()
  );
  const promoId = promoEntry ? promoEntry.id : null;
  const isPromoValid = promoTouched && !!promoEntry;

  // Валидация промокода
  const canApplyPromo = isPromoValid &&
    orderTotal >= (promoEntry?.min_order_sum || 0) &&
    (promoEntry.on_products.length === 0 ||
      cartItems.some(item => promoEntry.on_products.includes(item.id))
    );
  const rawDiscount = promoEntry && canApplyPromo ? promoEntry.discount_amount : 0;
  const discount = Math.min(rawDiscount, orderTotal + DELIVERY_FEE);

  const subtotal = orderTotal;
  const delivery = DELIVERY_FEE;
  const total = subtotal + delivery;
  const finalTotal = Math.max(total - discount, 0);

  const handleDecrease = item => {
    if (item.quantity > 1) {
      dispatch(updateQuantity({ id: item.id, storeId: item.store.id, quantity: item.quantity - 1 }));
    } else {
      dispatch(removeFromCart({ id: item.id, storeId: item.store.id }));
    }
  };
  const handleIncrease = item =>
    dispatch(updateQuantity({ id: item.id, storeId: item.store.id, quantity: item.quantity + 1 }));
  const handleRemove = item => dispatch(removeFromCart({ id: item.id, storeId: item.store.id }));

  const proceed = () => {
    if (promoTouched && promoCode && !canApplyPromo) {
      Alert.alert('Промокод некорректен или не удовлетворяет условиям');
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert('Корзина пуста');
      return;
    }

    // Навигация: передаем ID промокода
    navigation.navigate('Address', { discount, promoCodeId: promoId });

    // Обновление использования промокода на бэке
    if (canApplyPromo && user?.id && promoId && !promoEntry.users_used.includes(user.id)) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/promocodes/${promoId}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ users_used: [...promoEntry.users_used, user.id] })
          });
          if (!res.ok) throw new Error('Ошибка обновления промокода');
          const data = await res.json();
          setPromoList(prev => prev.map(p => p.id === data.id ? data : p));
        } catch (e) {
          console.error('Ошибка обновления промокода:', e);
        }
      })();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Корзина</Text>
          <View style={{ width: SCREEN_WIDTH * 0.1 }} />
        </View>

        {cartItems.map(item => (
          <View key={`${item.store.id}-${item.id}`} style={styles.itemWrapper}>
            <View style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={styles.itemBottom}>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => handleDecrease(item)}>
                      <Minus size={16} color={item.quantity === 1 ? '#ccc' : '#000'} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => handleIncrease(item)}>
                      <Plus size={16} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>{item.price * item.quantity} с</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(item)}>
              <Trash2 size={20} color="#E32D2D" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={[styles.promoContainer, promoTouched && (canApplyPromo ? styles.validPromo : styles.invalidPromo)]}>
          <Text style={styles.promoLabel}>Промокод</Text>
          <TextInput
            style={styles.promoInput}
            value={promoCode}
            onFocus={() => setPromoTouched(true)}
            onChangeText={setPromoCode}
            placeholder="Введите код"
          />
          {promoTouched && !canApplyPromo && promoCode.length > 0 && (
            <Text style={styles.errorText}>Промокод недействителен или не применим</Text>
          )}
          {canApplyPromo && (
            <Text style={styles.successText}>Скидка применена: -{discount} с</Text>
          )}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Сумма</Text>
            <Text style={styles.summaryValue}>{subtotal} с</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Доставка</Text>
            <Text style={styles.summaryValue}>{delivery} с</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Скидка</Text>
            <Text style={styles.summaryValue}>-{discount} с</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 8 }]}>  
            <Text style={[styles.summaryLabel, { fontSize: 18 }]}>Итого</Text>
            <Text style={[styles.summaryValue, { fontSize: 18 }]}> {finalTotal} с</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.finalButton, promoTouched && !canApplyPromo && styles.disabledButton]}
        onPress={proceed}
        disabled={promoTouched && !canApplyPromo}
      >
        <Text style={styles.finalTotal}>{finalTotal} с</Text>
        <Text style={styles.finalNext}>Оформить</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemDesc: {fontSize: 14, fontWeight: '400', color: '#666666'},
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  itemWrapper: { marginBottom: 16 },
  itemCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center' },
  itemImage: { width: 90, height: 85, borderRadius: 12 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 14, paddingHorizontal: 8, height: 32 },
  qty: { marginHorizontal: 8, fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: '500' },
  deleteBtn: { position: 'absolute', right: 16, top: 16 },
  promoContainer: { marginVertical: 16 },
  promoLabel: { fontSize: 16, color: 'rgba(0,0,0,0.3)', marginBottom: 4 },
  promoInput: { height: 48, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  validPromo: { borderColor: '#28A745', borderWidth: 2 },
  invalidPromo: { borderColor: '#E32D2D', borderWidth: 2 },
  errorText: { color: '#E32D2D', marginTop: 4 },
  successText: { color: '#28A745', marginTop: 4 },
  summaryContainer: { marginVertical: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 16, fontWeight: '500' },
  summaryValue: { fontSize: 16, fontWeight: '500' },
  finalButton: { position: 'absolute', bottom: 40, left: 24, right: 24, borderRadius: 10, backgroundColor: '#21A25D', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  finalTotal: { fontSize: 16, fontWeight: '600', color: 'white' },
  finalNext: { fontSize: 16, color: 'white' },
  disabledButton: { backgroundColor: '#ccc' }
});
