import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useAuth } from '../src/AuthContext';
import { colors, radius } from '../src/theme';
import WaveBackground from '../src/components/WaveBackground';

// Same visual language as login.js -- see that file's comment for why the
// Google button and the segmented pill behave the way they do.
function notAvailable(feature) {
  Alert.alert('Not available yet', `${feature} isn't set up yet -- coming in a future update.`);
}

export default function Register() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await register(email, password);
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WaveBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Ionicons name="trending-up" size={20} color="#fff" />
          </View>
          <Text style={styles.brandText}>Landed</Text>
        </View>

        <Text style={styles.title}>
          Start your search,{'\n'}
          <Text style={styles.titleAccent}>stay organized.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Track every application in one place -- applied, interviewing, offers.
        </Text>

        <View style={styles.segment}>
          <Pressable style={styles.segmentBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.segmentText}>Log in</Text>
          </Pressable>
          <View style={[styles.segmentBtn, styles.segmentBtnActive]}>
            <Text style={styles.segmentTextActive}>Create account</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Ionicons name="mail-outline" size={18} color={colors.faint} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.faint} style={styles.fieldIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={colors.faint}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.faint} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
          {!submitting && <Ionicons name="arrow-forward" size={16} color="#fff" />}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.googleBtn} onPress={() => notAvailable('Google sign-in')}>
          <AntDesign name="google" size={16} color={colors.text} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    // paddingTop is overridden inline above from useSafeAreaInsets(); this
    // is just the fallback if that were ever omitted.
    paddingTop: 56,
    paddingBottom: 48,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 24,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#ece9fb',
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm - 2,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  fieldIcon: {
    marginTop: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.faint,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    marginTop: 24,
    fontSize: 11,
    color: colors.faint,
    textAlign: 'center',
    lineHeight: 16,
  },
});
