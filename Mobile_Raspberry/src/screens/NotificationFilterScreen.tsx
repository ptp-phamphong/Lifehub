import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { NotificationFilterData } from '../models/notificationFilter.model';
import {
  getAllFilters,
  addFilter,
  updateFilter,
  deleteFilter,
  invalidateFilterCache,
} from '../services/notificationFilterService';

type FilterSection = {
  title: string;
  icon: string;
  filterType: string;
  data: NotificationFilterData[];
};

export default function NotificationFilterScreen() {
  const { colors, isDark } = useTheme();
  const [sections, setSections] = useState<FilterSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFilterType, setNewFilterType] = useState<string>('package');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [newFilterDesc, setNewFilterDesc] = useState('');

  const loadData = useCallback(async () => {
    try {
      const filters = await getAllFilters();
      const grouped: FilterSection[] = [
        {
          title: 'Android Flags',
          icon: '🚩',
          filterType: 'flag',
          data: filters.filter(f => f.filterType === 'flag'),
        },
        {
          title: 'Package (Ứng dụng)',
          icon: '📦',
          filterType: 'package',
          data: filters.filter(f => f.filterType === 'package'),
        },
        {
          title: 'Keyword (Từ khóa)',
          icon: '🔤',
          filterType: 'keyword',
          data: filters.filter(f => f.filterType === 'keyword'),
        },
      ];
      setSections(grouped);
    } catch (e: any) {
      Alert.alert('Lỗi', `Không tải được filters: ${e.message}`);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggle = async (item: NotificationFilterData) => {
    if (!item.id) return;
    try {
      await updateFilter(item.id, {
        filterValue: item.filterValue,
        description: item.description,
        isActive: !item.isActive,
      });
      await invalidateFilterCache();
      await loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const handleDelete = (item: NotificationFilterData) => {
    if (!item.id) return;
    Alert.alert(
      'Xác nhận xóa',
      `Xóa filter "${item.filterValue}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFilter(item.id!);
              await invalidateFilterCache();
              await loadData();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message);
            }
          },
        },
      ]
    );
  };

  const handleAdd = async () => {
    const value = newFilterValue.trim();
    if (!value) {
      Alert.alert('Lỗi', 'Giá trị filter không được để trống.');
      return;
    }
    try {
      await addFilter({
        filterType: newFilterType,
        filterValue: value,
        description: newFilterDesc.trim(),
      });
      await invalidateFilterCache();
      setModalVisible(false);
      setNewFilterValue('');
      setNewFilterDesc('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const openAddModal = (type: string) => {
    setNewFilterType(type);
    setNewFilterValue('');
    setNewFilterDesc('');
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: NotificationFilterData }) => (
    <View style={[styles.filterCard, { backgroundColor: colors.surface }, !item.isActive && styles.filterCardInactive]}>
      <View style={styles.filterMain}>
        <View style={styles.filterInfo}>
          <Text style={[styles.filterValue, { color: colors.text }, !item.isActive && styles.textInactive]} numberOfLines={1}>
            {item.filterValue}
          </Text>
          {item.description ? (
            <Text style={[styles.filterDesc, { color: colors.textMuted }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.filterActions}>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: colors.border, true: '#8bc34a' }}
            thumbColor={item.isActive ? '#4caf50' : '#f4f3f4'}
          />
          <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: isDark ? '#450a0a' : '#ffebee' }]} onPress={() => handleDelete(item)}>
            <Text style={[styles.deleteBtnText, { color: isDark ? '#fca5a5' : '#d32f2f' }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: FilterSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {section.icon} {section.title} ({section.data.length})
      </Text>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => openAddModal(section.filterType)}
      >
        <Text style={styles.addBtnText}>+ Thêm</Text>
      </TouchableOpacity>
    </View>
  );

  const getPlaceholder = () => {
    switch (newFilterType) {
      case 'package':
        return 'com.example.app';
      case 'keyword':
        return 'đang chạy trong nền';
      case 'flag':
        return 'ongoing | foreground_service | no_clear | group_summary';
      default:
        return '';
    }
  };

  const getTypeLabel = () => {
    switch (newFilterType) {
      case 'package': return '📦 Package';
      case 'keyword': return '🔤 Keyword';
      case 'flag': return '🚩 Flag';
      default: return newFilterType;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header info */}
      <View style={[styles.infoCard, { backgroundColor: isDark ? '#1e3a5f' : '#e3f2fd', borderColor: isDark ? '#2563eb' : '#1976d2' }]}>
        <Text style={[styles.infoTitle, { color: isDark ? '#93c5fd' : '#1565c0' }]}>Bộ lọc thông báo</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Quản lý các filter để tự động bỏ qua thông báo không cần thiết.
          Filter được đồng bộ từ server và cache trên thiết bị.
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id?.toString() ?? item.filterValue}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Chưa có filter nào. Kéo xuống để refresh.</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Add Filter Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm filter mới</Text>
            <Text style={[styles.modalType, { color: colors.primary }]}>{getTypeLabel()}</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Giá trị filter</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              value={newFilterValue}
              onChangeText={setNewFilterValue}
              placeholder={getPlaceholder()}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mô tả (tùy chọn)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              value={newFilterDesc}
              onChangeText={setNewFilterDesc}
              placeholder="Mô tả ngắn gọn..."
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
                <Text style={styles.modalSaveText}>Thêm</Text>
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
    backgroundColor: '#f5f5f5',
  },
  infoCard: {
    margin: 12,
    marginBottom: 4,
    padding: 14,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    borderColor: '#1976d2',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1565c0',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  addBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  filterCardInactive: {
    borderLeftColor: '#ccc',
    opacity: 0.65,
  },
  filterMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterInfo: {
    flex: 1,
    marginRight: 8,
  },
  filterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  textInactive: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  filterDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#d32f2f',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalType: {
    fontSize: 13,
    color: '#0d6efd',
    fontWeight: '600',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  modalCancelText: {
    color: '#555',
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0d6efd',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});
