import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider, useAuthToken } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from '@/components/useColorScheme';
import { KoinoniaColors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { PresentationProvider } from '@/contexts/PresentationContext';
import {
  useFonts as useLora,
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string
);

// Token storage — only needed for React Native (web defaults to localStorage)
const nativeStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loraLoaded] = useLora({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_400Regular_Italic,
  });

  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const loaded = loraLoaded && interLoaded;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  // Use useAuthToken() directly — useConvexAuth() has a known issue where the
  // WebSocket handshake callback never fires, leaving isAuthenticated=false
  // even though the auth provider has a valid token.
  const token = useAuthToken();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const isAuthenticated = token !== undefined && token !== null;

  // Small delay on mount to let the auth provider load tokens from storage
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, isReady, segments]);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Koinonia</Text>
        <Text style={styles.splashSubtitle}>Fellowship in the Word</Text>
        <ActivityIndicator
          size="large"
          color={KoinoniaColors.primary}
          style={styles.splashSpinner}
        />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ConvexAuthProvider client={convex} storage={Platform.OS !== 'web' ? nativeStorage : undefined}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PresentationProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthGuard>
        </PresentationProvider>
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: KoinoniaColors.warmWhite,
  },
  splashTitle: {
    fontSize: 44,
    fontFamily: Fonts.appTitle,
    color: KoinoniaColors.primary,
    letterSpacing: 2,
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.headingItalic,
    color: KoinoniaColors.warmGray,
    marginTop: 4,
  },
  splashSpinner: {
    marginTop: 32,
  },
});
