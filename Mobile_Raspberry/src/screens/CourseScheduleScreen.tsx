import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CourseMonthCalendar from '../components/CourseMonthCalendar';
import CourseWeekCalendar from '../components/CourseWeekCalendar';
import { useTheme } from '../ThemeContext';

export default function CourseScheduleScreen() {
  const [showMonth, setShowMonth] = useState(true);
  const [showExpense, setShowExpense] = useState(false);
  const { colors } = useTheme();

  const handleShowMonthChange = (val: boolean) => {
    setShowMonth(val);
    if (!val) setShowExpense(false); // reset when switching to week view
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toggle bar: Tuần / Tháng */}
      <View style={[styles.toggleBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.toggleLabel, { color: colors.textMuted }, !showMonth && { color: colors.primary, fontWeight: '700' }]}>Tuần</Text>
        <Switch
          value={showMonth}
          onValueChange={handleShowMonthChange}
          trackColor={{ false: '#94a3b8', true: '#0d6efd' }}
          thumbColor="#fff"
          style={styles.switch}
        />
        <Text style={[styles.toggleLabel, { color: colors.textMuted }, showMonth && { color: colors.primary, fontWeight: '700' }]}>Tháng</Text>
      </View>

      {/* Second toggle: Thời khóa biểu / Chi tiêu — only in month view */}
      {showMonth && (
        <View style={[styles.toggleBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.toggleLabel, { color: colors.textMuted }, !showExpense && { color: colors.primary, fontWeight: '700' }]}>Thời khóa biểu</Text>
          <Switch
            value={showExpense}
            onValueChange={setShowExpense}
            trackColor={{ false: '#94a3b8', true: '#22c55e' }}
            thumbColor="#fff"
            style={styles.switch}
          />
          <Text style={[styles.toggleLabel, { color: colors.textMuted }, showExpense && styles.activeExpenseLabel]}>Chi tiêu</Text>
        </View>
      )}

      {/* Calendar view */}
      {showMonth ? <CourseMonthCalendar showExpense={showExpense} /> : <CourseWeekCalendar />}
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
  activeExpenseLabel: { color: '#16a34a', fontWeight: '700' },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
});
