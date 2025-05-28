import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../apiConfig';
import { Bell, ArrowLeft } from 'lucide-react-native';

function timeSince(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  const intervals = [
    { label: 'год', secs: 31536000 },
    { label: 'мес', secs: 2592000 },
    { label: 'дн', secs: 86400 },
    { label: 'ч', secs: 3600 },
    { label: 'мин', secs: 60 },
    { label: 'сек', secs: 1 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count > 0) return `${count} ${i.label}${count > 1 && i.label !== 'мес' ? '' : ''} назад`;
  }
  return 'только что';
}

export default function NotificationsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
    async function loadUser() {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/auth/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Не удалось загрузить пользователя');
        const user = await res.json();
        setUserId(user.id);
      } catch (e) {
        Alert.alert('Ошибка', e.message);
      }
    }
    loadUser();
  }, [token]);

  useEffect(() => {
    if (!userId) return;
    async function loadNotifs() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/users/${userId}/notifications/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Не удалось загрузить уведомления');
        setNotifications(await res.json());
      } catch (e) {
        Alert.alert('Ошибка', e.message);
      } finally {
        setLoading(false);
      }
    }
    loadNotifs();
  }, [userId]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Bell size={20} color="#21A25D" />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.message} numberOfLines={0}>
          {item.message}
        </Text>
      </View>
      <Text style={styles.date}>{timeSince(item.created_at)}</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#21A25D" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#000',
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CDF9DE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: { flex: 1, marginRight: 12 },
  subject: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  message: { fontSize: 14, color: '#333' },
  date: { fontSize: 12, color: '#888' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});