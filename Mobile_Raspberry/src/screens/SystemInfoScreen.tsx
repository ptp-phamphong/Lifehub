import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApiBaseUrl } from '../config';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTheme } from '../ThemeContext';

interface SystemInfo {
  cpuTemperature: string;
  ramAvailable: string;
  memoryAvailable: string;
}

export default function SystemInfoScreen() {
  const [result, setResult] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { colors } = useTheme();

  const callApi = async () => {
    setLoading(true);
    setError(null);
    const url = `${getApiBaseUrl()}/SystemInfo`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        setError(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }
      const data: SystemInfo = await response.json();
      setResult(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(`${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    callApi();
  }, []);

  const formatTime = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Thông tin hệ thống</Text>
        <View style={styles.headerRight}>
          {lastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Cập nhật: {formatTime(lastUpdated)}</Text>
          )}
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.primary }]} onPress={callApi} disabled={loading}>
            <Text style={[styles.refreshIcon, loading && styles.refreshIconSpin]}>↻</Text>
            <Text style={styles.refreshText}>{loading ? 'Đang tải...' : 'Làm mới'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LoadingOverlay visible={loading && !result} />

      {/* Cards */}
      {result && (
        <View style={styles.cardsGrid}>
          <View style={[styles.card, { backgroundColor: colors.cardCpuBg, borderColor: colors.cardCpuBorder }]}>
            <Text style={styles.cardIcon}>🌡️</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>NHIỆT ĐỘ CPU</Text>
              <Text style={[styles.cardValue, { color: colors.cardCpuValue }]}>{result.cpuTemperature}°C</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardRamBg, borderColor: colors.cardRamBorder }]}>
            <Text style={styles.cardIcon}>🖥️</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>RAM KHẢ DỤNG</Text>
              <Text style={[styles.cardValue, { color: colors.cardRamValue }]}>{result.ramAvailable}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardStorageBg, borderColor: colors.cardStorageBorder }]}>
            <Text style={styles.cardIcon}>💾</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>BỘ NHỚ TRỐNG</Text>
              <Text style={[styles.cardValue, { color: colors.cardStorageValue }]}>{result.memoryAvailable}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={[styles.errorCard, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.errorText }]}>Không thể kết nối: {error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  // Header
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#94a3b8',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  refreshIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  refreshIconSpin: {
    opacity: 0.6,
  },
  refreshText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  // Cards
  cardsGrid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  cardCpu: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  cardRam: {
    backgroundColor: '#f0f9ff',
    borderColor: '#7dd3fc',
  },
  cardStorage: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  cardIcon: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardValueCpu: {
    color: '#b45309',
  },
  cardValueRam: {
    color: '#0369a1',
  },
  cardValueStorage: {
    color: '#15803d',
  },
  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  errorIcon: {
    fontSize: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
});
