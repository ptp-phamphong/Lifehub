import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  initialMonth?: number;
  initialYear?: number;
  onMonthChanged: (month: number, year: number) => void;
}

export default function MonthPagination({ initialMonth, initialYear, onMonthChanged }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

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
    <View style={styles.container}>
      <TouchableOpacity onPress={goPrev} style={styles.btn}>
        <Text style={styles.btnText}>◀</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Tháng {month}/{year}</Text>
      <TouchableOpacity onPress={goNext} style={styles.btn}>
        <Text style={styles.btnText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0d6efd',
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#212529',
  },
});
