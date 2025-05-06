import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function ProtectedScreen({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the App!</Text>
      <Button title="Logout" onPress={handleLogout} />
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
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
