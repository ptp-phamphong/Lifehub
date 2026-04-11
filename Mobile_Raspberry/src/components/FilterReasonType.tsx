import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ReasonType } from '../models/reasonType.model';

interface Props {
  label: string;
  reasonTypes: ReasonType[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

export default function FilterReasonType({ label, reasonTypes, selectedIds, onSelectionChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

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
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
        <Text style={selectedNames ? styles.selectedText : styles.placeholder} numberOfLines={1}>
          {selectedNames || 'Chọn loại lý do...'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.list}>
              {reasonTypes.map(rt => {
                const isSelected = rt.id !== undefined && selectedIds.includes(rt.id);
                return (
                  <TouchableOpacity
                    key={rt.id}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => rt.id !== undefined && toggleItem(rt.id)}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {isSelected ? '☑ ' : '☐ '}{getReasonTypeLabel(rt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.clearBtn} onPress={() => onSelectionChange([])}>
              <Text style={styles.clearBtnText}>Xóa tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setModalVisible(false)}>
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
  label: { fontSize: 13, color: '#495057', marginBottom: 4 },
  selector: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  placeholder: { color: '#adb5bd', fontSize: 14 },
  selectedText: { color: '#212529', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#212529' },
  list: { marginBottom: 12 },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemSelected: { backgroundColor: '#e7f1ff' },
  itemText: { fontSize: 15, color: '#212529' },
  itemTextSelected: { color: '#0d6efd', fontWeight: '600' },
  clearBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  clearBtnText: { color: '#dc3545', fontSize: 14 },
  doneBtn: {
    backgroundColor: '#0d6efd',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
