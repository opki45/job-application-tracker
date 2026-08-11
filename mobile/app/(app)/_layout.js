import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/AuthContext';
import { GmailProvider } from '../../src/GmailContext';
import { colors } from '../../src/theme';

// Still a "protected layout route" (Expo Router's auth-guard pattern) --
// same check as before, just guarding a flat Stack now instead of a
// <Tabs> navigator. The bottom bar you see on most of these screens is
// BottomTabBar, a plain component each screen renders itself -- not a
// React Navigation tab bar -- which is what lets a screen with no tab of
// its own (Analytics) still show a sensible highlight, and lets
// Review Queue / the add-application modal hide the bar entirely. See
// mobile/PLAN.md's Context section for the reasoning.
export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <GmailProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="applications" />
        <Stack.Screen name="application/[id]" />
        <Stack.Screen name="review-queue" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="more" />
        <Stack.Screen name="add-application" options={{ presentation: 'modal' }} />
      </Stack>
    </GmailProvider>
  );
}
