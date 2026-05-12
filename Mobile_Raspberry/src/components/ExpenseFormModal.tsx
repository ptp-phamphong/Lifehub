import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReasonType } from '../models/reasonType.model';
import { ExpenseRecord } from '../models/expense.model';
import { getExpenseById, addExpense, updateExpense } from '../services/expenseService';
import { getAllReasonTypes } from '../services/reasonTypeService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../ThemeContext';

interface Props {
  visible: boolean;
  expenseId: number; // 0 = thêm mới, > 0 = sửa
  onClose: (saved: boolean) => void;
}

export default function ExpenseFormModal({ visible, expenseId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(0);
  const [reasonTypeId, setReasonTypeId] = useState<number | undefined>(undefined);
  const [reasonTypes, setReasonTypes] = useState<ReasonType[]>([]);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const isReasonTypeActive = (reasonType: ReasonType) => reasonType.active !== false;

  const getReasonTypeLabel = (reasonType?: ReasonType) => {
    if (!reasonType?.reasonName) {
      return '';
    }

    return isReasonTypeActive(reasonType)
      ? reasonType.reasonName
      : `${reasonType.reasonName} (inactive)`;
  };

  useEffect(() => {
    if (!visible) return;
    // Reset form
    setReason('');
    setAmount(0);
    setReasonTypeId(undefined);
    setExpenseDate(new Date());
    loadReasonTypes();
    if (expenseId > 0) {
      loadExpense(expenseId);
    }
  }, [visible, expenseId]);

  const loadReasonTypes = async () => {
    try {
      const data = await getAllReasonTypes();
      setReasonTypes(data);
    } catch (err) {
      console.error('Lỗi khi tải reason types:', err);
    }
  };

  const loadExpense = async (id: number) => {
    try {
      const record = await getExpenseById(id);
      setReason(record.reason ?? '');
      setAmount(record.amount ?? 0);
      setReasonTypeId(record.reasonTypeId);
      if (record.createdDate) {
        setExpenseDate(new Date(record.createdDate));
      }
    } catch (err) {
      console.error('Lỗi khi tải expense:', err);
    }
  };

  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00`;
  };

  const handleSubmit = async () => {
    if (!reason.trim() || amount <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ lý do và số tiền.');
      return;
    }

    const payload: ExpenseRecord = {
      reason,
      amount,
      reasonTypeId,
      createdDate: formatLocalDate(expenseDate),
    };

    setLoading(true);
    try {
      if (expenseId > 0) {
        await updateExpense(expenseId, payload);
      } else {
        await addExpense(payload);
      }
      onClose(true);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu chi tiêu. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (!value) return '';
    return value.toLocaleString('vi-VN');
  };

  const onAmountInput = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '');
    setAmount(Number(raw) || 0);
  };

  const activeReasonTypes = reasonTypes.filter(isReasonTypeActive);
  const selectedReasonName = getReasonTypeLabel(reasonTypes.find(r => r.id === reasonTypeId));

  const formatDisplayDate = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <ScrollView>
            <Text style={[styles.title, { color: colors.primary }]}>
              {expenseId > 0 ? 'Sửa ghi chú chi tiêu' : 'Thêm ghi chú chi tiêu'}
            </Text>

            {/* Lý do */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Lý do</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Nhập lý do..."
              placeholderTextColor={colors.textMuted}
            />

            {/* Số tiền */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Số tiền (VNĐ)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              value={amount > 0 ? formatCurrency(amount) : ''}
              onChangeText={onAmountInput}
              placeholder="Nhập số tiền..."
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            {/* Loại lý do */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Loại lý do</Text>
            <TouchableOpacity style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowReasonPicker(true)}>
              <Text style={selectedReasonName ? [styles.pickerText, { color: colors.text }] : [styles.pickerPlaceholder, { color: colors.textMuted }]}>
                {selectedReasonName ?? 'Chọn loại lý do...'}
              </Text>
            </TouchableOpacity>

            {/* Ngày chi tiêu */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ngày chi tiêu</Text>
            <TouchableOpacity style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg }]} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.pickerText, { color: colors.text }]}>{formatDisplayDate(expenseDate)}</Text>
            </TouchableOpacity>

            {/* Native date picker */}
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <View style={styles.iosPickerWrapper}>
                  <DateTimePicker
                    value={expenseDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    locale="vi-VN"
                  />
                  <TouchableOpacity style={styles.iosPickerDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.iosPickerDoneText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )
            )}

            {/* Reason type picker modal */}
            <Modal visible={showReasonPicker} transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={[styles.pickerContent, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>Chọn loại lý do</Text>
                  <ScrollView>
                    <TouchableOpacity
                      style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setReasonTypeId(undefined); setShowReasonPicker(false); }}
                    >
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>-- Không chọn --</Text>
                    </TouchableOpacity>
                    {activeReasonTypes.map(rt => (
                      <TouchableOpacity
                        key={rt.id}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }, rt.id === reasonTypeId && { backgroundColor: colors.surfaceAlt }]}
                        onPress={() => { setReasonTypeId(rt.id); setShowReasonPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.text }, rt.id === reasonTypeId && { color: colors.primary, fontWeight: '600' }]}>
                          {getReasonTypeLabel(rt)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.pickerClose} onPress={() => setShowReasonPicker(false)}>
                    <Text style={[styles.pickerCloseText, { color: colors.textMuted }]}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>{loading ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.danger }]} onPress={() => onClose(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  pickerText: { fontSize: 15, color: '#212529' },
  pickerPlaceholder: { fontSize: 15, color: '#adb5bd' },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  cancelBtnText: { color: '#dc3545', fontSize: 15, fontWeight: '600' },
  // Nested picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 32,
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    maxHeight: '60%',
  },
  pickerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#212529' },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemActive: { backgroundColor: '#e7f1ff' },
  pickerItemText: { fontSize: 15, color: '#212529' },
  pickerItemTextActive: { color: '#0d6efd', fontWeight: '600' },
  pickerClose: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  pickerCloseText: { color: '#6c757d', fontSize: 14 },
  // iOS date picker
  iosPickerWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    paddingBottom: 8,
  },
  iosPickerDone: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iosPickerDoneText: {
    color: '#0d6efd',
    fontSize: 15,
    fontWeight: '600',
  },
});
