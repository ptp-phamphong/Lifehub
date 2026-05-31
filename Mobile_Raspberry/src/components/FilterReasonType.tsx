import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { ReasonType } from '../models/reasonType.model';
import { useTheme } from '../ThemeContext';

interface Props {
  label: string;
  reasonTypes: ReasonType[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  containerStyle?: StyleProp<ViewStyle>;
  placeholderText?: string;
}

export default function FilterReasonType({
  label,
  reasonTypes,
  selectedIds,
  onSelectionChange,
  containerStyle,
  placeholderText,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  const getReasonTypeLabel = (reasonType: ReasonType) => {
    if (!reasonType.reasonName) {
      return '';
    }

    return reasonType.active === false
      ? `${reasonType.reasonName} (inactive)`
      : reasonType.reasonName;
  };

  const toggleItem = (id: number) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  };

  const selectedNames = reasonTypes
    .filter(r => r.id !== undefined && selectedIds.includes(r.id))
    .map(r => getReasonTypeLabel(r))
    .join(', ');

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setModalVisible(true)}>
        <Text style={selectedNames ? [styles.selectedText, { color: colors.text }] : [styles.placeholder, { color: colors.textMuted }]} numberOfLines={1}>
          {selectedNames || placeholderText || 'Chọn loại lý do...'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
            <ScrollView style={styles.list}>
              {reasonTypes.map(rt => {
                const isSelected = rt.id !== undefined && selectedIds.includes(rt.id);
                return (
                  <TouchableOpacity
                    key={rt.id}
                    style={[styles.item, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => rt.id !== undefined && toggleItem(rt.id)}
                  >
                    <Text style={[styles.itemText, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                      {isSelected ? '☑ ' : '☐ '}{getReasonTypeLabel(rt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.clearBtn} onPress={() => onSelectionChange([])}>
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>Xóa tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  label: { fontSize: 13, marginBottom: 4 },
  selector: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeholder: { fontSize: 14 },
  selectedText: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  list: { marginBottom: 12 },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  itemText: { fontSize: 15 },
  clearBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  clearBtnText: { fontSize: 14 },
  doneBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
