import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config';
import { NotificationData } from '../models/notification.model';
import { shouldIgnoreNotification } from './notificationFilterService';
import { getAppName } from './appInfoService';
import { getToken } from './authService';

const STORAGE_KEY = 'captured_notifications';
const MAX_NOTIFICATIONS = 500;
let persistQueue: Promise<void> = Promise.resolve();

function toSafeString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function getMessageSignatures(data: any): string[] {
  if (!Array.isArray(data?.messageSignatures) || data.messageSignatures.length === 0) {
    return [];
  }

  const candidates = data.messageSignatures
    .map((x: unknown) => toSafeString(x))
    .filter((x: string) => x.length > 0);

  if (candidates.length === 0) return [];

  const seen = new Set<string>();
  const uniqueCandidates: string[] = [];
  for (const signature of candidates) {
    if (seen.has(signature)) continue;
    seen.add(signature);
    uniqueCandidates.push(signature);
  }
  return uniqueCandidates;
}

function parseMessageSignature(signature: string): { timestamp: string; sender: string; text: string } | null {
  if (!signature) return null;
  const firstSep = signature.indexOf('|');
  if (firstSep <= 0) return null;

  const secondSep = signature.indexOf('|', firstSep + 1);
  if (secondSep < 0) return null;

  return {
    timestamp: signature.slice(0, firstSep),
    sender: signature.slice(firstSep + 1, secondSep).trim(),
    text: signature.slice(secondSep + 1).trim(),
  };
}

type NotificationIdentity = {
  notificationKey: string;
  notificationId: string;
  notificationTag: string;
  androidTime: string;
  messageSender?: string;
  messageText?: string;
};

function buildNotificationIdentities(data: any, rawNotification: string): NotificationIdentity[] {
  const app = toSafeString(data?.app);
  const androidTime =
    toSafeString(data?.time) ||
    toSafeString(data?.postTime) ||
    toSafeString(data?.when) ||
    '';

  const notificationId =
    toSafeString(data?.notificationId) ||
    toSafeString(data?.id) ||
    toSafeString(data?.notification_id) ||
    '';

  const notificationTag =
    toSafeString(data?.notificationTag) ||
    toSafeString(data?.tag) ||
    '';

  const nativeKey =
    toSafeString(data?.notificationKey) ||
    toSafeString(data?.key) ||
    toSafeString(data?.notification_key) ||
    '';

  // message-level signatures từ EXTRA_MESSAGES (timestamp|sender|text).
  // Một event có thể chứa nhiều message khi mạng bật lại và tin đổ về cùng lúc.
  const messageSignatures = getMessageSignatures(data);
  if (messageSignatures.length > 0) {
    return messageSignatures.map((signature) => {
      const parsed = parseMessageSignature(signature);
      return {
        notificationKey: nativeKey
          ? `msg:${nativeKey}:${stableHash(signature)}`
          : `msgsig:${app}:${stableHash(signature)}`,
        notificationId,
        notificationTag,
        androidTime: parsed?.timestamp || androidTime,
        messageSender: parsed?.sender,
        messageText: parsed?.text,
      };
    });
  }

  if (nativeKey && androidTime) {
    return [{
      notificationKey: `post:${nativeKey}:${androidTime}`,
      notificationId,
      notificationTag,
      androidTime,
    }];
  }

  if (nativeKey) {
    return [{
      notificationKey: `notif:${nativeKey}`,
      notificationId,
      notificationTag,
      androidTime,
    }];
  }

  // Fallback cuối cùng nếu native chưa expose fields.
  const rawSignature = stableHash(rawNotification || JSON.stringify(data ?? {}));
  return [{
    notificationKey: `raw:${app}:${androidTime || 'na'}:${rawSignature}`,
    notificationId,
    notificationTag,
    androidTime,
  }];
}

function buildMergeKey(notification: NotificationData): string {
  return (
    toSafeString(notification.notificationKey) ||
    [
      toSafeString(notification.app),
      toSafeString(notification.androidTime),
      toSafeString(notification.title),
      toSafeString(notification.text),
      toSafeString(notification.time),
    ].join('|')
  );
}

function mergeNotifications(remote: NotificationData[], local: NotificationData[]): NotificationData[] {
  const map = new Map<string, NotificationData>();

  for (const item of remote) {
    map.set(buildMergeKey(item), item);
  }

  for (const item of local) {
    const key = buildMergeKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).slice(0, MAX_NOTIFICATIONS);
}

function enqueuePersist(work: () => Promise<void>): Promise<void> {
  persistQueue = persistQueue
    .then(work)
    .catch((err) => {
      console.warn('persist queue error:', err);
    });

  return persistQueue;
}

/**
 * Lưu 1 notification mới vào DB thông qua API.
 * Fallback vào AsyncStorage nếu API không khả dụng.
 */
export async function storeNotification(notification: NotificationData): Promise<void> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBaseUrl()}/AddPhoneNotification`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        app: notification.app,
        appName: notification.appName,
        title: notification.title,
        text: notification.text,
        time: notification.time,
        androidTime: notification.androidTime,
        notificationKey: notification.notificationKey,
        notificationId: notification.notificationId,
        notificationTag: notification.notificationTag,
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
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${getApiBaseUrl()}/GetAllPhoneNotifications?sortBy=${sortBy}&sortDirection=${sortDirection}`,
      { headers }
    );
    if (res.ok) {
      const remote = (await res.json()) as NotificationData[];
      const local = await getStoredNotificationsLocal();
      return mergeNotifications(remote, local);
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
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBaseUrl()}/DeletePhoneNotification/${id}`, {
      method: 'DELETE',
      headers,
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
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${getApiBaseUrl()}/DeleteAllPhoneNotifications`, {
      method: 'DELETE',
      headers,
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
    const token = await getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getApiBaseUrl()}/SendNotificationEmail`, {
      method: 'POST',
      headers,
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

    const rawNotification = taskData.notification;
    const data = JSON.parse(rawNotification);
    if (!data || !data.app) return;

    // Lọc bỏ thông báo hệ thống (dynamic filters từ backend + cache)
    if (await shouldIgnoreNotification(data)) return;

    // Resolve tên app từ package name (ví dụ: com.facebook.orca → Messenger)
    const appName = await getAppName(data.app);
    const baseTitle = data.title || data.titleBig || '(không có tiêu đề)';
    const baseText = data.bigText || data.text || data.summaryText || '(không có nội dung)';
    const identities = buildNotificationIdentities(data, rawNotification);

    // Serialize write path để giảm rớt request khi burst lớn trong headless mode.
    await enqueuePersist(async () => {
      for (const identity of identities) {
        const notification: NotificationData = {
          app: data.app,
          appName: appName,
          title: identity.messageSender || baseTitle,
          text: identity.messageText || baseText,
          time: new Date().toLocaleString('vi-VN'),
          androidTime: identity.androidTime,
          notificationKey: identity.notificationKey,
          notificationId: identity.notificationId,
          notificationTag: identity.notificationTag,
        };

        await storeNotification(notification);
      }
    });
  } catch (e) {
    console.warn('handleNotification error:', e);
  }
}
