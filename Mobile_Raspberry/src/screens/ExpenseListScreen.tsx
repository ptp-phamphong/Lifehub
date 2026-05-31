import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  SectionList,
  Alert,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ExpenseRecord } from '../models/expense.model';
import { ReasonType } from '../models/reasonType.model';
import { ParamFilter } from '../models/paramFilter.model';
import {
  getAllExpenseNotes,
  sumByCurrentMonth,
  sumByCurrentWeek,
  sumAll as fetchSumAll,
  sumAllWithFilter,
  deleteExpenseById,
} from '../services/expenseService';
import { getAllReasonTypes } from '../services/reasonTypeService';
import MonthPagination from '../components/MonthPagination';
import FilterReasonType from '../components/FilterReasonType';
import ExpenseFormModal from '../components/ExpenseFormModal';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../ThemeContext';

export default function ExpenseListScreen() {
  const now = new Date();
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Summaries
  const [monthSum, setMonthSum] = useState(0);
  const [weekSum, setWeekSum] = useState(0);
  const [allSum, setAllSum] = useState(0);
  const [allFilteredSum, setAllFilteredSum] = useState(0);

  // Month pagination
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [reasonTypes, setReasonTypes] = useState<ReasonType[]>([]);
  const [filterIn, setFilterIn] = useState<number[]>([]);
  const [filterOut, setFilterOut] = useState<number[]>([]);

  // Sort
  const [sortColumn, setSortColumn] = useState<string>('createdDate');
  const [sortDirection, setSortDirection] = useState<string>('desc');
  const { colors, isDark } = useTheme();
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Group by day
  const [groupByDay, setGroupByDay] = useState(false);

  // Form modal
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(0);

  // ── Helpers ───────────────────────────────────────────
  const buildFilter = useCallback(
    (month?: number, year?: number): ParamFilter => ({
      month,
      year,
      reasonTypeIdsFilterIn: filterIn.length > 0 ? filterIn : undefined,
      reasonTypeIdsFilterOut: filterOut.length > 0 ? filterOut : undefined,
      sortColumn,
      sortDirection,
    }),
    [filterIn, filterOut, sortColumn, sortDirection],
  );

  const formatCurrency = (amount?: number): string => {
    if (!amount) return '0 VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  };

  const getReasonTypeLabel = (reasonType?: ReasonType): string => {
    if (!reasonType?.reasonName) {
      return '—';
    }

    return reasonType.active === false
      ? `${reasonType.reasonName} (inactive)`
      : reasonType.reasonName;
  };

  // ── Data Loading ──────────────────────────────────────
  const loadByMonth = useCallback(
    async (month: number, year: number) => {
      setLoading(true);
      const filter = buildFilter(month, year);
      try {
        const [data, mSum, wSum] = await Promise.all([
          getAllExpenseNotes(filter),
          sumByCurrentMonth(filter),
          sumByCurrentWeek(filter),
        ]);
        setRecords(data);
        setMonthSum(mSum);
        setWeekSum(wSum);
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    },
    [buildFilter],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const filter = buildFilter();
    try {
      const [data, total, totalFiltered] = await Promise.all([
        getAllExpenseNotes(filter),
        fetchSumAll(),
        sumAllWithFilter(filter),
      ]);
      setRecords(data);
      setAllSum(total);
      setAllFilteredSum(totalFiltered);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  }, [buildFilter]);

  const reload = useCallback(() => {
    if (showAll) {
      loadAll();
    } else {
      loadByMonth(selectedMonth, selectedYear);
    }
  }, [showAll, loadAll, loadByMonth, selectedMonth, selectedYear]);

  // ── Initial load ──────────────────────────────────────
  useEffect(() => {
    getAllReasonTypes()
      .then(data => {
        setReasonTypes(data);
        // Apply default filters from ReasonType settings
        const defaultIn = data.filter(r => r.defaultFilterType === 2).map(r => r.id!);
        const defaultOut = data.filter(r => r.defaultFilterType === 3).map(r => r.id!);
        if (defaultIn.length > 0) setFilterIn(defaultIn);
        if (defaultOut.length > 0) setFilterOut(defaultOut);
      })
      .catch(err => console.error('Lỗi tải reason types:', err));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Event Handlers ────────────────────────────────────
  const onMonthChanged = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const toggleShowAll = () => setShowAll(prev => !prev);
  const toggleGroupByDay = () => setGroupByDay(prev => !prev);
  const toggleControlsExpanded = () => setControlsExpanded(prev => !prev);
  const toggleSummaryExpanded = () => setSummaryExpanded(prev => !prev);

  const groupedSections = (): { title: string; data: ExpenseRecord[] }[] => {
    if (!groupByDay) return [];
    const groups: { [key: string]: ExpenseRecord[] } = {};
    for (const record of records) {
      const dateKey = record.createdDate
        ? new Date(record.createdDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Không rõ ngày';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    }
    return Object.keys(groups).map(date => ({ title: date, data: groups[date] }));
  };

  const onFilterInChange = (ids: number[]) => {
    setFilterIn(ids);
    setFilterOut(prev => prev.filter(id => !ids.includes(id)));
  };

  const onFilterOutChange = (ids: number[]) => {
    setFilterOut(ids);
    setFilterIn(prev => prev.filter(id => !ids.includes(id)));
  };

  const onSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string): string => {
    if (sortColumn !== column) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const getSortLabel = (column: string): string => {
    if (column === 'createdDate') return 'Ngày';
    if (column === 'amount') return 'Số tiền';
    if (column === 'reason') return 'Lý do';
    if (column === 'reasonType') return 'Loại';
    return column;
  };

  const setSortDirectionValue = (direction: string) => {
    setSortDirection(direction);
  };

  const openAdd = () => {
    setEditingId(0);
    setFormVisible(true);
  };

  const openEdit = (id: number) => {
    setEditingId(id);
    setFormVisible(true);
  };

  const handleDelete = (record: ExpenseRecord) => {
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn xóa "${record.reason}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpenseById(record.id!);
              reload();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa.');
            }
          },
        },
      ],
    );
  };

  const onFormClose = (saved: boolean) => {
    setFormVisible(false);
    if (saved) reload();
  };

  // ── Render row ────────────────────────────────────────
  const renderItem = ({ item }: { item: ExpenseRecord }) => (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowReason, { color: colors.text }]} numberOfLines={1}>{item.reason}</Text>
        <Text style={[styles.rowType, { color: colors.textSecondary }]}>{getReasonTypeLabel(item.reasonType)}</Text>
        <Text style={[styles.rowDate, { color: colors.textMuted }]}>{formatDate(item.createdDate)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: colors.primary }]}>{formatCurrency(item.amount)}</Text>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => openEdit(item.id!)} style={[styles.editBtn, { backgroundColor: isDark ? '#1e3a5f' : '#e7f1ff' }]}>
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.deleteBtn, { backgroundColor: isDark ? '#450a0a' : '#fff0f0' }]}>
            <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ── Main Render ───────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary */}
      <View style={[styles.summaryBox, { backgroundColor: colors.surface }]}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryHeaderTitle, { color: colors.text }]}>Tổng quan</Text>
          <TouchableOpacity onPress={toggleSummaryExpanded} style={[styles.summaryCollapseBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.summaryCollapseBtnText, { color: colors.textSecondary }]}>{summaryExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>
        {summaryExpanded && (
          <>
            {!showAll && monthSum > 0 && (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Tổng tháng {selectedMonth}/{selectedYear}: <Text style={[styles.bold, { color: colors.text }]}>{formatCurrency(monthSum)}</Text>
              </Text>
            )}
            {showAll && allSum > 0 && (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Tổng toàn bộ: <Text style={[styles.bold, { color: colors.text }]}>{formatCurrency(allSum)}</Text>
              </Text>
            )}
            {showAll && allFilteredSum > 0 && (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Lịch sử theo filter: <Text style={[styles.bold, { color: colors.text }]}>{formatCurrency(allFilteredSum)}</Text>
              </Text>
            )}
            {weekSum > 0 && (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Tổng tuần hiện tại: <Text style={[styles.bold, { color: colors.text }]}>{formatCurrency(weekSum)}</Text>
              </Text>
            )}
          </>
        )}
      </View>

      {/* One-line controls: show-all + group-by-day */}
      <View style={styles.topToggleRow}>
        <View style={styles.toggleRow}>
          <Switch value={showAll} onValueChange={toggleShowAll} trackColor={{ true: colors.primary }} />
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Hiển thị toàn bộ lịch sử</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.groupDayBtn,
            { borderColor: colors.border, backgroundColor: groupByDay ? colors.summaryBg : colors.surface },
            groupByDay && { borderColor: colors.primary },
            showAll && { opacity: 0.45 },
          ]}
          onPress={toggleGroupByDay}
          disabled={showAll}
        >
          <Text style={[styles.groupDayBtnText, { color: groupByDay ? colors.primary : colors.textSecondary }]}>
            {groupByDay ? '📅 Đang gom theo ngày' : '📋 Gom theo ngày'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month pagination (only if not show-all) */}
      {!showAll && (
        <View style={styles.monthAndActionRow}>
          <TouchableOpacity style={[styles.addBtnInline, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Text style={styles.addBtnText}>＋ Thêm mới</Text>
          </TouchableOpacity>
          <MonthPagination
            initialMonth={selectedMonth}
            initialYear={selectedYear}
            onMonthChanged={onMonthChanged}
            compact
            containerStyle={styles.monthPaginationInline}
          />
        </View>
      )}

      {/* Keep add button available in show-all mode */}
      {showAll && (
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Text style={styles.addBtnText}>＋ Thêm mới</Text>
        </TouchableOpacity>
      )}

      {/* Filter + sort collapsible */}
      <View style={styles.controlHeaderRow}>
        <TouchableOpacity
          style={[styles.controlToggleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={toggleControlsExpanded}
        >
          <Text style={[styles.controlToggleBtnText, { color: colors.textSecondary }]}>
            {controlsExpanded ? '▲ Thu gọn lọc/sắp xếp' : '▼ Mở lọc/sắp xếp'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortMenuBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={[styles.sortMenuBtnText, { color: colors.textSecondary }]}>
            Sắp xếp: {getSortLabel(sortColumn)}{getSortIcon(sortColumn)}
          </Text>
        </TouchableOpacity>
      </View>

      {controlsExpanded && (
        <View style={styles.filtersInlineRow}>
          <FilterReasonType
            label="Không theo lý do"
            reasonTypes={reasonTypes}
            selectedIds={filterOut}
            onSelectionChange={onFilterOutChange}
            containerStyle={styles.filterInlineItem}
            placeholderText="Không theo..."
          />
          <FilterReasonType
            label="Theo lý do"
            reasonTypes={reasonTypes}
            selectedIds={filterIn}
            onSelectionChange={onFilterInChange}
            containerStyle={styles.filterInlineItem}
            placeholderText="Theo lý do..."
          />
        </View>
      )}

      {/* List */}
      <LoadingOverlay visible={loading} />
      {!loading && !groupByDay && (
        <FlatList
          data={records}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={records.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>Không có dữ liệu</Text>}
        />
      )}
      {!loading && groupByDay && (
        <SectionList
          sections={groupedSections()}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title, data } }) => {
            const sectionTotal = data.reduce((sum, r) => sum + (r.amount || 0), 0);
            return (
              <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionHeaderDate, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.sectionHeaderTotal, { color: colors.primary }]}>{formatCurrency(sectionTotal)}</Text>
                <Text style={[styles.sectionHeaderCount, { color: colors.textMuted, backgroundColor: colors.summaryBg }]}>{data.length} mục</Text>
              </View>
            );
          }}
          style={styles.list}
          contentContainerStyle={records.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>Không có dữ liệu</Text>}
        />
      )}

      {/* Form modal */}
      <ExpenseFormModal
        visible={formVisible}
        expenseId={editingId}
        onClose={onFormClose}
      />

      {/* Sort modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <View style={styles.sortModalOverlay}>
          <View style={[styles.sortModalContent, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.sortModalTitle, { color: colors.text }]}>Sắp xếp danh sách</Text>
            <Text style={[styles.sortModalSubTitle, { color: colors.textMuted }]}>Chọn cột</Text>
            {[
              { key: 'createdDate', label: 'Ngày' },
              { key: 'amount', label: 'Số tiền' },
              { key: 'reason', label: 'Lý do' },
              { key: 'reasonType', label: 'Loại' },
            ].map(col => (
              <TouchableOpacity
                key={col.key}
                style={[
                  styles.sortOptionBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                  sortColumn === col.key && { borderColor: colors.primary, backgroundColor: colors.summaryBg },
                ]}
                onPress={() => onSort(col.key)}
              >
                <Text style={[styles.sortOptionText, { color: sortColumn === col.key ? colors.primary : colors.text }]}>
                  {sortColumn === col.key ? '●' : '○'} {col.label}{getSortIcon(col.key)}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.sortModalSubTitle, { color: colors.textMuted }]}>Hướng sắp xếp</Text>
            <View style={styles.sortDirectionRow}>
              <TouchableOpacity
                style={[
                  styles.sortDirectionBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                  sortDirection === 'asc' && { borderColor: colors.primary, backgroundColor: colors.summaryBg },
                ]}
                onPress={() => setSortDirectionValue('asc')}
              >
                <Text style={[styles.sortDirectionText, { color: sortDirection === 'asc' ? colors.primary : colors.text }]}>Tăng dần ▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortDirectionBtn,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                  sortDirection === 'desc' && { borderColor: colors.primary, backgroundColor: colors.summaryBg },
                ]}
                onPress={() => setSortDirectionValue('desc')}
              >
                <Text style={[styles.sortDirectionText, { color: sortDirection === 'desc' ? colors.primary : colors.text }]}>Giảm dần ▼</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sortModalActionRow}>
              <TouchableOpacity style={[styles.sortModalActionBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => setSortModalVisible(false)}>
                <Text style={[styles.sortModalActionText, { color: colors.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
  },
  // Summary
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCollapseBtn: {
    borderWidth: 1,
    width: 28,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCollapseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryText: { fontSize: 14, color: '#495057', marginBottom: 2 },
  bold: { fontWeight: 'bold', color: '#212529' },
  // Toggle
  topToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: { marginLeft: 8, fontSize: 14, color: '#495057' },
  monthAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
    gap: 8,
  },
  monthPaginationInline: {
    flex: 1,
  },
  // Add button
  addBtn: {
    backgroundColor: '#0d6efd',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  addBtnInline: {
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filtersInlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  filterInlineItem: {
    flex: 1,
    marginTop: 6,
  },
  // List
  loader: { marginTop: 24 },
  list: { marginTop: 6 },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#adb5bd' },
  // Row
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  rowMain: { flex: 1, marginRight: 8 },
  rowReason: { fontSize: 15, fontWeight: '600', color: '#212529', marginBottom: 2 },
  rowType: { fontSize: 13, color: '#6c757d', marginBottom: 2 },
  rowDate: { fontSize: 12, color: '#adb5bd' },
  rowRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  rowAmount: { fontSize: 15, fontWeight: 'bold', color: '#0d6efd' },
  rowActions: { flexDirection: 'row', marginTop: 6, gap: 6 },
  editBtn: {
    backgroundColor: '#e7f1ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editBtnText: { color: '#0d6efd', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteBtnText: { color: '#dc3545', fontSize: 13, fontWeight: '600' },
  controlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  controlToggleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
  },
  controlToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortMenuBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '53%',
  },
  sortMenuBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  sortModalContent: {
    borderRadius: 12,
    padding: 14,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sortModalSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  sortOptionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sortDirectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortDirectionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flex: 1,
    alignItems: 'center',
  },
  sortDirectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  sortModalActionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortModalActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Group by day
  groupDayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  groupDayBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 10,
  },
  sectionHeaderDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeaderCount: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
