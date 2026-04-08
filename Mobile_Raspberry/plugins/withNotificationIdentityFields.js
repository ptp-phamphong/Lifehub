const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patch react-native-android-notification-listener để expose định danh notification chuẩn:
 * - notificationKey: StatusBarNotification.getKey()
 * - notificationId: StatusBarNotification.getId()
 * - notificationTag: StatusBarNotification.getTag()
 *
 * Lưu ý: plugin chạy trong prebuild/eas build. Sau khi thay đổi plugin cần build APK mới.
 */
function withNotificationIdentityFields(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const rnNotificationPath = path.join(
        projectRoot,
        'node_modules',
        'react-native-android-notification-listener',
        'android',
        'src',
        'main',
        'java',
        'com',
        'lesimoes',
        'androidnotificationlistener',
        'RNNotification.java'
      );

      if (!fs.existsSync(rnNotificationPath)) {
        throw new Error(
          '[withNotificationIdentityFields] RNNotification.java not found. Build stopped to avoid silent null identity fields.'
        );
      }

      let content = fs.readFileSync(rnNotificationPath, 'utf8');
      let changed = false;

      if (!content.includes('protected String notificationKey;')) {
        const fieldsAnchor = /(protected\s+String\s+iconLarge\s*;)/;
        if (!fieldsAnchor.test(content)) {
          throw new Error(
            '[withNotificationIdentityFields] Could not find iconLarge field anchor to inject identity fields.'
          );
        }

        content = content.replace(
          fieldsAnchor,
          `$1
    protected String notificationKey;
    protected String notificationId;
    protected String notificationTag;
    protected ArrayList<String> messageSignatures;`
        );
        changed = true;
      }

      if (!content.includes('this.notificationKey = sbn.getKey();')) {
        const assignmentAnchor = /(this\.time\s*=\s*Long\.toString\(sbn\.getPostTime\(\)\)\s*;)/;
        if (!assignmentAnchor.test(content)) {
          throw new Error(
            '[withNotificationIdentityFields] Could not find postTime assignment anchor to inject identity assignment.'
          );
        }

        content = content.replace(
          assignmentAnchor,
          `$1
            this.notificationKey = sbn.getKey();
            this.notificationId = Integer.toString(sbn.getId());
            this.notificationTag = sbn.getTag();
            this.messageSignatures = this.getMessageSignatures(notification);`
        );
        changed = true;
      }

      if (!content.includes('private ArrayList<String> getMessageSignatures(Notification notification)')) {
        const methodAnchor = /private String getPropertySafely\(Notification notification, String propKey\) \{/;
        if (!methodAnchor.test(content)) {
          throw new Error(
            '[withNotificationIdentityFields] Could not find getPropertySafely anchor to inject message signatures helper.'
          );
        }

        const helperMethod = [
          '    private ArrayList<String> getMessageSignatures(Notification notification) {',
          '        ArrayList<String> result = new ArrayList<String>();',
          '',
          '        try {',
          '            android.os.Parcelable[] parcelables = notification.extras.getParcelableArray(Notification.EXTRA_MESSAGES);',
          '            if (parcelables == null || parcelables.length == 0) return result;',
          '',
          '            java.util.List<Notification.MessagingStyle.Message> messages =',
          '                Notification.MessagingStyle.Message.getMessagesFromBundleArray(parcelables);',
          '',
          '            for (Notification.MessagingStyle.Message message : messages) {',
          '                if (message == null) continue;',
          '',
          '                CharSequence textValue = message.getText();',
          '                CharSequence senderValue = message.getSender();',
          '                long timestamp = message.getTimestamp();',
          '',
          '                String safeText = textValue == null ? "" : textValue.toString().trim();',
          '                String safeSender = senderValue == null ? "" : senderValue.toString().trim();',
          '',
          '                result.add(Long.toString(timestamp) + "|" + safeSender + "|" + safeText);',
          '            }',
          '',
          '            return result;',
          '        } catch (Exception e) {',
          '            Log.d(TAG, e.getMessage());',
          '            return result;',
          '        }',
          '    }',
          '',
          '    private String getPropertySafely(Notification notification, String propKey) {'
        ].join('\n');

        content = content.replace(methodAnchor, helperMethod);
        changed = true;
      }

      if (!content.includes('protected String notificationKey;') || !content.includes('this.notificationKey = sbn.getKey();')) {
        throw new Error(
          '[withNotificationIdentityFields] Patch verification failed. notificationKey injection missing.'
        );
      }

      if (changed) {
        fs.writeFileSync(rnNotificationPath, content, 'utf8');
        console.log('[withNotificationIdentityFields] Patched RNNotification.java successfully');
      } else {
        console.log('[withNotificationIdentityFields] RNNotification.java already patched');
      }

      return modConfig;
    },
  ]);
}

module.exports = withNotificationIdentityFields;
