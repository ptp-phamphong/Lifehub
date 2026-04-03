export interface NotificationData {
  id?: number;
  app: string;       // package name (e.g., com.facebook.orca)
  appName?: string;  // tên hiển thị (e.g., Messenger)
  title: string;
  text: string;
  time: string;
  createdDate?: string;
}
