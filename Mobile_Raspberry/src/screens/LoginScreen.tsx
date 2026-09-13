import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { login, requestPasswordReset, resetPassword } from '../services/authService';
import { useTheme } from '../ThemeContext';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

// Các bước của luồng quên mật khẩu trong modal.
type ForgotStep = 'request' | 'reset';

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── State cho modal quên mật khẩu ──
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [forgotUsername, setForgotUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotInfo, setForgotInfo] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Vui lòng nhập username và password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(
        err.message === 'Invalid credentials'
          ? 'Tên đăng nhập hoặc mật khẩu không đúng'
          : 'Lỗi kết nối server'
      );
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setForgotStep('request');
    setForgotUsername(username); // tiện: điền sẵn username đang gõ
    setOtp('');
    setNewPassword('');
    setShowNewPassword(false);
    setMaskedEmail('');
    setForgotError('');
    setForgotInfo('');
    setForgotVisible(true);
  };

  const handleRequestOtp = async () => {
    if (!forgotUsername) {
      setForgotError('Vui lòng nhập username');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotInfo('');
    try {
      const res = await requestPasswordReset(forgotUsername);
      setMaskedEmail(res.maskedEmail || '');
      setForgotInfo(res.message || 'Đã gửi mã OTP.');
      setForgotStep('reset');
    } catch (err: any) {
      setForgotError(err.message || 'Không gửi được mã OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      setForgotError('Vui lòng nhập mã OTP và mật khẩu mới');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotInfo('');
    try {
      const msg = await resetPassword(forgotUsername, otp, newPassword);
      setForgotVisible(false);
      setError('');
      // Hiện thông báo thành công ngay trên form đăng nhập.
      setUsername(forgotUsername);
      setPassword('');
      setError(msg + ' Hãy đăng nhập bằng mật khẩu mới.');
    } catch (err: any) {
      setForgotError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>🔒 Đăng nhập</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          LifeHub Expense Tracker
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Tên đăng nhập"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Ô mật khẩu + nút hiện/ẩn để người dùng nhìn được ký tự đang gõ */}
        <View style={[styles.passwordRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="Mật khẩu"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotLink} onPress={openForgot} disabled={loading}>
          <Text style={[styles.forgotLinkText, { color: colors.primary }]}>Quên mật khẩu?</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal quên mật khẩu ── */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.card, styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>🔐 Quên mật khẩu</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {forgotStep === 'request'
                ? 'Nhập username để nhận mã OTP qua email'
                : `Nhập mã OTP đã gửi tới ${maskedEmail || 'email của bạn'}`}
            </Text>

            {forgotError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{forgotError}</Text>
              </View>
            ) : null}

            {forgotInfo && !forgotError ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{forgotInfo}</Text>
              </View>
            ) : null}

            {forgotStep === 'request' ? (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Tên đăng nhập"
                  placeholderTextColor={colors.textSecondary}
                  value={forgotUsername}
                  onChangeText={setForgotUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!forgotLoading}
                />
                <TouchableOpacity
                  style={[styles.button, forgotLoading && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Gửi mã OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Mã OTP (6 số)"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!forgotLoading}
                />
                <View style={[styles.passwordRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholder="Mật khẩu mới"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    editable={!forgotLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword((v) => !v)}
                    accessibilityLabel={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <Text style={styles.eyeIcon}>{showNewPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.button, forgotLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={handleRequestOtp}
                  disabled={forgotLoading}
                >
                  <Text style={[styles.forgotLinkText, { color: colors.primary }]}>Gửi lại mã</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => setForgotVisible(false)}
              disabled={forgotLoading}
            >
              <Text style={[styles.forgotLinkText, { color: colors.textSecondary }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#ffeaea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#e6f4ea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#1b7f3b',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  // Hàng chứa ô mật khẩu + nút con mắt
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eyeIcon: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#4a90d9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    maxWidth: 400,
  },
});
