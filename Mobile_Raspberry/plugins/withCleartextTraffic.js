const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const { mkdirSync, writeFileSync } = require('fs');
const { resolve } = require('path');

/**
 * Custom Expo config plugin: cho phép HTTP cleartext traffic tới MỌI domain.
 *
 * Lý do cần plugin này:
 *   - expo-updates tự tạo network_security_config.xml chỉ cho phép cleartext
 *     tới server update của Expo (u.expo.dev).
 *   - File XML này OVERRIDE thuộc tính android:usesCleartextTraffic trong manifest.
 *   - Kết quả: HTTP request tới domain khác (ví dụ DuckDNS) bị Android chặn
 *     với lỗi "network request failed", dù Chrome trên cùng điện thoại vẫn OK
 *     (vì Chrome dùng network stack riêng, không bị ảnh hưởng).
 *
 * Plugin này ghi đè network_security_config.xml để cho phép cleartext tới tất cả domain.
 */
function withCleartextTraffic(config) {
  // Bước 1: Đảm bảo AndroidManifest có usesCleartextTraffic + trỏ tới XML config
  config = withAndroidManifest(config, (modConfig) => {
    const mainApp = modConfig.modResults.manifest.application?.[0];
    if (mainApp) {
      mainApp.$['android:usesCleartextTraffic'] = 'true';
      mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return modConfig;
  });

  // Bước 2: Tạo file network_security_config.xml cho phép cleartext tới mọi domain
  config = withDangerousMod(config, [
    'android',
    (modConfig) => {
      const xmlDir = resolve(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      mkdirSync(xmlDir, { recursive: true });

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
      writeFileSync(resolve(xmlDir, 'network_security_config.xml'), xmlContent);
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withCleartextTraffic;
