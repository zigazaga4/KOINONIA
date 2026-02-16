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
} from 'react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import { useRouter } from 'expo-router';
import { KoinoniaColors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

export default function LoginScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn('password', { email, password, flow: 'signIn' });
    } catch (e: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Koinonia</Text>
          <Text style={styles.subtitle}>Fellowship in the Word</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
              placeholder="Enter your password"
              placeholderTextColor={KoinoniaColors.warmGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={KoinoniaColors.lightText} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkTextBold}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.verse}>
          "For where two or three gather in my name,{'\n'}there am I with them."
          {'\n'}— Matthew 18:20
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
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
    backgroundColor: KoinoniaColors.primary,
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
    color: KoinoniaColors.primary,
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
