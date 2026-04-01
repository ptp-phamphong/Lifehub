import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config';
import { NotificationFilterData, FLAG_NAME_TO_BIT } from '../models/notificationFilter.model';

const FILTER_CACHE_KEY = 'notification_filter_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

interface FilterCache {
  filters: NotificationFilterData[];
  timestamp: number;
}

// ============================
// API calls
// ============================

export async function getAllFilters(): Promise<NotificationFilterData[]> {
  const res = await fetch(`${getApiBaseUrl()}/GetAllNotificationFilters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as NotificationFilterData[];
}

export async function getActiveFilters(): Promise<NotificationFilterData[]> {
  const res = await fetch(`${getApiBaseUrl()}/GetActiveNotificationFilters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as NotificationFilterData[];
}

export async function addFilter(
  filter: Omit<NotificationFilterData, 'id' | 'isActive' | 'createdDate'>
): Promise<number> {
  const res = await fetch(`${getApiBaseUrl()}/AddNotificationFilter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filter),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function updateFilter(
  id: number,
  update: { filterValue: string; description: string; isActive: boolean }
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/UpdateNotificationFilter/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteFilter(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/DeleteNotificationFilter/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function seedDefaultFilters(): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/SeedNotificationFilters`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ============================
// Cache management
// ============================

/**
 * Lấy active filters với cache.
 * Ưu tiên API, fallback cache, cuối cùng trả về rỗng.
 */
export async function getCachedActiveFilters(): Promise<NotificationFilterData[]> {
  // Thử đọc từ cache trước
  const cached = await readFilterCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.filters;
  }

  // Fetch từ API
  try {
    const filters = await getActiveFilters();
    await writeFilterCache(filters);
    return filters;
  } catch {
    // API fail → dùng cache cũ nếu có
    if (cached) return cached.filters;
    return [];
  }
}

/** Xóa cache để force refresh lần tiếp theo */
export async function invalidateFilterCache(): Promise<void> {
  await AsyncStorage.removeItem(FILTER_CACHE_KEY);
}

async function readFilterCache(): Promise<FilterCache | null> {
  const json = await AsyncStorage.getItem(FILTER_CACHE_KEY);
  if (!json) return null;
  return JSON.parse(json) as FilterCache;
}

async function writeFilterCache(filters: NotificationFilterData[]): Promise<void> {
  const cache: FilterCache = { filters, timestamp: Date.now() };
  await AsyncStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(cache));
}

// ============================
// Filter logic (dùng trong headless task)
// ============================

/**
 * Kiểm tra notification có nên bị bỏ qua không.
 * Dùng cached filters thay vì hardcode.
 */
export async function shouldIgnoreNotification(data: {
  app: string;
  title: string;
  text: string;
  bigText: string;
  subText: string;
  flags?: number;
  summaryText?: string;
}): Promise<boolean> {
  const filters = await getCachedActiveFilters();

  const packages = filters.filter(f => f.filterType === 'package');
  const keywords = filters.filter(f => f.filterType === 'keyword');
  const flagFilters = filters.filter(f => f.filterType === 'flag');

  // 1. Check package blacklist
  if (packages.some(f => f.filterValue === data.app)) {
    return true;
  }

  // 2. Check keyword blacklist
  const combined = `${data.title || ''} ${data.text || ''} ${data.bigText || ''} ${data.subText || ''}`.toLowerCase();
  if (keywords.some(f => combined.includes(f.filterValue.toLowerCase()))) {
    return true;
  }

  // 3. Check Android notification flags
  if (data.flags != null && data.flags > 0) {
    for (const f of flagFilters) {
      const bit = FLAG_NAME_TO_BIT[f.filterValue];
      if (bit && (data.flags & bit) !== 0) {
        return true;
      }
    }
  }

  if(!data.bigText && !data.text && !data.summaryText){
    return true;
  }

  return false;
}
