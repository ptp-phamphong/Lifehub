import { StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Cài đặt</Text>
      <Text style={styles.placeholder}>Chỉnh sửa cấu hình hệ thống.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 16,
    color: '#6c757d',
  },
});
