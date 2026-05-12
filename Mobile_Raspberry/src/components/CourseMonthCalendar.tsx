import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Modal,
  PanResponder,
  PanResponderInstance,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CourseSchedule } from '../models/courseSchedule.model';
import { getCourseScheduleByMonth } from '../services/courseScheduleService';
import { getExpensesByMonth } from '../services/expenseService';
import { toLunarDate, formatLunarDateShort } from '../utils/lunarCalendar';
import { ExpenseRecord } from '../models/expense.model';

// ─── Types ────────────────────────────────────────────────
interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  courses: CourseSchedule[];
}

// ─── Constants ────────────────────────────────────────────
const COURSE_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  { bg: '#ccfbf1', border: '#14b8a6', text: '#115e59' },
  { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  { bg: '#e2e8f0', border: '#64748b', text: '#334155' },
];

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 16) / 7);
const MAX_VISIBLE_COURSES = 2;

// ─── Helpers ──────────────────────────────────────────────
function formatDateVN(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function dayOfWeekLabel(dow?: number): string {
  const labels: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5',
    6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật',
  };
  return dow ? labels[dow] || '' : '';
}

function semesterLabel(course?: CourseSchedule | null): string {
  if (!course) return '';
  if (course.semesterName && course.semesterYear) return `${course.semesterName} (${course.semesterYear})`;
  if (course.semesterName) return course.semesterName;
  return 'Chưa gán học kỳ';
}

function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
}

function formatDayOfWeekVN(d: Date): string {
  const jsDow = d.getDay();
  const labels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return labels[jsDow];
}

