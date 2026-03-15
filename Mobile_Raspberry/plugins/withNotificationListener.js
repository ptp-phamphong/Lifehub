const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo config plugin: đăng ký NotificationListenerService cho Android.
 *
 * Plugin này thêm service vào AndroidManifest.xml để app có thể nhận
 * tất cả notification từ các app khác (Messenger, Facebook, ngân hàng...).
 *
 * Yêu cầu: user phải cấp quyền "Notification Access" trong Settings Android.
 */
function withNotificationListener(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;

    // Thêm xmlns:tools để dùng tools:replace
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.manifest.application[0];

    // Giải quyết conflict: react-native-android-notification-listener set allowBackup=false
    // còn app mặc định set allowBackup=true -> cần khai báo app giữ giá trị của mình
    application.$['tools:replace'] = application.$['tools:replace']
      ? application.$['tools:replace'] + ',android:allowBackup'
      : 'android:allowBackup';

    if (!application.service) {
      application.service = [];
    }

    const serviceName =
      'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerService';

    const serviceExists = application.service.some(
      (s) => s.$['android:name'] === serviceName
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:label': 'Notification Listener',
          'android:permission':
            'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return modConfig;
  });
}

module.exports = withNotificationListener;
