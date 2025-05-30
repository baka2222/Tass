import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../apiConfig';
import { ArrowLeft } from 'lucide-react-native';

export default function EditProfileScreen({ route, navigation }) {
  const { user } = route.params;
  const [phoneNumber] = useState(user.phone_number);
  const [name, setName] = useState(user.name || '');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    try {
      AsyncStorage.getItem('token').then((token) => {
        if (token) {
          setToken(token);
        }
      });
    } catch (error) {
      console.error('Error retrieving token from AsyncStorage', error);
    }
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти из профиля?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            // Второе подтверждение
            Alert.alert(
              'Подтвердите выход',
              'Выйти из аккаунта?',
              [
                { text: 'Нет', style: 'cancel' },
                {
                  text: 'Да',
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('refreshToken');
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/me/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json();
        Alert.alert('Ошибка', data.detail || 'Не удалось сохранить');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error updating profile', e);
      Alert.alert('Ошибка', 'Что-то пошло не так');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    const saved = await handleSave();
    if (saved) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backIcon} disabled={loading}>
              <ArrowLeft size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.header}>Мой профиль</Text>

          <View style={styles.container}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Введите имя"
            />

            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={phoneNumber}
              editable={false}
              placeholder={phoneNumber}
            />

            <TouchableOpacity
              style={[
                styles.input,
                { backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center', marginTop: 8 }
              ]}
              onPress={handleLogout}
              disabled={loading}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Выйти из профиля</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#21A25D" />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  backIcon: {
    padding: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 30,
    marginVertical: 15,
  },
  container: {
    flex: 1,
    marginHorizontal: 30,
    paddingTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    height: 52,
    color: '#000',
    backgroundColor: '#EEEEF2',
    marginBottom: 16,
    borderWidth: 0
  },
  disabledInput: {
    color: '#999',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});