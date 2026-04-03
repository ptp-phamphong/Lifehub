import { NativeModules, Platform } from 'react-native';

const { AppInfoModule } = NativeModules;

/**
 * Cache tên app và icon trong memory.
 * Tránh gọi native module nhiều lần cho cùng package name.
 */
const nameCache = new Map<string, string>();
const iconCache = new Map<string, string>();

/**
 * Lấy tên hiển thị của app từ package name.
 * Ví dụ: "com.facebook.orca" → "Messenger"
 *
 * Sử dụng Android PackageManager.getApplicationLabel().
 * Kết quả được cache trong memory.
 */
export async function getAppName(packageName: string): Promise<string> {
  if (Platform.OS !== 'android') return packageName;

  const cached = nameCache.get(packageName);
  if (cached) return cached;

  try {
    if (AppInfoModule?.getAppName) {
      const name: string = await AppInfoModule.getAppName(packageName);
      nameCache.set(packageName, name);
      return name;
    }
  } catch (e) {
    console.warn('getAppName error:', e);
  }

  return packageName;
}

/**
 * Lấy icon của app dưới dạng base64 PNG.
 * Kết quả được cache trong memory.
 */
export async function getAppIcon(packageName: string): Promise<string> {
  if (Platform.OS !== 'android') return '';

  const cached = iconCache.get(packageName);
  if (cached !== undefined) return cached;

  try {
    if (AppInfoModule?.getAppIcon) {
      const icon: string = await AppInfoModule.getAppIcon(packageName);
      iconCache.set(packageName, icon);
      return icon;
    }
  } catch (e) {
    console.warn('getAppIcon error:', e);
  }

  iconCache.set(packageName, '');
  return '';
}

export interface AppInfo {
  name: string;
  icon: string;       // base64 PNG
  packageName: string;
}

/**
 * Lấy cả tên + icon trong 1 lần gọi native.
 * Hiệu quả hơn gọi getAppName + getAppIcon riêng.
 */
export async function getAppInfo(packageName: string): Promise<AppInfo> {
  if (Platform.OS !== 'android') {
    return { name: packageName, icon: '', packageName };
  }

  // Nếu đã có cả 2 trong cache
  const cachedName = nameCache.get(packageName);
  const cachedIcon = iconCache.get(packageName);
  if (cachedName && cachedIcon !== undefined) {
    return { name: cachedName, icon: cachedIcon, packageName };
  }

  try {
    if (AppInfoModule?.getAppInfo) {
      const result = await AppInfoModule.getAppInfo(packageName);
      nameCache.set(packageName, result.name);
      iconCache.set(packageName, result.icon);
      return result as AppInfo;
    }
  } catch (e) {
    console.warn('getAppInfo error:', e);
  }

  return { name: packageName, icon: '', packageName };
}

/**
 * Batch resolve thông tin của nhiều app cùng lúc.
 * Dùng cho màn hình hiển thị danh sách notifications.
 */
export async function resolveAppInfoBatch(
  packageNames: string[]
): Promise<Map<string, AppInfo>> {
  const result = new Map<string, AppInfo>();
  const unique = [...new Set(packageNames)];

  const promises = unique.map(async (pkg) => {
    const info = await getAppInfo(pkg);
    result.set(pkg, info);
  });

  await Promise.all(promises);
  return result;
}
