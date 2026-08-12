import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/AuthContext';

// The root stack: auth screens (login/register) and the authenticated
// group as siblings. Which one the user actually lands on is decided by
// the (app) group's own layout -- see app/(app)/_layout.js -- since that's
// where "protected layout route" checks the auth state and redirects.
//
// SafeAreaProvider has to be outermost (above everything that might call
// useSafeAreaInsets()) -- it was listed as a dependency from the original
// scaffold but never actually mounted anywhere, which is the root cause of
// every screen's header sitting under the iOS status bar/notch: without
// it, every screen fell back to hardcoded paddingTop guesses instead of
// the device's real inset.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
