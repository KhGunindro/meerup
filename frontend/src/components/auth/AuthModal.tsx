import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  initialMode = 'login',
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const { signIn, signUp, verifyOtp, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'verify_otp'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (mode === 'forgot_password') {
      setIsLoading(true);
      const { error } = await resetPassword(email);
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Password reset link sent! Check your email inbox.');
      }
      return;
    }

    if (mode === 'verify_otp') {
      if (!otpCode.trim()) {
        setErrorMessage('Please enter the verification code sent to your email');
        return;
      }
      setIsLoading(true);
      const { error } = await verifyOtp(email, otpCode.trim());
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Email verified successfully! Welcome to MEERUP.');
        setTimeout(() => handleClose(), 1000);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }

      setIsLoading(true);
      const { error, data } = await signUp(email, password, fullName);
      setIsLoading(false);

      if (error) {
        setErrorMessage(error.message);
      } else {
        if (data?.session) {
          setSuccessMessage('Account created successfully!');
          setTimeout(() => handleClose(), 1000);
        } else {
          setMode('verify_otp');
          setSuccessMessage('Confirmation code sent! Enter the 6-digit code from your email below:');
        }
      }
      return;
    }

    // Login mode
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Welcome back to MEERUP!');
      setTimeout(() => handleClose(), 600);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.brandRow}>
                  <View style={styles.logoBadge}>
                    <MaterialIcons name="travel-explore" size={20} color="#fff" />
                  </View>
                  <Text style={[styles.brandTitle, { color: colors.text }]}>MEERUP Auth</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Mode Tabs */}
              {mode !== 'forgot_password' && mode !== 'verify_otp' && (
                <View style={[styles.tabBar, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                  <TouchableOpacity
                    style={[styles.tabItem, mode === 'login' && styles.tabItemActive]}
                    onPress={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        mode === 'login' ? styles.tabTextActive : { color: colors.textSecondary },
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabItem, mode === 'signup' && styles.tabItemActive]}
                    onPress={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        mode === 'signup' ? styles.tabTextActive : { color: colors.textSecondary },
                      ]}
                    >
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'verify_otp' && (
                <View style={styles.forgotHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={styles.backToLoginBtn}
                  >
                    <MaterialIcons name="arrow-back" size={18} color="#4777c2" />
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>
                  <Text style={[styles.forgotTitle, { color: colors.text }]}>Confirm Your Email</Text>
                  <Text style={[styles.forgotSubtitle, { color: colors.textSecondary }]}>
                    We sent a verification code to {email}. Enter the 6-digit code below to finish registration:
                  </Text>
                </View>
              )}

              {mode === 'forgot_password' && (
                <View style={styles.forgotHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={styles.backToLoginBtn}
                  >
                    <MaterialIcons name="arrow-back" size={18} color="#4777c2" />
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>
                  <Text style={[styles.forgotTitle, { color: colors.text }]}>Reset Password</Text>
                  <Text style={[styles.forgotSubtitle, { color: colors.textSecondary }]}>
                    Enter your registered email address and we'll send you a password reset link.
                  </Text>
                </View>
              )}

              {/* Notification Banners */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
              {successMessage && (
                <View style={styles.successBanner}>
                  <MaterialIcons name="check-circle" size={18} color="#047857" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              {/* Input Fields */}
              <View style={styles.formContainer}>
                {mode === 'verify_otp' ? (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      6-Digit Confirmation Code
                    </Text>
                    <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
                      <MaterialIcons name="vpn-key" size={20} color="#9CA3AF" />
                      <TextInput
                        style={[styles.textInput, { color: colors.text, fontSize: 18, letterSpacing: 4 }]}
                        placeholder="123456"
                        placeholderTextColor="#9CA3AF"
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoFocus
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 16 }}>
                      You can also click the confirmation link in your Gmail, then return here to sign in.
                    </Text>
                  </View>
                ) : (
                  <>
                    {mode === 'signup' && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
                          <MaterialIcons name="person-outline" size={20} color="#9CA3AF" />
                          <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="e.g. Sanatombi Devi"
                            placeholderTextColor="#9CA3AF"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
                        <MaterialIcons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="explorer@example.com"
                          placeholderTextColor="#9CA3AF"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {mode !== 'forgot_password' && (
                      <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
                          {mode === 'login' && (
                            <TouchableOpacity
                              onPress={() => {
                                setMode('forgot_password');
                                setErrorMessage(null);
                                setSuccessMessage(null);
                              }}
                            >
                              <Text style={styles.forgotLink}>Forgot Password?</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
                          <MaterialIcons name="lock-outline" size={20} color="#9CA3AF" />
                          <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                          <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                            <MaterialIcons
                              name={showPassword ? 'visibility-off' : 'visibility'}
                              size={20}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {mode === 'signup' && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
                          <MaterialIcons name="lock-outline" size={20} color="#9CA3AF" />
                          <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor="#9CA3AF"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'login'
                      ? 'Sign In to MEERUP'
                      : mode === 'signup'
                      ? 'Create Explorer Account'
                      : mode === 'verify_otp'
                      ? 'Verify Code & Sign In'
                      : 'Send Reset Link'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bottom Notice */}
              <Text style={styles.privacyNotice}>
                Protected by Supabase Authentication • End-to-end encrypted
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4777c2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: '#4777c2',
    shadowColor: '#4777c2',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  forgotHeader: {
    marginBottom: 16,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  backToLoginText: {
    fontSize: 13,
    color: '#4777c2',
    fontWeight: '600',
  },
  forgotTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  forgotSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    fontWeight: '500',
  },
  formContainer: {
    gap: 14,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgotLink: {
    fontSize: 12,
    color: '#4777c2',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  submitBtn: {
    backgroundColor: '#4777c2',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4777c2',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  privacyNotice: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 14,
  },
});
