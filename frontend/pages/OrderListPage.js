import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Package } from 'lucide-react-native';
import { RefreshControl, ActivityIndicator } from 'react-native';

export default function OrdersScreen({ navigation }) {
  const statuses = {
    en_route: 'Курьер едет',
    delivered: 'Доставлено',
    waiting: 'Упаковывается',
  };
  const [storesHeight, setStoresHeight] = React.useState(28);
  const [orders, setOrders] = React.useState([]);
  const [user, setUser] = React.useState(null);
  const [token, setToken] = React.useState(null);
  const [couriers, setCouriers] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('delivery');
  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const [loading, setLoading] = React.useState(true);

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const time = `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    if (isToday) {
      return `Сегодня, ${time}`;
    } else if (isYesterday) {
      return `Вчера, ${time}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      const months = [
        'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
      ];
      return `${date.getDate()} ${months[date.getMonth()]}, ${time}`;
    } else {
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}.${date.getFullYear()}, ${time}`;
    }
  }

  useEffect(() => {
    const fetchTokenAndUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const response = await fetch(`${API_BASE_URL}/auth/users/me/`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (!response.ok) throw new Error('Ошибка сети');
          setUser(await response.json());
        }
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось загрузить данные пользователя');
      }
    };
    fetchTokenAndUser();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (!user?.id || !token) return;

      const response = await fetch(`${API_BASE_URL}/orders/user/${user.id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Ошибка сети');

      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data);
        setLoading(false);
        setIsRefreshing(false);
      } else {
        setOrders([]);
        setLoading(false);
        setIsRefreshing(false);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить заказы');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, token]);

  const fetchCouriers = async () => {
    setIsRefreshing(true);
    try {
      if (!user?.id || !token) return;

      const response = await fetch(`${API_BASE_URL}/couriers/user/${user.id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Ошибка сети');

      const data = await response.json();
      if (Array.isArray(data)) {
        setCouriers(data);
        setLoading(false);
        setIsRefreshing(false);
      } else {
        setCouriers([]);
        setLoading(false);
        setIsRefreshing(false);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить заказы');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, [user, token]);

  const fetchAll = async () => {
    await fetchOrders();
    await fetchCouriers();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#126e37" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ваши заказы</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={[
            styles.navButton,
            activeTab === 'delivery' && styles.navButtonActive
          ]} onPress={() => { setActiveTab('delivery'); }}>
            <Text style={[
              styles.navButtonText,
              activeTab === 'delivery' && styles.navButtonTextActive
            ]}>Доставка</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
            styles.navButton,
            activeTab === 'courier' && styles.navButtonActive
          ]} onPress={() => { setActiveTab('courier'); }}>
            <Text style={[
              styles.navButtonText,
              activeTab === 'courier' && styles.navButtonTextActive
            ]}>Курьер</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchAll} />
        }
      >
        {activeTab === 'delivery' && (
          orders.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#888', fontSize: 16 }}>Нет заказов по доставке</Text>
            </View>
          ) : (
            orders.map((orderData) => {
              const isDelivered = orderData.status === 'delivered';
              return (
                <View
                  style={[styles.orderCard, isDelivered && styles.orderCardDelivered]}
                  key={orderData.id}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderDate}>{formatDate(orderData.created_at)}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { order: orderData })}>
                        <View style={styles.statusBox}>
                          <Text style={styles.statusText}>{statuses[orderData.status]}</Text>
                          <Text style={styles.arrow}>{'>'}</Text>
                        </View>
                      </TouchableOpacity>
                      <Package style={styles.courierIcon} />
                    </View>
                  </View>

                  <View style={styles.timeline}>
                    <View style={styles.timelineItem} onLayout={e => setStoresHeight(e.nativeEvent.layout.height)}>
                      <View style={[styles.circle, styles.purple]}>
                        <View style={styles.innerCircle} />
                      </View>
                      <Text style={styles.timelineText}>
                        {[...new Map(orderData.items.map(item => [item.store.id, item.store])).values()]
                          .map(store => store.name)
                          .join(', ')}
                      </Text>
                    </View>

                    <View style={[styles.verticalLine, { height: storesHeight, marginTop: -storesHeight * 0.5 }]} />

                    <View style={styles.timelineItem}>
                      <View style={[styles.circle, styles.green]}>
                        <View style={styles.innerCircle} />
                      </View>
                      <Text style={styles.timelineText}>{orderData.delivery_address}</Text>
                    </View>

                    <View style={styles.productsBlock}>
                      {orderData.items.map((item, idx) => (
                        <View style={styles.productRow} key={idx}>
                          <Text style={styles.productName}>{item.product_detail.name}</Text>
                          <Text style={styles.productQty}>×{item.quantity}</Text>
                          <Text style={styles.productPrice}>{item.product_detail.price} сом</Text>
                        </View>
                      ))}
                      {orderData.promocode_used && (
                        <View style={styles.productRow}>
                          <Text style={styles.productName}>{'Скидка'}</Text>
                          <Text style={styles.productPrice}>-{orderData.promocode_used_detail.discount_amount} сом</Text>
                        </View>
                      )}
                      <View style={styles.productRow}>
                        <Text style={styles.productName}>{'Стоимость доставки'}</Text>
                        <Text style={styles.productPrice}>{'200'} сом</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )
        )}

        {activeTab === 'courier' && (
          couriers.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#888', fontSize: 16 }}>Нет курьерских заказов</Text>
            </View>
          ) : (
            couriers.map((orderData) => {
              const isDelivered = orderData.status === 'delivered';
              return (
                <View
                  style={[styles.orderCard, isDelivered && styles.orderCardDelivered]}
                  key={orderData.id}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderDate}>{formatDate(orderData.created_at)}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <TouchableOpacity onPress={() => navigation.navigate('OrderClientDetail', { order: orderData })}>
                        <View style={styles.statusBox}>
                          <Text style={styles.statusText}>{statuses[orderData.status]}</Text>
                          <Text style={styles.arrow}>{'>'}</Text>
                        </View>
                      </TouchableOpacity>
                      <Package style={styles.courierIcon} />
                    </View>
                  </View>

                  <View style={styles.timeline}>
                    <View style={styles.timelineItem} onLayout={e => setStoresHeight(e.nativeEvent.layout.height)}>
                      <View style={[styles.circle, styles.purple]}>
                        <View style={styles.innerCircle} />
                      </View>
                      <Text style={styles.timelineText}>
                        {orderData.delivery_address_a}
                      </Text>
                    </View>

                    <View style={[styles.verticalLine, { height: storesHeight, marginTop: -storesHeight * 0.5 }]} />

                    <View style={styles.timelineItem}>
                      <View style={[styles.circle, styles.green]}>
                        <View style={styles.innerCircle} />
                      </View>
                      <Text style={styles.timelineText}>{orderData.delivery_address_b}</Text>
                    </View>
                  </View>

                  <View style={styles.productsBlock}>
                    <View style={styles.productRow}>
                      <Text style={styles.productName}>{'Стоимость доставки'}</Text>
                      <Text style={styles.productPrice}>{orderData.delivery_price} сом</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  productsBlock: {
    marginTop: 8,
    gap: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    color: '#222',
    flex: 1,
  },
  productQty: {
    fontSize: 14,
    color: '#888',
    marginHorizontal: 8,
  },
  productPrice: {
    fontSize: 14,
    color: '#126e37',
    minWidth: 60,
    textAlign: 'right',
  },
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingBottom: 0 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  navButtons: { flexDirection: 'row', gap: 8 },
  navButton: {
    backgroundColor: '#e2e2e9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  navButtonActive: { backgroundColor: '#21a25d' },
  navButtonText: { color: '#000', fontSize: 14 },
  navButtonTextActive: { color: '#fff', fontSize: 14 },

  orderCard: {
    backgroundColor: '#e5f8ee',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  orderCardDelivered: { backgroundColor: '#f0f0f0' },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  orderDate: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffcc',
    borderRadius: 10,
    padding: 5,
    marginBottom: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'white',
    color: '#126e37',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6
  },
  arrow: { color: '#21a25d', fontSize: 15, fontWeight: 'bold' },
  courierIcon: { width: 38, height: 38, marginTop: 4 },

  timeline: { marginTop: -12, gap: 6 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerCircle: { width: 8, height: 8, borderRadius: 4 },
  purple: { backgroundColor: '#a259ff', zIndex: 1 },
  green: { backgroundColor: '#21a25d', zIndex: 1 },
  timelineText: { fontSize: 14, fontWeight: '500', width: '75%' },
  verticalLine: {
    width: 2,
    height: 28,
    backgroundColor: '#a3a3a3',
    marginLeft: 6.5,
    marginBottom: -15,
    borderRadius: 1,
  },
  timelineDescription: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boxIcon: { width: 20, height: 20 },
  orderDescription: { fontSize: 14, color: '#6f6f6f', flex: 1 },
  repeatButton: { color: '#126E37', fontSize: 14, fontWeight: '500', marginTop: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 18, height: 18 },
  navLabel: { fontSize: 12, color: '#9e9e9e' },
  navLabelActive: { fontSize: 12, color: '#21a25d' },
  activeNav: {},
  navDot: {
    position: 'absolute',
    top: 4,
    right: -4,
    width: 8,
    height: 8,
    backgroundColor: '#21a25d',
    borderRadius: 4
  }
});