// ─── Component ────────────────────────────────────────────
export default function CourseMonthCalendar({ showExpense = false }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [courses, setCourses] = useState<CourseSchedule[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseSchedule | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<{ date: Date; items: ExpenseRecord[] } | null>(null);

  // ── Swipe gesture handler ──────────────────────────────
  const swipeRef = useRef<PanResponderInstance | null>(null);
  const gestureRef = useRef({ x0: 0, y0: 0 });

  if (!swipeRef.current) {
    swipeRef.current = PanResponder.create({
      // Don't claim on tap start — let children (TouchableOpacity) handle taps
      onStartShouldSetPanResponder: () => false,
      // Only claim gesture when there is a clear horizontal swipe
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: (e: GestureResponderEvent) => {
        gestureRef.current = { x0: e.nativeEvent.pageX, y0: e.nativeEvent.pageY };
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        const dx = e.nativeEvent.pageX - gestureRef.current.x0;
        const minSwipeDistance = 50;

        // Swipe right → previous month
        if (dx > minSwipeDistance) {
          prevMonth();
        }
        // Swipe left → next month
        else if (dx < -minSwipeDistance) {
          nextMonth();
        }
      },
    });
  }

  // ── Load data ──────────────────────────────────────────
  const loadMonth = useCallback(async () => {
    try {
      const data = await getCourseScheduleByMonth(currentMonth, currentYear);
      setCourses(data);
    } catch (err) {
      console.error('Lỗi khi tải thời khóa biểu:', err);
      setCourses([]);
    }
  }, [currentMonth, currentYear]);

  const loadExpenses = useCallback(async () => {
    if (!showExpense) return;
    try {
      const data = await getExpensesByMonth(currentMonth, currentYear);
      setExpenses(data);
    } catch (err) {
      console.error('Lỗi khi tải chi tiêu:', err);
      setExpenses([]);
    }
  }, [currentMonth, currentYear, showExpense]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // ── Color map ─────────────────────────────────────────
  const colorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const c of courses) {
      const key = c.courseCode || c.courseName || String(c.id);
      if (!map.has(key)) {
        map.set(key, idx % COURSE_COLORS.length);
        idx++;
      }
    }
    return map;
  }, [courses]);

  const getChipColor = useCallback(
    (course: CourseSchedule) => {
      const key = course.courseCode || course.courseName || String(course.id);
      const idx = colorMap.get(key) || 0;
      return COURSE_COLORS[idx];
    },
    [colorMap],
  );

  // ── Get courses for a specific date ───────────────────
  const getCoursesForDate = useCallback(
    (date: Date): CourseSchedule[] => {
      const jsDow = date.getDay();
      const dow = jsDow === 0 ? 8 : jsDow + 1;

      return courses
        .filter((c) => {
          if (!c.startDate || !c.endDate) return false;
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(c.endDate);
          end.setHours(0, 0, 0, 0);
          if (date < start || date > end) return false;
          if (c.dayOfWeek && c.dayOfWeek !== dow) return false;
          return true;
        })
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    },
    [courses],
  );

  // ── Expense helpers ───────────────────────────────────
  const expensesByDay = useMemo(() => {
    const map = new Map<string, ExpenseRecord[]>();
    for (const e of expenses) {
      if (!e.createdDate) continue;
      const d = new Date(e.createdDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [expenses]);

  const getDailyExpenses = useCallback(
    (date: Date): ExpenseRecord[] => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return expensesByDay.get(key) || [];
    },
    [expensesByDay],
  );

  const getDailyTotal = useCallback(
    (date: Date): number => getDailyExpenses(date).reduce((sum, e) => sum + (e.amount || 0), 0),
    [getDailyExpenses],
  );

  // ── Build calendar grid ───────────────────────────────
  const weeks: CalendarDay[][] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);

    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: CalendarDay[] = [];

    // Previous month padding
    const prevMonthLast = new Date(currentYear, currentMonth - 1, 0);
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(prevMonthLast);
      d.setDate(prevMonthLast.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, courses: [] });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth - 1, d);
      date.setHours(0, 0, 0, 0);
      const coursesForDay = getCoursesForDate(date);
      days.push({
        date,
        day: d,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        courses: coursesForDay,
      });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth, i);
        d.setHours(0, 0, 0, 0);
        days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, courses: [] });
      }
    }

    // Split into weeks
    const result: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [currentMonth, currentYear, getCoursesForDate]);

  // ── Navigation ────────────────────────────────────────
  const prevMonth = () => {
    setSelectedCourse(null);
    setSelectedDay(null);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    setSelectedCourse(null);
    setSelectedDay(null);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
    setSelectedCourse(null);
    setSelectedDay(null);
  };

  const monthYearLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

  return (
    <View style={styles.container} {...swipeRef.current?.panHandlers}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{monthYearLabel}</Text>
          <Text style={styles.swipeHint}>👆 Vuốt để chuyển tháng</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{wd}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => (
              <TouchableOpacity
                key={di}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.otherMonth,
                  day.isToday && styles.todayCell,
                ]}
                activeOpacity={0.6}
                onPress={() => {
                  if (showExpense && day.isCurrentMonth) {
                    const dayExpenses = getDailyExpenses(day.date);
                    if (dayExpenses.length > 0) {
                      setSelectedDayExpenses({ date: day.date, items: dayExpenses });
                    }
                  } else {
                    setSelectedDay(day);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.otherMonthText,
                    day.isToday && styles.todayNumber,
                  ]}
                >
                  {day.day}
                </Text>
                {/* Lunar date display */}
                {day.isCurrentMonth && (
                  <Text style={styles.lunarDate}>
                    {formatLunarDateShort(toLunarDate(day.date))}
                  </Text>
                )}
                {/* Expense mode: show daily total chip */}
                {showExpense && day.isCurrentMonth && getDailyTotal(day.date) > 0 && (
                  <View style={styles.expenseTotalChip}>
                    <Text style={styles.expenseTotalChipText} numberOfLines={1}>
                      {getDailyTotal(day.date).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                )}
                {/* Schedule mode: show course chips */}
                {!showExpense && day.courses.slice(0, MAX_VISIBLE_COURSES).map((course, ci) => {
                  const colors = getChipColor(course);
                  return (
                    <TouchableOpacity
                      key={ci}
                      style={[
                        styles.courseChip,
                        { backgroundColor: colors.bg, borderLeftColor: colors.border },
                      ]}
                      onPress={() => setSelectedCourse(course)}
                    >
                      <Text style={[styles.chipTime, { color: colors.border }]} numberOfLines={1}>
                        {course.startTime}
                      </Text>
                      <Text style={[styles.chipTime, { color: colors.border }]} numberOfLines={1}>
                        {course.room}
                      </Text>
                      <Text style={[styles.chipName, { color: colors.text }]} numberOfLines={1}>
                        {truncate(course.courseName, 8)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {!showExpense && day.courses.length > MAX_VISIBLE_COURSES && (
                  <TouchableOpacity
                    style={styles.moreChip}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={styles.moreText}>
                      +{day.courses.length - MAX_VISIBLE_COURSES}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDay(null)}
        >
          <View style={styles.detailCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDay(null)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            {selectedDay && (
              <>
                <Text style={styles.detailTitle}>
                  {formatDayOfWeekVN(selectedDay.date)}, {formatDateVN(selectedDay.date)}
                </Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {selectedDay.courses.map((course, ci) => {
                    const colors = getChipColor(course);
                    return (
                      <TouchableOpacity
                        key={ci}
                        style={[
                          styles.dayDetailItem,
                          { backgroundColor: colors.bg, borderLeftColor: colors.border },
                        ]}
                        onPress={() => {
                          setSelectedDay(null);
                          setSelectedCourse(course);
                        }}
                      >
                        <Text style={[styles.dayDetailTime, { color: colors.border }]}>
                          {course.startTime} - {course.endTime}
                        </Text>
                        <Text style={[styles.dayDetailName, { color: colors.text }]}>
                          {course.courseName}
                        </Text>
                        <Text style={styles.dayDetailRoom}>{course.room}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Expense Detail Modal */}
      <Modal visible={!!selectedDayExpenses} transparent animationType="fade" onRequestClose={() => setSelectedDayExpenses(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDayExpenses(null)}
        >
          <View style={styles.detailCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDayExpenses(null)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>
              Chi tiêu ngày {selectedDayExpenses ? formatDateVN(selectedDayExpenses.date) : ''}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {selectedDayExpenses?.items.map((e, i) => (
                <View key={i} style={styles.expenseItem}>
                  <Text style={styles.expenseReason} numberOfLines={2}>{e.reason}</Text>
                  <Text style={styles.expenseAmount}>
                    {(e.amount || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.expenseTotalRow}>
              <Text style={styles.expenseTotalLabel}>Tổng:</Text>
              <Text style={styles.expenseTotalValue}>
                {selectedDayExpenses?.items.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Course Detail Modal (kept separate, no label change) */}
      <Modal visible={!!selectedCourse} transparent animationType="fade" onRequestClose={() => setSelectedCourse(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCourse(null)}
        >
          <View style={styles.detailCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedCourse(null)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{selectedCourse?.courseName}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã môn:</Text>
              <Text style={styles.detailValue}>{selectedCourse?.courseCode}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Thứ:</Text>
              <Text style={styles.detailValue}>{dayOfWeekLabel(selectedCourse?.dayOfWeek)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Giờ học:</Text>
              <Text style={styles.detailValue}>
                {selectedCourse?.startTime} - {selectedCourse?.endTime}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
              <Text style={styles.detailValue}>
                {selectedCourse?.startDate ? formatDateVN(new Date(selectedCourse.startDate)) : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày kết thúc:</Text>
              <Text style={styles.detailValue}>
                {selectedCourse?.endDate ? formatDateVN(new Date(selectedCourse.endDate)) : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phòng:</Text>
              <Text style={styles.detailValue}>{selectedCourse?.room}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Học kỳ:</Text>
              <Text style={styles.detailValue}>{semesterLabel(selectedCourse)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 18, color: '#0d6efd' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  swipeHint: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  // Weekday row
  weekdayRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  weekdayCell: { width: CELL_SIZE, alignItems: 'center', paddingVertical: 6 },
  weekdayText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  // Calendar
  calendarScroll: { flex: 1, paddingHorizontal: 8 },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    width: CELL_SIZE,
    minHeight: CELL_SIZE + 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    padding: 2,
  },
  otherMonth: { backgroundColor: '#f8fafc' },
  todayCell: { backgroundColor: '#eff6ff' },
  dayNumber: { fontSize: 12, fontWeight: '500', color: '#334155', textAlign: 'center', marginBottom: 2 },
  otherMonthText: { color: '#cbd5e1' },
  todayNumber: { color: '#2563eb', fontWeight: '700' },
  lunarDate: { fontSize: 8, color: '#94a3b8', textAlign: 'center', marginBottom: 1 },

  // Course chips
  courseChip: {
    borderLeftWidth: 2,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginBottom: 1,
  },
  chipTime: { fontSize: 7, fontWeight: '600' },
  chipName: { fontSize: 7 },
  moreChip: { alignItems: 'center', paddingVertical: 1 },
  moreText: { fontSize: 8, color: '#0d6efd', fontWeight: '600' },

  // Day detail items
  dayDetailItem: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  dayDetailTime: { fontSize: 12, fontWeight: '600' },
  dayDetailName: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  dayDetailRoom: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  closeBtn: { position: 'absolute', top: 10, right: 14, zIndex: 1 },
  closeBtnText: { fontSize: 20, color: '#94a3b8' },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
    paddingRight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: { width: 100, fontSize: 13, color: '#64748b', fontWeight: '500' },
  detailValue: { flex: 1, fontSize: 13, color: '#1e293b' },

  // Expense overlay
  expenseTotalChip: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  expenseTotalChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#166534',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    marginBottom: 6,
  },
  expenseReason: { flex: 1, fontSize: 13, color: '#1e293b' },
  expenseAmount: { fontSize: 13, fontWeight: '700', color: '#dc2626', flexShrink: 0 },
  expenseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  expenseTotalLabel: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  expenseTotalValue: { fontSize: 14, fontWeight: '700', color: '#92400e' },
});
