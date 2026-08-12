import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Hand-built rather than React Navigation's <Tabs> -- see mobile/PLAN.md's
// Context section for why. Highlight is decided from the current pathname,
// which lets a screen with no tab of its own (Analytics) still light up
// "Dashboard" the way the design shows, instead of fighting a nested
// tab-inside-stack setup for one cosmetic detail.
const ITEMS = [
  { key: 'index', href: '/', icon: 'home-outline', iconActive: 'home', label: 'Dashboard' },
  { key: 'applications', href: '/applications', icon: 'briefcase-outline', iconActive: 'briefcase', label: 'Applications' },
  { key: 'add', href: '/add-application', icon: 'add', label: '' },
  { key: 'calendar', href: '/calendar', icon: 'calendar-outline', iconActive: 'calendar', label: 'Calendar' },
  { key: 'more', href: '/more', icon: 'ellipsis-horizontal', iconActive: 'ellipsis-horizontal', label: 'More' },
];

// Screens with no tab of their own still count as "on" a particular tab for
// highlight purposes.
const ALIAS = {
  '/analytics': '/',
  '/review-queue': '/',
};

export default function BottomTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const activeHref = ALIAS[pathname] || pathname;

  return (
    // Real home-indicator inset (0 on an iPhone SE, ~34 on a Pro) with a
    // sane floor so the bar never looks cramped on a device that has none,
    // instead of the old flat 22px guess.
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
      {ITEMS.map((item) => {
        if (item.key === 'add') {
          return (
            <Pressable key={item.key} style={styles.fab} onPress={() => router.push(item.href)}>
              <Ionicons name={item.icon} size={26} color="#fff" />
            </Pressable>
          );
        }
        const active = activeHref === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={() => router.replace(item.href)}
            hitSlop={6}
          >
            <Ionicons
              name={active ? item.iconActive : item.icon}
              size={22}
              color={active ? colors.primary : colors.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    // paddingBottom is set inline above from useSafeAreaInsets().
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  labelActive: {
    color: colors.primary,
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
