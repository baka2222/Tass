import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PreloaderPage } from './pages/PreloaderPage';
import LoginScreen from './pages/LoginPage';
import ProtectedScreen from './pages/ProtectedScreen';
import StoreDetailScreen from './pages/StoreDetail';
import { store } from './store/index';
import { Provider } from 'react-redux';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Preloader" component={PreloaderPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Protected" component={ProtectedScreen} />
        <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </Provider>
  );
}