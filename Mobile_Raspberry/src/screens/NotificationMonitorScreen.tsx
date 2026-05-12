import React, { useState, useCallback, useMemo } from 'react';
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
import { useTheme } from '../ThemeContext';
import { NotificationData } from '../models/notification.model';
import {
  getStoredNotifications,
  clearNotifications,
  deleteNotification,
  sendNotificationsEmail,
} from '../services/notificationService';
import { AppInfo, resolveAppInfoBatch } from '../services/appInfoService';

type AppGroup = {
  packageName: string;
  displayName: string;
  icon: string;
  notifications: NotificationData[];
};

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
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('grouped');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('createddate');
  const [sortDirection, setSortDirection] = useState<string>('desc');
  const [appInfoMap, setAppInfoMap] = useState<Map<string, AppInfo>>(new Map());

  const groupedByApp = useMemo(() => {
    const groups = new Map<string, AppGroup>();

    for (const item of notifications) {
      const info = appInfoMap.get(item.app);
      const displayName = item.appName || info?.name || item.app;
      const icon = info?.icon || '';
      const current = groups.get(item.app);

      if (current) {
        current.notifications.push(item);
      } else {
        groups.set(item.app, {
          packageName: item.app,
          displayName,
          icon,
          notifications: [item],
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.notifications.length - a.notifications.length);
  }, [notifications, appInfoMap]);

  const selectedAppNotifications = useMemo(() => {
    if (!selectedApp) return [];
    const group = groupedByApp.find((g) => g.packageName === selectedApp);
    return group?.notifications ?? [];
  }, [groupedByApp, selectedApp]);

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

  const handleSendEmail = async (items: NotificationData[]) => {
    if (items.length === 0) {
      Alert.alert('Thông báo', 'Chưa có thông báo nào để gửi.');
      return;
    }
    const result = await sendNotificationsEmail(items);
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
          setSelectedApp(null);
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
    <View style={[styles.notificationCard, { backgroundColor: colors.surface }]}>
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
          <Text style={[styles.appName, { color: colors.primary }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Text style={[styles.time, { color: colors.textMuted }]}>{item.time}</Text>
          {item.id != null && (
            <TouchableOpacity style={styles.deleteItemBtn} onPress={() => handleDeleteOne(item)}>
              <Text style={styles.deleteItemBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.title !== '(không có tiêu đề)' && (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
      )}
      <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={4}>
        {item.text}
      </Text>
    </View>
    );
  };

  const renderAppGroupItem = ({ item }: { item: AppGroup }) => (
    <TouchableOpacity
      style={[styles.appGroupCard, { backgroundColor: colors.surface }]}
      onPress={() => setSelectedApp(item.packageName)}
      activeOpacity={0.8}
    >
      <View style={styles.appGroupLeft}>
        {item.icon ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.icon}` }}
            style={styles.appGroupIcon}
          />
        ) : (
          <Text style={styles.appGroupEmoji}>📱</Text>
        )}
        <View style={styles.appGroupTextWrap}>
          <Text style={[styles.appGroupName, { color: colors.text }]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={[styles.appGroupPackage, { color: colors.textMuted }]} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
      </View>
      <View style={styles.appGroupRight}>
        <Text style={styles.appGroupCount}>{item.notifications.length}</Text>
        <Text style={styles.appGroupArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const isAppDetailView = viewMode === 'grouped' && selectedApp != null;
  const displayNotifications = isAppDetailView ? selectedAppNotifications : notifications;
  const selectedAppName =
    groupedByApp.find((g) => g.packageName === selectedApp)?.displayName ?? selectedApp ?? '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Permission Status */}
      <View style={[styles.statusCard, isPermissionGranted ? (isDark ? { backgroundColor: '#065f46', borderColor: '#059669' } : styles.statusOk) : (isDark ? { backgroundColor: '#78350f', borderColor: '#b45309' } : styles.statusError)]}>
        <Text style={[styles.statusText, { color: colors.text }]}>
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
        <View style={{ margin: 12, marginBottom: 0, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier', color: colors.textSecondary }}>
            {debugInfo}
          </Text>
        </View>
      ) : null}

      {/* View + Sort Buttons */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Hiển thị:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, viewMode === 'grouped' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => {
            setViewMode('grouped');
            setSelectedApp(null);
          }}
        >
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }, viewMode === 'grouped' && styles.sortBtnTextActive]}>
            Theo app
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, viewMode === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => {
            setViewMode('all');
            setSelectedApp(null);
          }}
        >
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }, viewMode === 'all' && styles.sortBtnTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sắp xếp:</Text>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sortBy === 'createddate' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => handleSortChange('createddate')}
        >
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }, sortBy === 'createddate' && styles.sortBtnTextActive]}>
            Thời gian {getSortIcon('createddate')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sortBy === 'app' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => handleSortChange('app')}
        >
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }, sortBy === 'app' && styles.sortBtnTextActive]}>
            Ứng dụng {getSortIcon('app')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.emailBtn, { backgroundColor: colors.primary }]} onPress={() => handleSendEmail(displayNotifications)}>
          <Text style={styles.emailBtnText}>📧 Gửi Email ({displayNotifications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.danger }]} onPress={handleClear}>
          <Text style={styles.clearBtnText}>🗑️ Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      {isAppDetailView && (
        <View style={styles.detailHeader}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => setSelectedApp(null)}>
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Quay lại list app</Text>
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: colors.primary }]} numberOfLines={1}>
            {selectedAppName}
          </Text>
        </View>
      )}

      {/* Notification List */}
      {viewMode === 'grouped' && !isAppDetailView ? (
        <FlatList
          data={groupedByApp}
          keyExtractor={(item) => item.packageName}
          renderItem={renderAppGroupItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Chưa có app nào có thông báo.\nKéo xuống để refresh.</Text>
            </View>
          }
          contentContainerStyle={groupedByApp.length === 0 ? styles.emptyList : undefined}
        />
      ) : (
        <FlatList
          data={displayNotifications}
          keyExtractor={(item, index) =>
            item.id != null ? item.id.toString() : `${item.app}-${item.time}-${index}`
          }
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
          contentContainerStyle={displayNotifications.length === 0 ? styles.emptyList : undefined}
        />
      )}
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
  detailHeader: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d6efd',
  },
  appGroupCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#20c997',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  appGroupIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  appGroupEmoji: {
    fontSize: 20,
  },
  appGroupTextWrap: {
    flex: 1,
  },
  appGroupName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
  },
  appGroupPackage: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  appGroupRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  appGroupCount: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#20c997',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  appGroupArrow: {
    fontSize: 20,
    color: '#20c997',
    lineHeight: 22,
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
