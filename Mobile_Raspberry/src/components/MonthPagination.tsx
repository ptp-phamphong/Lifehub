import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';

interface Props {
  initialMonth?: number;
  initialYear?: number;
  onMonthChanged: (month: number, year: number) => void;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function MonthPagination({
  initialMonth,
  initialYear,
  onMonthChanged,
  compact = false,
  containerStyle,
}: Props) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const { colors } = useTheme();

  const goPrev = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
    onMonthChanged(m, y);
  };

  const goNext = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    onMonthChanged(m, y);
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact, containerStyle]}>
      <TouchableOpacity onPress={goPrev} style={[styles.btn, compact && styles.btnCompact, { backgroundColor: colors.primary }]}>
        <Text style={styles.btnText}>◀</Text>
      </TouchableOpacity>
      <Text style={[styles.label, { color: colors.text }]}>Tháng {month}/{year}</Text>
      <TouchableOpacity onPress={goNext} style={[styles.btn, compact && styles.btnCompact, { backgroundColor: colors.primary }]}>
        <Text style={styles.btnText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
  },
  containerCompact: {
    paddingVertical: 0,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0d6efd',
    borderRadius: 6,
  },
  btnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 12,
    color: '#212529',
  },
});
