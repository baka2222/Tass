import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, Linking, StyleSheet } from "react-native";
import { Package, Phone } from 'lucide-react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderClientDetail({navigation, route}) {
    const order = route.params.order;
    
  const handleBack = () => {
    navigation.goBack();
  };


  function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  if (isToday) {
    return `Сегодня, ${time}`;
  } else if (isYesterday) {
    return `Вчера, ${time}`;
  } else if (date.getFullYear() === now.getFullYear()) {
    // Например: 14 мая, 14:23
    const months = [
      'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, ${time}`;
  } else {
    // Например: 14.05.2024, 14:23
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth()+1)
      .toString()
      .padStart(2, '0')}.${date.getFullYear()}, ${time}`;
  }
}

console.log("Order Details:", order);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Заказ</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Точка А</Text>
          <Text style={styles.infoBoxValue}>{order.delivery_address_a}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Точка Б</Text>
          <Text style={styles.infoBoxValue}>{order.delivery_address_b}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Комментарий</Text>
          <Text style={styles.infoBoxValue}>{order.comment || 'Не указан'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Время оформления заказа</Text>
          <View style={[styles.infoBoxValue, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
  <Text style={{ fontSize: 16 }}>{formatDate(order.created_at)}</Text>
  <Text style={{ fontWeight: "bold", fontSize: 16 }}>#{order.id}</Text>
</View>
        </View>
        {order.courier ? (<View style={styles.courierBox}>
          <Package style={styles.courierPhoto} />
          <View style={{ flex: 1 }}>
            <Text style={styles.courierName}>{order.courier.user}</Text>
            <Text style={styles.courierRole}>{'Ваш курьер'}</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.courier.phone_number}`)}>
            <Text style={{ fontSize: 20, color: "green" }}><Phone color={'#21A25D'}/></Text>
          </TouchableOpacity>
        </View>) : (
            <View style={styles.courierBox}>
            <Package style={styles.courierPhoto} />
          <View style={{ flex: 1 }}>
            <Text style={styles.courierName}>{'Не назначен'}</Text>
            <Text style={styles.courierRole}>{'Ваш курьер'}</Text>
          </View>
            <Text style={{ fontSize: 20, color: "green" }}><Phone color={'#21A25D'}/></Text>
            </View>
        )}

      </View>
      
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    infoBoxValue: {
    fontSize: 16,},
  container: {
    backgroundColor: "#fff",
    paddingHorizontal: 16
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#f3f3f6",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16
  },
  infoBox: {
    marginBottom: 12,
    width: "100%",
  },
  infoLabel: {
    fontSize: 12,
    color: "#999"
  },
  courierBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 16
  },
  courierPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  courierName: {
    fontSize: 16,
    fontWeight: "600"
  },
  courierRole: {
    fontSize: 12,
    color: "#888"
  },
  productCard: {
    backgroundColor: "#f3f3f6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  bannerBox: {
    marginBottom: 12
  },
  bannerImg: {
    width: "100%",
    height: 120,
    borderRadius: 12
  },
  bannerContent: {
    marginTop: 8
  },
  bannerName: {
    fontSize: 14,
    fontWeight: "600"
  },
  bannerDescription: {
    fontSize: 13,
    color: "#888"
  },
  bannerPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#091938"
  },
  productBox: {
    flexDirection: "row",
    backgroundColor: "#f3f3f6",
    borderRadius: 12,
    padding: 8,
    marginBottom: 12
  },
  productImg: {
    width: 90,
    height: 85,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginRight: 12
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between"
  },
  productName: {
    fontSize: 18,
    fontWeight: "600"
  },
  productMeta: {
    fontSize: 13,
    color: "#888",
    marginTop: 4
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    alignSelf: "flex-end"
  },
  repeatButton: {
    backgroundColor: "#21A25D",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 32
  },
  repeatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});
