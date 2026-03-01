import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, isProduction } from '../config';

export default function SettingsScreen() {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = urlInput.trim().replace(/\/+$/, ''); // bỏ trailing slash
    if (!trimmed) {
      Alert.alert('Lỗi', 'URL không được để trống');
      return;
    }
    setApiBaseUrl(trimmed);
    setUrlInput(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetApiBaseUrl();
    setUrlInput(getApiBaseUrl());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    try {
      const res = await fetch(`${urlInput.trim().replace(/\/+$/, '')}/SystemInfo`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        Alert.alert('Thành công ✅', `Kết nối tới server thành công!\nHTTP ${res.status}`);
      } else {
        Alert.alert('Lỗi ❌', `Server trả về HTTP ${res.status}`);
      }
    } catch (err: any) {
      Alert.alert('Lỗi kết nối ❌', err.message || 'Không thể kết nối tới server');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Cài đặt</Text>

      {/* Environment Badge */}
      <View style={styles.envBadge}>
        <Text style={styles.envText}>
          {isProduction() ? '🟢 Production' : '🟡 Development'}
        </Text>
      </View>

      {/* API URL Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Base URL</Text>
        <Text style={styles.hint}>
          Thay đổi URL để test với backend khác (local, Pi, ...)
        </Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://localhost:5293"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
            <Text style={styles.btnText}>💾 Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleReset}>
            <Text style={styles.btnSecondaryText}>↩️ Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSuccess} onPress={handleTestConnection}>
            <Text style={styles.btnText}>🔗 Test</Text>
          </TouchableOpacity>
        </View>

        {saved && (
          <Text style={styles.savedText}>✅ Đã lưu thành công!</Text>
        )}
      </View>

      {/* Current URL Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>URL hiện tại</Text>
        <View style={styles.urlDisplay}>
          <Text style={styles.urlText} selectable>{getApiBaseUrl()}</Text>
        </View>
      </View>

      {/* Quick URLs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>URL nhanh</Text>
        {[
          { label: 'Local Windows', url: 'http://localhost:5293' },
          { label: 'Raspberry Pi (DuckDNS)', url: 'http://ptp-phamphong-pi.duckdns.org:3036/api' },
          { label: 'Raspberry Pi (Tailscale)', url: 'http://100.77.237.60:5000' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.quickUrl}
            onPress={() => setUrlInput(item.url)}
          >
            <Text style={styles.quickUrlLabel}>{item.label}</Text>
            <Text style={styles.quickUrlValue}>{item.url}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: 8,
  },
  envBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  envText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    color: '#212529',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#0d6efd',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  btnSuccess: {
    flex: 1,
    backgroundColor: '#198754',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnSecondaryText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 14,
  },
  savedText: {
    color: '#198754',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  urlDisplay: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  urlText: {
    fontSize: 13,
    color: '#495057',
    fontFamily: 'monospace',
  },
  quickUrl: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  quickUrlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d6efd',
  },
  quickUrlValue: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
