import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  NativeModules,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationData } from '../models/notification.model';
import {
  getStoredNotifications,
  clearNotifications,
  deleteNotification,
  sendNotificationsEmail,
} from '../services/notificationService';
import { AppInfo, resolveAppInfoBatch } from '../services/appInfoService';

// Lấy native module trực tiếp từ NativeModules
const { RNAndroidNotificationListener } = NativeModules;

async function checkPermissionStatus(): Promise<string> {
  try {
    if (RNAndroidNotificationListener?.getPermissionStatus) {
      return await RNAndroidNotificationListener.getPermissionStatus();
    }
    // Fallback: thử named export
    const lib = require('react-native-android-notification-listener');
    if (lib.getPermissionStatus) {
      return await lib.getPermissionStatus();
    }
  } catch (e: any) {
    console.warn('getPermissionStatus error:', e.message);
  }
  return 'unknown';
}

export default function NotificationMonitorScreen() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<string>('createddate');
  const [sortDirection, setSortDirection] = useState<string>('desc');
  const [appInfoMap, setAppInfoMap] = useState<Map<string, AppInfo>>(new Map());

  const loadData = useCallback(async (sort?: string, dir?: string) => {
    const currentSort = sort ?? sortBy;
    const currentDir = dir ?? sortDirection;

    // Debug: kiểm tra native module có tồn tại không
    const moduleExists = !!RNAndroidNotificationListener;
    const methods = RNAndroidNotificationListener
      ? Object.keys(RNAndroidNotificationListener)
      : [];
    
    let status = 'unknown';
    try {
      status = await checkPermissionStatus();
    } catch (e: any) {
      status = `error: ${e.message}`;
    }

    setDebugInfo(
      `Module: ${moduleExists ? 'OK' : 'NOT FOUND'}\n` +
      `Methods: ${methods.join(', ') || 'none'}\n` +
      `Status: ${status}`
    );
    setPermissionStatus(status);

    const stored = await getStoredNotifications(currentSort, currentDir);
    setNotifications(stored);

    // Resolve tên + icon cho các app (batch)
    const packageNames = stored.map(n => n.app);
    const infoMap = await resolveAppInfoBatch(packageNames);
    setAppInfoMap(infoMap);
  }, [sortBy, sortDirection]);

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

  const handleSortChange = async (newSortBy: string) => {
    let newDir = 'desc';
    if (newSortBy === sortBy) {
      newDir = sortDirection === 'desc' ? 'asc' : 'desc';
    }
    setSortBy(newSortBy);
    setSortDirection(newDir);
    await loadData(newSortBy, newDir);
  };

  const handleGrantPermission = () => {
    // Mở trang Notification Access trong Settings Android
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS').catch(() => {
        // Fallback nếu intent không hoạt động
        Linking.openSettings();
      });
    } else {
      Linking.openSettings();
    }
  };

  const handleSendEmail = async () => {
    if (notifications.length === 0) {
      Alert.alert('Thông báo', 'Chưa có thông báo nào để gửi.');
      return;
    }
    const result = await sendNotificationsEmail(notifications);
    if (result.success) {
      Alert.alert('Thành công', result.message);
    } else {
      Alert.alert('Lỗi', result.message);
    }
  };

  const handleDeleteOne = (item: NotificationData) => {
    if (!item.id) return;
    const displayName = item.appName || appInfoMap.get(item.app)?.name || item.app;
    Alert.alert('Xác nhận', `Xóa thông báo từ "${displayName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteNotification(item.id!);
          if (ok) {
            await loadData();
          } else {
            Alert.alert('Lỗi', 'Không thể xóa thông báo.');
          }
        },
      },
    ]);
  };

  const handleClear = () => {
    Alert.alert('Xác nhận', 'Xóa tất cả thông báo đã thu thập?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await clearNotifications();
          setNotifications([]);
        },
      },
    ]);
  };

  const isPermissionGranted = permissionStatus === 'authorized';

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕';
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    const info = appInfoMap.get(item.app);
    const displayName = item.appName || info?.name || item.app;
    const iconBase64 = info?.icon;

    return (
    <View style={styles.notificationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.appRow}>
          {iconBase64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${iconBase64}` }}
              style={styles.appIcon}
            />
          ) : (
            <Text style={styles.appEmoji}>📱</Text>
          )}
          <Text style={styles.appName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Text style={styles.time}>{item.time}</Text>
          {item.id != null && (
            <TouchableOpacity style={styles.deleteItemBtn} onPress={() => handleDeleteOne(item)}>
              <Text style={styles.deleteItemBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.title !== '(không có tiêu đề)' && (
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      )}
      <Text style={styles.text} numberOfLines={4}>
        {item.text}
      </Text>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Permission Status */}
      <View style={[styles.statusCard, isPermissionGranted ? styles.statusOk : styles.statusError]}>
        <Text style={styles.statusText}>
          {isPermissionGranted
            ? '✅ Đang lắng nghe thông báo'
            : '⚠️ Chưa cấp quyền đọc thông báo'}
        </Text>
        {!isPermissionGranted && (
          <TouchableOpacity style={styles.permissionBtn} onPress={handleGrantPermission}>
            <Text style={styles.permissionBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Debug Info - xóa sau khi xác nhận hoạt động */}
      {debugInfo ? (
        <View style={{ margin: 12, marginBottom: 0, padding: 10, backgroundColor: '#eee', borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier', color: '#333' }}>
            {debugInfo}
          </Text>
        </View>
      ) : null}

      {/* Sort Buttons */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sắp xếp:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'createddate' && styles.sortBtnActive]}
          onPress={() => handleSortChange('createddate')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'createddate' && styles.sortBtnTextActive]}>
            Thời gian {getSortIcon('createddate')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'app' && styles.sortBtnActive]}
          onPress={() => handleSortChange('app')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'app' && styles.sortBtnTextActive]}>
            Ứng dụng {getSortIcon('app')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.emailBtn} onPress={handleSendEmail}>
          <Text style={styles.emailBtnText}>📧 Gửi Email ({notifications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>🗑️ Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => item.id != null ? item.id.toString() : index.toString()}
        renderItem={renderNotificationItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isPermissionGranted
                ? 'Chưa có thông báo nào được thu thập.\nKéo xuống để refresh.'
                : 'Hãy cấp quyền đọc thông báo để bắt đầu.'}
            </Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusCard: {
    margin: 12,
    marginBottom: 0,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOk: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sortBtnActive: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    margin: 12,
    gap: 10,
  },
  emailBtn: {
    flex: 1,
    backgroundColor: '#0d6efd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  clearBtn: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0d6efd',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d6efd',
    flex: 1,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  appIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  appEmoji: {
    fontSize: 16,
  },
  time: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
  deleteItemBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteItemBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  text: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyList: {
    flex: 1,
  },
});
