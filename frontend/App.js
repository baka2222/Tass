import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PreloaderPage } from './pages/PreloaderPage';
import LoginScreen from './pages/LoginPage';
import ProtectedScreen from './pages/ProtectedScreen';
import StoreDetailScreen from './pages/StoreDetail';
import { store } from './store/index';
import { Provider } from 'react-redux';
import OrderScreen from './pages/OrderPage';
import AddressConfig from './pages/AddressPage';
import CourierScreen from './pages/CourierPage';
import EditProfileScreen from './pages/EditProfilePage';
import NotificationsScreen from './pages/NotificationsPage';
import OrderDetail from './pages/OrderDetail';
import OrderClientDetail from './pages/OrderClientDetail';

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
        <Stack.Screen name="Order" component={OrderScreen} />
        <Stack.Screen name="Address" component={AddressConfig} />
        <Stack.Screen name="Courier" component={CourierScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetail} />
        <Stack.Screen name="OrderClientDetail" component={OrderClientDetail} />
      </Stack.Navigator>
    </NavigationContainer>
    </Provider>
  );
}