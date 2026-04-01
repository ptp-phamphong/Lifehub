import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApiBaseUrl } from '../config';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Thông tin hệ thống - 2</Text>
        <View style={styles.headerRight}>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>Cập nhật: {formatTime(lastUpdated)}</Text>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={callApi} disabled={loading}>
            <Text style={[styles.refreshIcon, loading && styles.refreshIconSpin]}>↻</Text>
            <Text style={styles.refreshText}>{loading ? 'Đang tải...' : 'Làm mới'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !result && (
        <ActivityIndicator size="large" color="#0ea5e9" style={styles.loader} />
      )}

      {/* Cards */}
      {result && (
        <View style={styles.cardsGrid}>
          <View style={[styles.card, styles.cardCpu]}>
            <Text style={styles.cardIcon}>🌡️</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>NHIỆT ĐỘ CPU</Text>
              <Text style={[styles.cardValue, styles.cardValueCpu]}>{result.cpuTemperature}°C</Text>
            </View>
          </View>

          <View style={[styles.card, styles.cardRam]}>
            <Text style={styles.cardIcon}>🖥️</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>RAM KHẢ DỤNG</Text>
              <Text style={[styles.cardValue, styles.cardValueRam]}>{result.ramAvailable}</Text>
            </View>
          </View>

          <View style={[styles.card, styles.cardStorage]}>
            <Text style={styles.cardIcon}>💾</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>BỘ NHỚ TRỐNG</Text>
              <Text style={[styles.cardValue, styles.cardValueStorage]}>{result.memoryAvailable}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Không thể kết nối: {error}</Text>
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
