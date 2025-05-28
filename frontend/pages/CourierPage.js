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
import { ArrowLeft, MapPin, QrCode, CreditCard, DollarSign, X } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../apiConfig';

const MIN_DELIVERY_PRICE = 150;
const POLL_INTERVAL = 3000;

const paymentMethods = [
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'cash', label: 'Наличные', icon: DollarSign },
  { id: 'freedom', label: 'Карта', icon: CreditCard },
];

export default function CourierScreen() {
  const navigation = useNavigation();
  const [addressA, setAddressA] = useState('');
  const [addressB, setAddressB] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState('150');
  const [comment, setComment] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('notifications_enabled')
      .then(val => val && setNotificationsEnabled(JSON.parse(val)))
      .catch(console.error);
    AsyncStorage.getItem('deliveryAddress')
      .then(saved => {
        if (saved) {
          const parts = JSON.parse(saved).split(/,\s*/);
          if (parts.length > 1) parts.pop();
          setAddressA(parts.join(', '));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsConnected(s.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    if (isConnected) {
      AsyncStorage.getItem('token').then(tok => {
        setToken(tok);
        fetch(`${API_BASE_URL}/auth/users/me/`, { headers: { Authorization: `Bearer ${tok}` } })
          .then(r => r.json())
          .then(setUser)
          .catch(err => Alert.alert('Ошибка', err.message));
      });
    }
  }, [isConnected]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollStatus = id => {
    pollRef.current = setInterval(async () => {
      try {
        const st = await fetch(
          `${API_BASE_URL}/payments/client/status/?order_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sj = await st.json();
        if (st.ok && sj.pg_payment_status === 'success') {
          clearPoll();
          setPaymentUrl('');
        try {
          const res = await fetch(`${API_BASE_URL}/orders_client/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          {paid: true}
        ),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(Object.values(js).flat().join(', '));
        } catch (e) {
          Alert.alert('Ошибка', e.message);
        }
          Alert.alert('Успех', 'Оплата прошла. Ваш заказ создаётся...');
          navigation.goBack();
        }
      } catch {
        clearPoll();
      }
    }, POLL_INTERVAL);
  };

  const createOrder = async () => {
    const payload = {
      delivery_address_a: addressA,
      delivery_address_b: addressB,
      delivery_price: Number(deliveryPrice),
      payment_method: selectedPayment,
      comment,
      user: user.id,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/orders_client/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (!res.ok) throw new Error(Object.values(js).flat().join(', '));
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
            message: `Заказ №${js.id} создан.`,
            is_read: false,
          }),
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleSubmit = async () => {
    if (!isConnected) return Alert.alert('Ошибка', 'Нет интернета');
    if (!addressA || !addressB)
      return Alert.alert('Ошибка', 'Укажите оба адреса');
    if (!deliveryPrice || Number(deliveryPrice) < MIN_DELIVERY_PRICE)
      return;
    if (!selectedPayment)
      return Alert.alert('Ошибка', 'Выберите способ оплаты');

    setIsSubmitting(true);
    const payload = {
      delivery_address_a: addressA,
      delivery_address_b: addressB,
      delivery_price: Number(deliveryPrice),
      payment_method: selectedPayment,
      comment,
      user: user.id,
    };

    try {
      const resOrder = await fetch(`${API_BASE_URL}/orders_client/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const jsOrder = await resOrder.json();
      if (!resOrder.ok) throw new Error(Object.values(jsOrder).flat().join(', '));

      if (selectedPayment === 'freedom') {
        const fp = await fetch(`${API_BASE_URL}/payments/client/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ client_order_id: jsOrder.id }),
        });
        const fj = await fp.json();
        if (!fp.ok) throw new Error(fj.detail);
        setPaymentUrl(fj.payment_url);
        pollStatus(jsOrder.id);
      } else {
        Alert.alert('Успех', 'Оплата прошла. Ваш заказ создаётся...');
          navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting ||
    !addressA ||
    !addressB ||
    Number(deliveryPrice) < MIN_DELIVERY_PRICE;

  return paymentUrl ? (
    <Modal visible transparent animationType="slide">
      <View style={styles.webContainer}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            clearPoll();
            setPaymentUrl('');
          }}
        >
          <X size={24} color="#333" />
        </TouchableOpacity>
        <WebView source={{ uri: paymentUrl }} style={styles.webview} />
      </View>
    </Modal>
  ) : (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Новый заказ</Text>
        </View>
        <Text style={styles.sectionTitle}>Точка А</Text>
        <View style={styles.inputWithIcon}>
          <MapPin size={20} color="#666" />
          <TextInput
            style={styles.textInput}
            value={addressA}
            onChangeText={setAddressA}
            placeholder="Адрес отправления"
          />
        </View>
        <Text style={styles.sectionTitle}>Точка Б</Text>
        <View style={styles.inputWithIcon}>
          <MapPin size={20} color="#666" />
          <TextInput
            style={styles.textInput}
            value={addressB}
            onChangeText={setAddressB}
            placeholder="Адрес доставки"
          />
        </View>
        <Text style={styles.sectionTitle}>Стоимость</Text>
        <View style={styles.inputWithIcon}>
          <DollarSign size={20} color="#666" />
          <TextInput
            style={styles.textInput}
            value={deliveryPrice}
            onChangeText={text => setDeliveryPrice(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            placeholder={`Мин ${MIN_DELIVERY_PRICE}`}
          />
        </View>
        <Text style={styles.sectionTitle}>Комментарий</Text>
        <TextInput
          placeholder="Дополнительные указания"
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Text style={styles.sectionTitle}>Оплата</Text>
        {paymentMethods.map(({ id, label, icon: Icon }) => (
          <TouchableOpacity
            key={id}
            style={[styles.paymentOption, selectedPayment === id && styles.paymentSelected]}
            onPress={() => setSelectedPayment(id)}
          >
            <Icon size={20} color="#333" />
            <Text style={styles.paymentText}>{label}</Text>
          </TouchableOpacity>
        ))}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    color: '#555',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  paymentSelected: {
    borderColor: '#00B060',
    backgroundColor: '#EAF9F2',
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#00B060',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#BBB',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  webview: {
    marginTop: 60,
    borderRadius: 10,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 30,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
    elevation: 5,
  },
});
