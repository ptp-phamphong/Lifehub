import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
    }),
    [filterIn, filterOut],
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
      .then(setReasonTypes)
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

  const onFilterInChange = (ids: number[]) => {
    setFilterIn(ids);
    setFilterOut(prev => prev.filter(id => !ids.includes(id)));
  };

  const onFilterOutChange = (ids: number[]) => {
    setFilterOut(ids);
    setFilterIn(prev => prev.filter(id => !ids.includes(id)));
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
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowReason} numberOfLines={1}>{item.reason}</Text>
        <Text style={styles.rowType}>{item.reasonType?.reasonName ?? '—'}</Text>
        <Text style={styles.rowDate}>{formatDate(item.createdDate)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => openEdit(item.id!)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ── Main Render ───────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryBox}>
        {!showAll && monthSum > 0 && (
          <Text style={styles.summaryText}>
            Tổng tháng {selectedMonth}/{selectedYear}: <Text style={styles.bold}>{formatCurrency(monthSum)}</Text>
          </Text>
        )}
        {showAll && allSum > 0 && (
          <Text style={styles.summaryText}>
            Tổng toàn bộ: <Text style={styles.bold}>{formatCurrency(allSum)}</Text>
          </Text>
        )}
        {showAll && allFilteredSum > 0 && (
          <Text style={styles.summaryText}>
            Lịch sử theo filter: <Text style={styles.bold}>{formatCurrency(allFilteredSum)}</Text>
          </Text>
        )}
        {weekSum > 0 && (
          <Text style={styles.summaryText}>
            Tổng tuần hiện tại: <Text style={styles.bold}>{formatCurrency(weekSum)}</Text>
          </Text>
        )}
      </View>

      {/* Toggle show all */}
      <View style={styles.toggleRow}>
        <Switch value={showAll} onValueChange={toggleShowAll} trackColor={{ true: '#0d6efd' }} />
        <Text style={styles.toggleLabel}>Hiển thị toàn bộ lịch sử</Text>
      </View>

      {/* Month pagination (only if not show-all) */}
      {!showAll && (
        <MonthPagination
          initialMonth={selectedMonth}
          initialYear={selectedYear}
          onMonthChanged={onMonthChanged}
        />
      )}

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>＋ Thêm mới</Text>
      </TouchableOpacity>

      {/* Filters */}
      <FilterReasonType
        label="Lọc theo lý do"
        reasonTypes={reasonTypes}
        selectedIds={filterIn}
        onSelectionChange={onFilterInChange}
      />
      <FilterReasonType
        label="Lọc theo không phải lý do"
        reasonTypes={reasonTypes}
        selectedIds={filterOut}
        onSelectionChange={onFilterOutChange}
      />

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={styles.loader} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={records.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có dữ liệu</Text>}
        />
      )}

      {/* Form modal */}
      <ExpenseFormModal
        visible={formVisible}
        expenseId={editingId}
        onClose={onFormClose}
      />
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
  summaryText: { fontSize: 14, color: '#495057', marginBottom: 2 },
  bold: { fontWeight: 'bold', color: '#212529' },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleLabel: { marginLeft: 8, fontSize: 14, color: '#495057' },
  // Add button
  addBtn: {
    backgroundColor: '#0d6efd',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // List
  loader: { marginTop: 24 },
  list: { marginTop: 8 },
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
});
