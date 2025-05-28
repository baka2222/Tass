import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import SearchIcon from '../assets/search-refraction.svg';
import { API_BASE_URL } from '../apiConfig';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

export function SearchScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef(null);
  

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    }, [isFocused]);

  useEffect(() => {
    const fetchData = async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert('Ошибка', 'Нет интернет-соединения');
        setLoading(false);
        return;
      }

      try {
        // const token = await AsyncStorage.getItem('accessToken');
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoyNjExMTY3MDA2LCJpYXQiOjE3NDcyNTM0MDYsImp0aSI6IjcwNjFhMjgyNGMxZDQ2M2NiNzlhMjMyYTExZjZhZTI4IiwidXNlcl9pZCI6MX0.GtWMQWzkGx4BAxHHS3Flv1TlPHYsgmCVAOLLxagX9f8';

        const res = await fetch(`${API_BASE_URL}/stores/`,
            { headers: { Authorization: `Bearer ${token}` }}
        );
        const data = await res.json();
        setCategories([...data]);
      } catch {
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchChange = (text) => {
    setSearchValue(text);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    const lower = text.toLowerCase();
    const matches = [];

    categories.forEach(category => {
      if (category.name.toLowerCase().includes(lower)) {
        matches.push(category.name);
      }

      category.stores?.forEach(store => {
        if (
          store.name.toLowerCase().includes(lower) ||
          store.description?.toLowerCase().includes(lower)
        ) {
          matches.push(store.name);
        }
      });
    });

    const uniqueSuggestions = [...new Set(matches)].slice(0, 5);
    setSuggestions(uniqueSuggestions);
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchValue(suggestion);
    setSuggestions([]);
  };

  const filteredCategories = categories.filter(category => {
    const lower = searchValue.toLowerCase();

    const hasMatchingStores = category.stores?.some(store =>
      store.name.toLowerCase().includes(lower) ||
      store.description?.toLowerCase().includes(lower)
    );

    return hasMatchingStores || category.name.toLowerCase().includes(lower);
  });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <SearchIcon width={24} height={24} style={styles.searchIcon} />
          <TextInput
          ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Что желаете?"
            value={searchValue}
            onChangeText={handleSearchChange}
          />
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item, index) => (
              <TouchableOpacity key={index} onPress={() => handleSuggestionPress(item)}>
                <Text style={styles.suggestionItem}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredCategories.length === 0 ? (
          <Text style={styles.emptyText}>Ничего не найдено</Text>
        ) : (
          filteredCategories.map(category => (
            <View key={category.id} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <FlatList
                data={category.stores}
                keyExtractor={item => item.id.toString()}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
                columnWrapperStyle={styles.columnWrapper}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.storeCard}
                    onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })}
                  >
                    <View>
                      <Image
                        source={{ uri: item.banner }}
                        style={styles.storeImage}
                      />
                      {index === 0 && (
                        <View style={styles.labelTop}>
                          <Text style={styles.labelText}>Топ ⚡</Text>
                        </View>
                      )}
                      {index === 1 && (
                        <View style={styles.labelPick}>
                          <Text style={styles.labelText}>Юзеры выбирают ⚡</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName}>{item.name}</Text>
                      <Text style={styles.storeDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  labelTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EC3476',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    zIndex: 2,
  },
  labelPick: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EC3476',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    zIndex: 2,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#091938',
  },
  gridContainer: {
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storeCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  storeImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  storeInfo: {
    padding: 6,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#091938',
  },
  storeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 12,
    borderRadius: 24,
    height: 48,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#091938',
  },
  suggestions: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  suggestionItem: {
    fontSize: 14,
    paddingVertical: 6,
    color: '#091938',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
});
