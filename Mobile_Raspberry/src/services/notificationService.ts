import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config';
import { NotificationData } from '../models/notification.model';

const STORAGE_KEY = 'captured_notifications';
const MAX_NOTIFICATIONS = 500;

/**
 * Lưu 1 notification mới vào AsyncStorage.
 * Được gọi từ headless task khi nhận notification.
 */
export async function storeNotification(notification: NotificationData): Promise<void> {
  const existing = await getStoredNotifications();
  existing.unshift(notification);

  // Giới hạn số lượng để tránh full storage
  if (existing.length > MAX_NOTIFICATIONS) {
    existing.length = MAX_NOTIFICATIONS;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Đọc tất cả notifications đã lưu.
 */
export async function getStoredNotifications(): Promise<NotificationData[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json) as NotificationData[];
}

/**
 * Xóa tất cả notifications đã lưu.
 */
export async function clearNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Gửi tất cả notifications qua email thông qua backend API.
 * Backend sẽ dùng EmailService (Gmail SMTP) để gửi.
 */
export async function sendNotificationsEmail(notifications: NotificationData[]): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/SendNotificationEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: errorText || `Lỗi server (${res.status})` };
    }

    const data = await res.json();
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Không kết nối được tới server.' };
  }
}

/**
 * Handler cho headless task - được gọi mỗi khi có notification mới.
 * Chạy trong background, không có UI.
 *
 * Library truyền vào { notification: string } với notification là JSON string.
 */
export async function handleNotification(taskData: { notification: string }): Promise<void> {
  try {
    if (!taskData?.notification) return;

    const data = JSON.parse(taskData.notification);
    if (!data || !data.app) return;

    const notification: NotificationData = {
      app: data.app,
      title: data.title || data.titleBig || '(không có tiêu đề)',
      text: data.bigText || data.text || data.summaryText || '(không có nội dung)',
      time: new Date().toLocaleString('vi-VN'),
    };

    await storeNotification(notification);
  } catch (e) {
    console.warn('handleNotification error:', e);
  }
}
