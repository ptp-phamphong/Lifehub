import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';

interface SystemInfo {
  cpuTemperature: string;
  ramAvailable: string;
  memoryAvailabel: string;
}

export default function SystemInfoScreen() {
  const [result, setResult] = useState<SystemInfo | { error: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const callApi = async () => {
    setLoading(true);
    const url = `${API_BASE_URL}/SystemInfo`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        setResult({ error: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }
      const data: SystemInfo = await response.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: `${err.message} (URL: ${url})` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 System Info</Text>

      <TouchableOpacity style={styles.button} onPress={callApi} disabled={loading}>
        <Text style={styles.buttonText}>Show Info</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#0d6efd" style={styles.loader} />}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
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
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  resultBox: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#212529',
  },
});
