import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { transcribeAudio } from '../services/speechToTextService';

export default function SpeechToTextScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Bắt đầu ghi âm */
  const startRecording = async () => {
    try {
      // Xin quyền microphone
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Cần quyền truy cập microphone để ghi âm.');
        return;
      }

      // Cấu hình audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Tạo recording mới
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setTranscribedText('');

      // Timer đếm giây
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      Alert.alert('Lỗi ghi âm', error.message);
    }
  };

  /** Dừng ghi âm và gửi lên server */
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      // Dừng timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      setIsTranscribing(true);

      // Dừng recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Lỗi', 'Không tìm thấy file ghi âm.');
        setIsTranscribing(false);
        return;
      }

      // Gửi file audio lên backend
      const result = await transcribeAudio(uri, 'recording.m4a', 'audio/m4a');
      setTranscribedText(result.text);
    } catch (error: any) {
      Alert.alert('Lỗi transcribe', error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  /** Format thời gian mm:ss */
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎤 Speech to Text</Text>
      <Text style={styles.subtitle}>
        Nhấn nút để ghi âm, hệ thống sẽ chuyển giọng nói thành văn bản.
      </Text>

      {/* Nút ghi âm */}
      <View style={styles.recordSection}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
        >
          <Text style={styles.recordButtonIcon}>
            {isRecording ? '⏹' : '🎙'}
          </Text>
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
          </Text>
        </TouchableOpacity>

        {/* Hiện thời gian ghi */}
        {isRecording && (
          <View style={styles.durationContainer}>
            <Text style={styles.recordingIndicator}>● REC</Text>
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)}
            </Text>
          </View>
        )}
      </View>

      {/* Loading khi đang transcribe */}
      {isTranscribing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d6efd" />
          <Text style={styles.loadingText}>
            Đang chuyển giọng nói thành văn bản...
          </Text>
        </View>
      )}

      {/* Kết quả */}
      {transcribedText !== '' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>📝 Kết quả:</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{transcribedText}</Text>
          </View>
        </View>
      )}
    </ScrollView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 24,
  },
  recordSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#dc3545',
    shadowColor: '#dc3545',
  },
  recordButtonIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  recordingIndicator: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  resultContainer: {
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 100,
  },
  resultText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 24,
  },
});
