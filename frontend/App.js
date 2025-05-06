import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PreloaderPage } from './pages/PreloaderPage';
import LoginScreen from './pages/LoginPage';
import ProtectedScreen from './pages/ProtectedScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Preloader" component={PreloaderPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Protected" component={ProtectedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}