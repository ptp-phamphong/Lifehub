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
import { toLunarDate, formatLunarDateVN } from '../utils/lunarCalendar';
import { useTheme } from '../ThemeContext';
import LoadingOverlay from './LoadingOverlay';

// ─── Types ────────────────────────────────────────────────
interface WeekDay {
  date: Date;
  label: string;   // "T2"..."CN"
  dateLabel: string; // "03/03"
  dow: number;      // 2‑8
}

interface CourseBlock {
  course: CourseSchedule;
  top: number;
  height: number;
  color: string;
  textColor: string;
  borderColor: string;
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

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 60;
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const TIME_GUTTER_WIDTH = 44;
const DAY_COL_WIDTH = (SCREEN_WIDTH - TIME_GUTTER_WIDTH) / 7;

// ─── Helpers ──────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateVN(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function parseTime(time?: string): number {
  if (!time) return 0;
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
}

function formatHour(h: number): string {
  return String(h).padStart(2, '0') + ':00';
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

// ─── Component ────────────────────────────────────────────
export default function CourseWeekCalendar() {
  const [mondayDate, setMondayDate] = useState(() => getMonday(new Date()));
  const [courses, setCourses] = useState<CourseSchedule[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseSchedule | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { colors, isDark } = useTheme();

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
        
        // Swipe right → previous week
        if (dx > minSwipeDistance) {
          prevWeek();
        }
        // Swipe left → next week
        else if (dx < -minSwipeDistance) {
          nextWeek();
        }
      },
    });
  }

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) arr.push(h);
    return arr;
  }, []);

  const gridHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT;

  // ── Build week days ─────────────────────────────────────
  const weekDays: WeekDay[] = useMemo(() => {
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate);
      date.setDate(date.getDate() + i);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      days.push({
        date,
        label: DAY_LABELS[i],
        dateLabel: `${dd}/${mm}`,
        dow: i === 6 ? 8 : i + 2,
      });
    }
    return days;
  }, [mondayDate]);

  // ── Load courses ────────────────────────────────────────
  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const month1 = mondayDate.getMonth() + 1;
      const year1 = mondayDate.getFullYear();
      const sunday = new Date(mondayDate);
      sunday.setDate(sunday.getDate() + 6);
      const month2 = sunday.getMonth() + 1;
      const year2 = sunday.getFullYear();

      const data1 = await getCourseScheduleByMonth(month1, year1);

      if (month1 !== month2 || year1 !== year2) {
        try {
          const data2 = await getCourseScheduleByMonth(month2, year2);
          const merged = [...data1];
          for (const c of data2) {
            if (!merged.find((m) => m.id === c.id)) merged.push(c);
          }
          setCourses(merged);
        } catch {
          setCourses(data1);
        }
      } else {
        setCourses(data1);
      }
    } catch (err) {
      console.error('Lỗi khi tải thời khóa biểu:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [mondayDate]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Auto-scroll to ~7 AM on mount
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: (7 - HOUR_START) * HOUR_HEIGHT, animated: false });
    }, 100);
  }, []);

  // ── Color map ───────────────────────────────────────────
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

  // ── Derive course blocks per day ─────────────────────────
  const getCoursesForDay = useCallback(
    (day: WeekDay): CourseBlock[] => {
      const dateNorm = new Date(day.date);
      dateNorm.setHours(0, 0, 0, 0);

      return courses
        .filter((c) => {
          if (!c.startDate || !c.endDate) return false;
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(c.endDate);
          end.setHours(0, 0, 0, 0);
          if (dateNorm < start || dateNorm > end) return false;
          if (c.dayOfWeek && c.dayOfWeek !== day.dow) return false;
          return true;
        })
        .map((c) => {
          const startMin = parseTime(c.startTime);
          const endMin = parseTime(c.endTime);
          const topMin = Math.max(startMin - HOUR_START * 60, 0);
          const bottomMin = Math.min(endMin - HOUR_START * 60, (HOUR_END - HOUR_START + 1) * 60);
          const heightMin = Math.max(bottomMin - topMin, 0);
          const top = (topMin / 60) * HOUR_HEIGHT;
          const height = Math.max((heightMin / 60) * HOUR_HEIGHT, 20);

          const key = c.courseCode || c.courseName || String(c.id);
          const colorIdx = colorMap.get(key) || 0;
          const palette = COURSE_COLORS[colorIdx];

          return {
            course: c,
            top,
            height,
            color: palette.bg,
            textColor: palette.text,
            borderColor: palette.border,
          };
        })
        .sort((a, b) => a.top - b.top);
    },
    [courses, colorMap],
  );

  // ── Navigation ──────────────────────────────────────────
  const prevWeek = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() - 7);
    setMondayDate(d);
    setSelectedCourse(null);
    setSelectedDay(null);
  };
  const nextWeek = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + 7);
    setMondayDate(d);
    setSelectedCourse(null);
    setSelectedDay(null);
  };
  const goToCurrentWeek = () => {
    setMondayDate(getMonday(new Date()));
    setSelectedCourse(null);
    setSelectedDay(null);
  };

  // ── Current time line ───────────────────────────────────
  const now = new Date();
  const isCurrentWeek = isSameDay(getMonday(now), mondayDate);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showTimeLine =
    isCurrentWeek && nowMinutes >= HOUR_START * 60 && nowMinutes <= (HOUR_END + 1) * 60;
  const currentTimeTop = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;

  // ── Week range label ────────────────────────────────────
  const weekRangeLabel = weekDays.length
    ? `${formatDateVN(weekDays[0].date)} – ${formatDateVN(weekDays[6].date)}`
    : '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...swipeRef.current?.panHandlers}>
      <LoadingOverlay visible={loading} />
      {/* Header Navigation */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={prevWeek} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.primary }]}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToCurrentWeek} style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{weekRangeLabel}</Text>
          <Text style={[styles.swipeHint, { color: colors.textMuted }]}>👆 Vuốt để chuyển tuần</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextWeek} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Day column headers */}
      <View style={[styles.dayHeaders, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.gutterHeader} />
        {weekDays.map((day) => {
          const isT = isSameDay(day.date, today);
          const lunarDate = toLunarDate(day.date);
          const isSelected = selectedDay && isSameDay(selectedDay.date, day.date);
          return (
            <TouchableOpacity
              key={day.label}
              onPress={() => setSelectedDay(isSelected ? null : day)}
              style={[styles.dayColHeader, isT && styles.todayHeader, isSelected && styles.selectedDayHeader]}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, { color: colors.textSecondary }, isT && styles.todayText, isSelected && styles.selectedDayText]}>
                {day.label}
              </Text>
              <Text style={[styles.dayDate, { color: colors.textMuted }, isT && styles.todayText, isSelected && styles.selectedDayText]}>
                {day.dateLabel}
              </Text>
              <Text style={[styles.dayLunarDate, isT && styles.todayText, isSelected && styles.selectedDayText]}>
                {formatLunarDateVN(lunarDate)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Timetable body */}
      <ScrollView ref={scrollRef} style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={[styles.gridBody, { height: gridHeight }]}>
          {/* Time gutter */}
          <View style={styles.timeGutter}>
            {hours.map((h) => (
              <View key={h} style={[styles.timeSlot, { height: HOUR_HEIGHT }]}>
                <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{formatHour(h)}</Text>
              </View>
            ))}
          </View>

          {/* Day columns */}
          {weekDays.map((day) => {
            const isT = isSameDay(day.date, today);
            const blocks = getCoursesForDay(day);
            return (
              <View
                key={day.label}
                style={[styles.dayColumn, isT && styles.todayColumn]}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <View key={h} style={[styles.hourLine, { height: HOUR_HEIGHT }]} />
                ))}

                {/* Course blocks */}
                {blocks.map((block, idx) => (
                  <TouchableOpacity
                    key={`${block.course.id}-${idx}`}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCourse(block.course)}
                    style={[
                      styles.courseBlock,
                      {
                        top: block.top,
                        height: block.height,
                        backgroundColor: block.color,
                        borderLeftColor: block.borderColor,
                      },
                    ]}
                  >
                    <Text style={[styles.blockTime, { color: block.borderColor }]} numberOfLines={1}>
                      {block.course.startTime}-{block.course.endTime}
                    </Text>
                    <Text style={[styles.blockName, { color: block.textColor }]} numberOfLines={2}>
                      {block.course.courseName}
                    </Text>
                    {block.height > 45 && (
                      <Text style={styles.blockRoom} numberOfLines={1}>
                        {block.course.room}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}

                {/* Current time indicator */}
                {isT && showTimeLine && (
                  <View style={[styles.currentTimeLine, { top: currentTimeTop }]}>
                    <View style={styles.timeDot} />
                    <View style={styles.timeLineBar} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Day Schedule Modal */}
      {selectedDay && (
        <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedDay(null)}
          >
            <View style={[styles.detailCard, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDay(null)}>
                <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {DAY_LABELS[weekDays.findIndex((d) => isSameDay(d.date, selectedDay.date))]} - {selectedDay.dateLabel}
              </Text>
              <Text style={styles.dayScheduleLabel}>Thời khóa biểu</Text>
              <View style={styles.dayScheduleList}>
                {getCoursesForDay(selectedDay).length > 0 ? (
                  getCoursesForDay(selectedDay).map((block, idx) => (
                    <TouchableOpacity
                      key={`${block.course.id}-${idx}`}
                      onPress={() => {
                        setSelectedDay(null);
                        setSelectedCourse(block.course);
                      }}
                      style={[styles.dayScheduleItem, { borderLeftColor: block.borderColor }]}
                    >
                      <Text style={[styles.scheduleTime, { color: block.borderColor }]}>
                        {block.course.startTime} - {block.course.endTime}
                      </Text>
                      <Text style={[styles.scheduleName, { color: block.textColor }]}>
                        {block.course.courseName}
                      </Text>
                      <Text style={styles.scheduleRoom}>{block.course.room}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noCourseText}>Không có lớp học hôm nay</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Course Detail Modal */}
      <Modal visible={!!selectedCourse} transparent animationType="fade" onRequestClose={() => setSelectedCourse(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCourse(null)}
        >
          <View style={[styles.detailCard, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedCourse(null)}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedCourse?.courseName}</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mã môn:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCourse?.courseCode}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Thứ:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{dayOfWeekLabel(selectedCourse?.dayOfWeek)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Giờ học:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedCourse?.startTime} - {selectedCourse?.endTime}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ngày bắt đầu:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedCourse?.startDate ? formatDateVN(new Date(selectedCourse.startDate)) : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ngày kết thúc:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {selectedCourse?.endDate ? formatDateVN(new Date(selectedCourse.endDate)) : ''}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phòng:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCourse?.room}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Học kỳ:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{semesterLabel(selectedCourse)}</Text>
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
  headerTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  swipeHint: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  // Day column headers
  dayHeaders: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  gutterHeader: { width: TIME_GUTTER_WIDTH },
  dayColHeader: {
    width: DAY_COL_WIDTH,
    alignItems: 'center',
    paddingVertical: 6,
  },
  todayHeader: { backgroundColor: '#eff6ff' },
  selectedDayHeader: { backgroundColor: '#dbeafe', borderRadius: 6 },
  dayName: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  dayDate: { fontSize: 10, color: '#94a3b8' },
  dayLunarDate: { fontSize: 8, color: '#cbd5e1', marginTop: 1 },
  todayText: { color: '#2563eb' },
  selectedDayText: { color: '#2563eb', fontWeight: '700' },

  // Scroll body
  scrollBody: { flex: 1 },
  gridBody: { flexDirection: 'row' },

  // Time gutter
  timeGutter: { width: TIME_GUTTER_WIDTH },
  timeSlot: { justifyContent: 'flex-start', paddingTop: 0 },
  timeLabel: { fontSize: 9, color: '#94a3b8', textAlign: 'right', paddingRight: 4, marginTop: -6 },

  // Day columns
  dayColumn: {
    width: DAY_COL_WIDTH,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#f1f5f9',
  },
  todayColumn: { backgroundColor: '#f0f7ff' },
  hourLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },

  // Course blocks
  courseBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  blockTime: { fontSize: 8, fontWeight: '600' },
  blockName: { fontSize: 9, fontWeight: '500' },
  blockRoom: { fontSize: 8, color: '#64748b', marginTop: 1 },

  // Current time line
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: -4,
  },
  timeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#ef4444',
  },

  // Modal
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

  // Day schedule modal
  dayScheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 10,
    marginBottom: 8,
  },
  dayScheduleList: {
    maxHeight: 300,
  },
  dayScheduleItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  scheduleRoom: {
    fontSize: 11,
    color: '#64748b',
  },
  noCourseText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
