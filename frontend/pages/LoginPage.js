import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../apiConfig';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('+996');
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const checkInternetConnection = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      Alert.alert('Ошибка', 'Отсутствует интернет-соединение');
      return false;
    }
    return true;
  };

  const sendCode = async () => {
    if (!(await checkInternetConnection())) return;
    
    if (phone.length < 13) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phone }),
      });

      const data = await response.json();
      if (response.ok) {
        setTimer(60);
      } else {
        Alert.alert('Ошибка', data.detail || 'Не удалось отправить код');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!(await checkInternetConnection())) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phone, code: code }),
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.multiSet([
          ['accessToken', data.access],
          ['refreshToken', data.refresh],
        ]);
        navigation.navigate('ProtectedScreen');
      } else {
        Alert.alert('Ошибка', data.detail || 'Неверные данные');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Ошибка аутентификации');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = text => {
    if (!text.startsWith('+996')) text = '+996';
    setPhone(text);
  };

  const handleCodeChange = text => {
    const digits = text.replace(/[^0-9]/g, '');
    setCode(digits);
  };

  const canLogin = phone.length > 4 && code.length > 0;

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>TASS</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.subtitle}>Вход</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Номер телефона</Text>
              <TextInput
                style={[styles.input, isPhoneFocused && styles.focusedInput]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={15}
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>СМС-код</Text>
              <View style={styles.codeField}>
                <TextInput
                  style={[styles.codeInput, isCodeFocused && styles.focusedInput]}
                  keyboardType="numeric"
                  placeholder="Введите код"
                  value={code}
                  onChangeText={handleCodeChange}
                  maxLength={6}
                  onFocus={() => setIsCodeFocused(true)}
                  onBlur={() => setIsCodeFocused(false)}
                />
                <TouchableOpacity
                  style={[styles.codeButtonInside, timer > 0 && styles.buttonDisabled]}
                  onPress={sendCode}
                  disabled={timer > 0}
                >
                  <Text style={[styles.codeButtonText, timer > 0 && styles.buttonDisabledText]}>
                    {timer > 0 ? `Через ${timer} сек` : 'Отправить код'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.loginButton,
                { width: width - 40 },
                canLogin ? styles.loginEnabled : styles.loginDisabled,
              ]}
              disabled={!canLogin}
              onPress={handleLogin}
            >
              <Text style={[styles.loginText, !canLogin && styles.buttonDisabledText]}>
                Войти
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#217B4B" />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    position: 'absolute',
    marginTop: 157,
    color: '#217B4B',
    fontSize: 60,
    fontWeight: 'bold',
    transform: [{ scaleY: 1.4 }],
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  subtitle: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  field: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    color: '#000',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E2E9',
    backgroundColor: '#EEEEF2',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    height: 48,
  },
  codeField: {
    position: 'relative',
    width: '100%',
  },
  codeInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E2E9',
    backgroundColor: '#EEEEF2',
    borderRadius: 5,
    padding: 10,
    paddingRight: 120,
    fontSize: 16,
    height: 48,
  },
  focusedInput: {
    borderColor: '#217B4B',
  },
  codeButtonInside: {
    position: 'absolute',
    right: 14,
    top: 10,
    bottom: 10,
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#217B4B',
    borderRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: '#E2E2E9',
  },
  buttonDisabledText: {
    color: '#000',
  },
  codeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButton: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 34 : 40,
  },
  loginEnabled: {
    backgroundColor: '#217B4B',
  },
  loginDisabled: {
    backgroundColor: '#E2E2E9',
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});