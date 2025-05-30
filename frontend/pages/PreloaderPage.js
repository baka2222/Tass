import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../apiConfig';

export function PreloaderPage({ navigation }) {
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get tokens
        const tokens = await AsyncStorage.multiGet(['token', 'refreshToken']);
        let accessToken = tokens.find(item => item[0] === 'token')[1];
        const refreshToken = tokens.find(item => item[0] === 'refreshToken')[1];

        let response = null;
        if (accessToken) {
          response = await fetch(`${API_BASE_URL}/random/`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }

        // Если access token невалиден, пробуем refresh
        if (!response || response.status === 401) {
          if (refreshToken) {
            const refreshResp = await fetch(`${API_BASE_URL}/token/refresh/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            const data = await refreshResp.json();
            if (data.access) {
              await AsyncStorage.setItem('token', data.access);
              accessToken = data.access;
              // Пробуем снова
              response = await fetch(`${API_BASE_URL}/random/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (response.ok) {
                return navigation.replace('Protected');
              }
            }
          }
          // Если refresh не сработал — на логин
          return navigation.replace('Login');
        }

        if (response && response.ok) {
          return navigation.replace('Protected');
        }
      } catch (e) {
        console.warn('Token verification failed:', e);
      }
      navigation.replace('Login');
    };

    bootstrapAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>TASS</Text>
      <ActivityIndicator size="large" color="#217B4B" style={styles.loader} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    color: '#217B4B',
    fontSize: 76,
    fontWeight: 'bold',
    transform: [{ scaleY: 1.4 }],
  },
  loader: {
    marginTop: 20,
  },
});