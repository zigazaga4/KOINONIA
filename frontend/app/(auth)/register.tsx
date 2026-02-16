import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import { useRouter } from 'expo-router';
import { KoinoniaColors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

export default function RegisterScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn('password', { email, password, name, flow: 'signUp' });
    } catch (e: any) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>Koinonia</Text>
            <Text style={styles.subtitle}>Join the Fellowship</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Create Account</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={KoinoniaColors.warmGray}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={KoinoniaColors.warmGray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={KoinoniaColors.warmGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={KoinoniaColors.warmGray}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={KoinoniaColors.lightText} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
            >
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.verse}>
            "Therefore, if anyone is in Christ,{'\n'}the new creation has come."
            {'\n'}— 2 Corinthians 5:17
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appName: {
    fontSize: 44,
    fontFamily: Fonts.appTitle,
    color: KoinoniaColors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.headingItalic,
    color: KoinoniaColors.warmGray,
    marginTop: 4,
  },
  form: {
    backgroundColor: KoinoniaColors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.headingSemiBold,
    color: KoinoniaColors.darkBrown,
    marginBottom: 20,
  },
  error: {
    color: KoinoniaColors.error,
    fontFamily: Fonts.body,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.label,
    color: KoinoniaColors.darkBrown,
    marginBottom: 6,
  },
  input: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.input,
    color: KoinoniaColors.darkBrown,
  },
  button: {
    backgroundColor: KoinoniaColors.secondary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: KoinoniaColors.lightText,
    fontSize: 17,
    fontFamily: Fonts.button,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: KoinoniaColors.warmGray,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  linkTextBold: {
    color: KoinoniaColors.secondary,
    fontFamily: Fonts.bodySemiBold,
  },
  verse: {
    textAlign: 'center',
    color: KoinoniaColors.warmGray,
    fontFamily: Fonts.verse,
    fontSize: 14,
    marginTop: 40,
    lineHeight: 22,
  },
});
