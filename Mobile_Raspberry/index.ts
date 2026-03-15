import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import { handleNotification } from './src/services/notificationService';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Đăng ký headless task để xử lý notification trong background.
// Task này được gọi bởi NotificationListenerService mỗi khi có thông báo mới.
AppRegistry.registerHeadlessTask(
  'RNAndroidNotificationListenerHeadlessJs',
  () => handleNotification
);
