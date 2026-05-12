import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';

export default function ReasonTypeScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>📋 Reason Type Settings</Text>
      <Text style={[styles.placeholder, { color: colors.textMuted }]}>Cài đặt loại chi tiêu sẽ ở đây</Text>
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
