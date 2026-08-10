import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/AuthContext';

// The root stack: auth screens (login/register) and the tab group as
// siblings. Which one the user actually lands on is decided by the
// (tabs) group's own layout -- see app/(tabs)/_layout.js -- since that's
// where "protected layout route" checks the auth state and redirects.
export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
