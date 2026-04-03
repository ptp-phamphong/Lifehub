import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config';
import { NotificationData } from '../models/notification.model';
import { shouldIgnoreNotification } from './notificationFilterService';
import { getAppName } from './appInfoService';

const STORAGE_KEY = 'captured_notifications';
const MAX_NOTIFICATIONS = 500;

/**
 * Lưu 1 notification mới vào DB thông qua API.
 * Fallback vào AsyncStorage nếu API không khả dụng.
 */
export async function storeNotification(notification: NotificationData): Promise<void> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/AddPhoneNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: notification.app,
        appName: notification.appName,
        title: notification.title,
        text: notification.text,
        time: notification.time,
      }),
    });
    if (res.ok) return;
  } catch (e) {
    // API không khả dụng -> fallback AsyncStorage
  }

  // Fallback: lưu vào AsyncStorage
  const existing = await getStoredNotificationsLocal();
  existing.unshift(notification);
  if (existing.length > MAX_NOTIFICATIONS) {
    existing.length = MAX_NOTIFICATIONS;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Đọc tất cả notifications từ DB thông qua API.
 */
export async function getStoredNotifications(
  sortBy: string = 'createddate',
  sortDirection: string = 'desc'
): Promise<NotificationData[]> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/GetAllPhoneNotifications?sortBy=${sortBy}&sortDirection=${sortDirection}`
    );
    if (res.ok) {
      return (await res.json()) as NotificationData[];
    }
  } catch (e) {
    // API không khả dụng -> fallback
  }
  return await getStoredNotificationsLocal();
}

/**
 * Đọc notifications từ AsyncStorage (fallback).
 */
async function getStoredNotificationsLocal(): Promise<NotificationData[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json) as NotificationData[];
}

/**
 * Xóa 1 notification theo id.
 */
export async function deleteNotification(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/DeletePhoneNotification/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Xóa tất cả notifications.
 */
export async function clearNotifications(): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/DeleteAllPhoneNotifications`, {
      method: 'DELETE',
    });
  } catch (e) {
    // fallback
  }
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

    // Lọc bỏ thông báo hệ thống (dynamic filters từ backend + cache)
    if (await shouldIgnoreNotification(data)) return;

    // Resolve tên app từ package name (ví dụ: com.facebook.orca → Messenger)
    const appName = await getAppName(data.app);

    const notification: NotificationData = {
      app: data.app,
      appName: appName,
      title: data.title || data.titleBig || '(không có tiêu đề)',
      text: data.bigText || data.text || data.summaryText || '(không có nội dung)',
      time: new Date().toLocaleString('vi-VN'),
    };

    await storeNotification(notification);
  } catch (e) {
    console.warn('handleNotification error:', e);
  }
}
