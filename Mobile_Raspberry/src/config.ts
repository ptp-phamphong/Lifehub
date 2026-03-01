// Dynamic API URL - tự chuyển theo môi trường giống Angular
// __DEV__ = true khi chạy dev (expo start), false khi build production
import { environment as devEnv } from './environments/environment';
import { environment as prodEnv } from './environments/environment.prod';

const currentEnv = __DEV__ ? devEnv : prodEnv;

// URL có thể thay đổi runtime từ Settings screen
let _apiBaseUrl = currentEnv.apiBaseUrl;

/** Lấy API base URL hiện tại */
export function getApiBaseUrl(): string {
  return _apiBaseUrl;
}

/** Thay đổi API base URL runtime (dùng trong Settings) */
export function setApiBaseUrl(url: string): void {
  _apiBaseUrl = url;
}

/** Reset về URL mặc định theo môi trường */
export function resetApiBaseUrl(): void {
  _apiBaseUrl = currentEnv.apiBaseUrl;
}

/** Kiểm tra có đang dùng production không */
export function isProduction(): boolean {
  return currentEnv.production;
}

// Backward compatible - nhưng KHÔNG dynamic, dùng getApiBaseUrl() thay thế
/** @deprecated Dùng getApiBaseUrl() để có URL dynamic */
export const API_BASE_URL = _apiBaseUrl;
