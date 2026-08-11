import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

// Mirrors client/src/components/CompanyLogo.jsx: shows a company's real
// favicon (guessed from its name), falling back to a colored initial if the
// request fails. Same logoUrl construction as the web version, so both
// clients show the same logo for the same company.
const INITIAL_COLORS = ['#5b53e0', '#0ea5e9', '#f59e0b', '#16a34a', '#ec4899', '#8b5cf6', '#ef4444'];

function colorForName(name) {
  const s = name || '?';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

export default function CompanyLogo({ company, size = 40 }) {
  const [error, setError] = useState(false);
  const initial = (company || '?').charAt(0).toUpperCase();
  const domain = (company || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  const showInitial = error || !company;
  const boxStyle = [
    styles.box,
    { width: size, height: size, borderRadius: size * 0.28 },
    showInitial && { backgroundColor: colorForName(company), borderWidth: 0 },
  ];

  if (showInitial) {
    return (
      <View style={boxStyle}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <View style={boxStyle}>
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size * 0.62, height: size * 0.62 }}
        resizeMode="contain"
        onError={() => setError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initial: {
    fontWeight: '800',
    color: '#fff',
  },
});
