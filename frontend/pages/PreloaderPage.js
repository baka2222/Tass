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
        const tokens = await AsyncStorage.multiGet(['accessToken', 'refreshToken']);
        const accessToken = tokens.find(item => item[0] === 'accessToken')[1];

        if (accessToken) {
          // Verify token validity by hitting a protected endpoint
          const response = await fetch(`${API_BASE_URL}/random/`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            return navigation.replace('Protected');
          }
        }
      } catch (e) {
        console.warn('Token verification failed:', e);
      }
      // Fallback to Login
      navigation.replace('Login');
    };

    bootstrapAsync();
  }, [navigation]);

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