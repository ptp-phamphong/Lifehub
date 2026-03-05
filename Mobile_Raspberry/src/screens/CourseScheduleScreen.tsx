import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import CourseMonthCalendar from '../components/CourseMonthCalendar';
import CourseWeekCalendar from '../components/CourseWeekCalendar';

export default function CourseScheduleScreen() {
  const [showMonth, setShowMonth] = useState(true);

  return (
    <View style={styles.container}>
      {/* Toggle bar */}
      <View style={styles.toggleBar}>
        <Text style={[styles.toggleLabel, !showMonth && styles.activeLabel]}>Tuần</Text>
        <Switch
          value={showMonth}
          onValueChange={setShowMonth}
          trackColor={{ false: '#94a3b8', true: '#0d6efd' }}
          thumbColor="#fff"
          style={styles.switch}
        />
        <Text style={[styles.toggleLabel, showMonth && styles.activeLabel]}>Tháng</Text>
      </View>

      {/* Calendar view */}
      {showMonth ? <CourseMonthCalendar /> : <CourseWeekCalendar />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  toggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  toggleLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  activeLabel: { color: '#0d6efd', fontWeight: '700' },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
});
