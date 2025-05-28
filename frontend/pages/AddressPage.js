import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft,
  MapPin,
  QrCode,
  CreditCard,
  DollarSign,
  X,
} from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../apiConfig';
import { clearCart } from '../store/slices/cartSlice';

const DELIVERY_FEE = 200;
const POLL_INTERVAL = 3000;

const paymentMethods = [
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'freedom', label: 'Карта', icon: CreditCard },
  { id: 'cash', label: 'Наличкой', icon: DollarSign },
];

export default function AddressConfig({ navigation, route }) {
  const dispatch = useDispatch();
  const { promoCodeId, discount } = route.params || {};
  const items = useSelector(state => state.cart.items);
  const subtotal = useSelector(state => state.cart.total);

  const [address, setAddress] = useState('');
  const [house, setHouse] = useState('');
  const [flat, setFlat] = useState('');
  const [comment, setComment] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollRef = useRef(null);

  // Load initial data and user
  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
    AsyncStorage.getItem('notifications_enabled')
      .then(val => val && setNotificationsEnabled(JSON.parse(val)))
      .catch(console.error);
    AsyncStorage.getItem('deliveryAddress')
      .then(saved => {
        if (saved) {
          const parsed = parseSavedAddress(saved);
          if (parsed) {
            setAddress(parsed.street);
            setHouse(parsed.house);
            setFlat(parsed.flat);
            setComment(parsed.comment || '');
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsConnected(s.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    if (isConnected && token) {
      fetch(`${API_BASE_URL}/auth/users/me/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(setUser)
        .catch(err => Alert.alert('Ошибка', err.message));
    }
  }, [isConnected, token]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollStatus = orderId => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/payments/store/status/?order_id=${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const js = await res.json();
        if (res.ok && js.pg_payment_status === 'success') {
          clearPoll();
          setPaymentUrl('');
          await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paid: true }),
          });
          Alert.alert('Успех', 'Оплата прошла успешно');
          dispatch(clearCart());
          navigation.navigate('Protected');
        }
      } catch {
        clearPoll();
      }
    }, POLL_INTERVAL);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!address) return Alert.alert('Ошибка', 'Введите адрес');
    if (!selectedPayment) return Alert.alert('Ошибка', 'Выберите оплату');
    if (items.length === 0) return Alert.alert('Ошибка', 'Корзина пуста');

    const payload = {
      delivery_address: `${address}, д. ${house}, кв. ${flat}${comment ? ', ' + comment : ''}`,
      payment_method: selectedPayment,
      status: 'waiting',
      items: items.map(i => ({ product: i.id, quantity: i.quantity })),
      ...(promoCodeId && { promocode_used: promoCodeId }),
      total_price: subtotal + DELIVERY_FEE - discount,
      user: user.id,
    };

    setIsSubmitting(true);
    try {
      const orderRes = await fetch(`${API_BASE_URL}/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(JSON.stringify(orderJson));

      if (selectedPayment === 'freedom') {
        const fp = await fetch(`${API_BASE_URL}/payments/store/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order_id: orderJson.id }),
        });
        const fj = await fp.json();
        if (!fp.ok) throw new Error(fj.detail);
        setSessionId(orderJson.id);
        setPaymentUrl(fj.payment_url);
        pollStatus(orderJson.id);
      } else {
        if (notificationsEnabled) {
          await fetch(`${API_BASE_URL}/users/${user.id}/notifications/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user: user.id,
              subject: 'Заказ создан',
              message: `Ваш заказ №${orderJson.id} создан`,
              is_read: false,
            }),
          });
        }
        dispatch(clearCart());
        navigation.navigate('Protected');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = subtotal + DELIVERY_FEE - discount;
  const isDisabled = !address || !selectedPayment || items.length === 0;

  // Рендер WebView-модалки вне хука
  if (paymentUrl) {
    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.webContainer}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => { clearPoll(); setPaymentUrl(''); }}
          >
            <X size={24} color="#333" />
          </TouchableOpacity>
          <WebView source={{ uri: paymentUrl }} style={styles.webview} />
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Куда доставить</Text>
        <View style={styles.inputWithIcon}>
          <MapPin size={24} color="#666" />
          <TextInput
            style={styles.textInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Адрес"
          />
        </View>
        <View style={styles.inlineInputs}>
          <TextInput
            style={[styles.simpleInput, { marginRight: 8 }]}
            value={house}
            onChangeText={setHouse}
            placeholder="Дом"
          />
          <TextInput
            style={styles.simpleInput}
            value={flat}
            onChangeText={setFlat}
            placeholder="Кв."
          />
        </View>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Комментарий"
        />

        <Text style={styles.sectionTitle}>Оплата</Text>
        {paymentMethods.map(({ id, label, icon: Icon }) => (
          <TouchableOpacity
            key={id}
            style={[styles.paymentOption, selectedPayment === id && styles.paymentSelected]}
            onPress={() => setSelectedPayment(id)}
          >
            <View style={styles.paymentContent}>
              <Icon size={24} color="#333" />
              <Text style={styles.paymentText}>{label}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalAmount}>{total} сом</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isDisabled && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Оформить заказ</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function parseSavedAddress(addressString) {
  const pattern = /(.+),\s*д\.\s*(\d+),\s*кв\.\s*(\d+)(?:,\s*(.+))?/;
  const match = addressString.match(pattern);
  if (!match) return null;
  return {
    street: match[1].trim().slice(1),
    house: match[2].trim(),
    flat: match[3].trim(),
    comment: match[4] ? match[4].trim().slice(0, -1) : '',
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  header: { flexDirection: 'row', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, color: '#333' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 12, marginBottom: 12, height: 48 },
  textInput: { flex: 1, fontSize: 16, color: '#000', marginLeft: 8 },
  inlineInputs: { flexDirection: 'row', marginBottom: 12 },
  simpleInput: { flex: 1, height: 48, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 12, fontSize: 16, color: '#000' },
  commentInput: { height: 48, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 12, fontSize: 16, color: '#000', marginBottom: 20 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, height: 48, marginBottom: 12, borderWidth: 1, borderColor: '#ccc' },
  paymentSelected: { borderColor: '#00B060', borderWidth: 2 },
  paymentContent: { flexDirection: 'row', alignItems: 'center' },
  paymentText: { marginLeft: 8, fontSize: 16, color: '#333' },
  totalBlock: { alignItems: 'center', marginTop: 16 },
  totalLabel: { color: '#808080', fontSize: 14 },
  totalAmount: { fontWeight: 'bold', fontSize: 20, color: '#000', marginTop: 4 },
  submitButton: { backgroundColor: '#00B060', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  disabledButton: { backgroundColor: '#ccc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  webContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  webview: { marginTop: 60, borderRadius: 10, overflow: 'hidden' },
  closeBtn: { position: 'absolute', top: 30, right: 20, backgroundColor: '#fff', borderRadius: 20, padding: 6, zIndex: 10, elevation: 5 },
});
