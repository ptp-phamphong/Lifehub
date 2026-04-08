export interface NotificationData {
  id?: number;
  app: string;       // package name (e.g., com.facebook.orca)
  appName?: string;  // tên hiển thị (e.g., Messenger)
  title: string;
  text: string;
  time: string;       // thời gian hiển thị (localeString)
  androidTime?: string; // Android sbn.getPostTime() (ms) - dùng detect duplicate khi mở bubble
  notificationKey?: string; // Android StatusBarNotification.getKey()
  notificationId?: string; // Android StatusBarNotification.getId()
  notificationTag?: string; // Android StatusBarNotification.getTag()
  createdDate?: string;
}
