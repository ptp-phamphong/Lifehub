// Khớp với API_Raspberry/Dto/VisitEventDto.cs và VisitorKnownIpDto.cs

export enum VisitEventType {
  PageView = 1,
  LoginSuccess = 2,
  LoginFailed = 3
}

export enum VisitArea {
  Portfolio = 1,
  AppLogin = 2
}

export interface VisitEvent {
  id: number;
  eventType: number;
  area: number;
  visitedAt: string;
  visitorId?: string;
  sessionId?: string;
  ipAddress?: string;
  path?: string;
  locale?: string;
  pageTitle?: string;
  referrer?: string;
  referrerDomain?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  isBot: boolean;
  countryCode?: string;
  countryName?: string;
  city?: string;
  language?: string;
  screenWidth?: number;
  screenHeight?: number;
  durationMs?: number;
  detail?: string;
  isSelf: boolean;
  knownLabel?: string;
}

export interface VisitorLogFilter {
  fromDate?: string | null;
  toDate?: string | null;
  area?: number | null;
  eventType?: number | null;
  pathContains?: string | null;
  ipAddress?: string | null;
  visitorId?: string | null;
  countryCode?: string | null;
  excludeSelf: boolean;
  excludeBots: boolean;
  sortColumn: string;
  sortDirection: string;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VisitorCountItem {
  label: string;
  count: number;
}

export interface VisitorDailyPoint {
  date: string;
  views: number;
  visitors: number;
}

export interface VisitorSummary {
  totalViews: number;
  uniqueVisitors: number;
  returningVisitors: number;
  sessions: number;
  avgDurationSeconds: number;
  loginAttempts: number;
  failedLogins: number;
  dailySeries: VisitorDailyPoint[];
  topPages: VisitorCountItem[];
  topReferrers: VisitorCountItem[];
  topCountries: VisitorCountItem[];
  topDevices: VisitorCountItem[];
  topBrowsers: VisitorCountItem[];
}

export interface VisitorProfile {
  visitorId?: string;
  ipAddress?: string;
  firstSeen: string;
  lastSeen: string;
  views: number;
  sessions: number;
  distinctPages: number;
  countryCode?: string;
  countryName?: string;
  city?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  isBot: boolean;
  isSelf: boolean;
  knownLabel?: string;
}

/** Khớp với VisitorLogSettings trong Service/VisitorLogSettingsService.cs */
export interface VisitorLogSettings {
  enabled: boolean;
  retentionDays: number;
  excludeSelfByDefault: boolean;
  excludeBotsByDefault: boolean;
}

export interface VisitorKnownIp {
  id: number;
  ipAddress?: string;
  visitorId?: string;
  label?: string;
  isSelf: boolean;
  createdDate?: string;
}
