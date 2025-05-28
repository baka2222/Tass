import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Bell,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { API_BASE_URL } from '../apiConfig';

export default function ProfileScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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
    AsyncStorage.getItem('notifications_enabled')
      .then(value => {
        if (value !== null) {
          setNotificationsEnabled(JSON.parse(value));
        }
      })
      .catch(console.error);
  }, []);

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      await AsyncStorage.setItem('notifications_enabled', JSON.stringify(newValue));
    } catch (e) {
      console.error('Error saving notifications setting', e);
    }
  };

  const handleSupport = () => {
    Alert.alert(
  'Открыть Telegram?',
  'Вы хотите перейти в Telegram?',
  [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Перейти', onPress: () => Linking.openURL('https://t.me/morfidi') },
  ]
);
  };

  const handleProfile = async () => {
    try {
    //   const token = await AsyncStorage.getItem('token');
    //   if (!token) {
    //     Alert.alert('Не авторизованы', 'Токен не найден');
    //     return;
    //   }
      const response = await fetch(`${API_BASE_URL}/auth/users/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        navigation.navigate('EditProfile', { user: userData });
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить профиль');
      }
    } catch (e) {
      console.error('Error fetching profile', e);
      Alert.alert('Ошибка', 'Что-то пошло не так');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Профиль</Text>

        <TouchableOpacity style={styles.option} activeOpacity={0.7} onPress={handleProfile}>
          <View style={styles.row}>
            <User size={24} color={'#8C8C8C'} />
            <Text style={styles.optionText}>Мой профиль</Text>
          </View>
          <ChevronRight size={24} color={'#8C8C8C'} />
        </TouchableOpacity>

        <View style={styles.option}>
          <View style={styles.row}>
            <Bell size={24} color={'#8C8C8C'} />
            <Text style={styles.optionText}>Уведомления</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            defaultValue={notificationsEnabled}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        <TouchableOpacity style={styles.option} activeOpacity={0.7} onPress={handleSupport}>
          <View style={styles.row}>
            <MessageSquare size={24} color={'#8C8C8C'} />
            <Text style={styles.optionText}>Связаться с поддержкой</Text>
          </View>
          <ChevronRight size={24} color={'#8C8C8C'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    color: '#000',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
  },
});
