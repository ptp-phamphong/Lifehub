import { getApiBaseUrl } from '../config';
import { Platform } from 'react-native';
import { getToken } from './authService';

export interface SpeechToTextResult {
  text: string;
}

/**
 * Gửi file audio lên backend để chuyển thành text (Azure OpenAI Whisper).
 * @param fileUri - URI của file audio trên device
 * @param fileName - Tên file (vd: recording.m4a)
 * @param mimeType - MIME type (vd: audio/m4a)
 */
export async function transcribeAudio(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<SpeechToTextResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // Web: convert URI thành Blob rồi append
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append('audioFile', blob, fileName);
  } else {
    // React Native (Android/iOS): dùng object {uri, name, type}
    formData.append('audioFile', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);
  }

  const token = await getToken();
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}/SpeechToText`, {
    method: 'POST',
    body: formData,
    headers: authHeaders,
    // Không set Content-Type header - fetch tự thêm boundary cho multipart
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorBody}`);
  }

  return res.json();
}
