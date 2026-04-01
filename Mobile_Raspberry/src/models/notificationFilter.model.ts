export interface NotificationFilterData {
  id?: number;
  filterType: string;   // "package" | "keyword" | "flag"
  filterValue: string;
  description: string;
  isActive: boolean;
  createdDate?: string;
}

// Android notification flag bit values
export const ANDROID_FLAGS = {
  FLAG_ONGOING_EVENT: 0x00000002,       // 2
  FLAG_FOREGROUND_SERVICE: 0x00000040,  // 64
  FLAG_NO_CLEAR: 0x00000020,           // 32
  FLAG_GROUP_SUMMARY: 0x00000200,      // 512
} as const;

// Mapping flag name từ DB → bit value
export const FLAG_NAME_TO_BIT: Record<string, number> = {
  ongoing: ANDROID_FLAGS.FLAG_ONGOING_EVENT,
  foreground_service: ANDROID_FLAGS.FLAG_FOREGROUND_SERVICE,
  no_clear: ANDROID_FLAGS.FLAG_NO_CLEAR,
  group_summary: ANDROID_FLAGS.FLAG_GROUP_SUMMARY,
};
