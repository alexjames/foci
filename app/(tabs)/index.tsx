import React, { useRef, useState, useMemo } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { BriefingCard } from '@/src/components/home/BriefingCard';

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dateText = useMemo(() => formatDate(new Date()), []);

  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.parallel([
      Animated.spring(expandAnim, { toValue, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(rotateAnim, { toValue, duration: 200, useNativeDriver: true }),
    ]).start();
    setExpanded(!expanded);
  };

  const closeAndNavigate = (path: string) => {
    Animated.parallel([
      Animated.timing(expandAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setExpanded(false);
      router.push(path as any);
    });
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  // Each action item slides up and fades in from below the FAB
  const itemStyle = (offsetIndex: number) => ({
    opacity: expandAnim,
    transform: [
      {
        translateY: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [8 + offsetIndex * 4, 0],
        }),
      },
      {
        scale: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
      },
    ],
  });

  // Tab bar: wrapper bottom:-8, paddingBottom: insets.bottom+4, pill ~49px tall, paddingVertical:8
  // Tab bar top ≈ insets.bottom + 61 from screen bottom.
  // FAB bottom = tab bar top + 4px gap guaranteed.
  const fabBottom = insets.bottom + 70;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: fabBottom + 56 + 15 }]}>
        <View style={styles.dateHeader}>
          <Text style={[styles.dateText, { color: colors.secondaryText }]}>{dateText}</Text>
        </View>
        <BriefingCard />
      </ScrollView>

      {/* Backdrop — dismiss on tap outside */}
      {expanded && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={toggle} />
      )}

      {/* FAB + expanded actions */}
      <View style={[styles.fabArea, { bottom: fabBottom }]}>
        {/* Action: Daily Priming */}
        <Animated.View style={[styles.actionRow, itemStyle(0)]}>
          <Text style={[styles.actionLabel, { color: colors.text, backgroundColor: colors.cardBackground }]}>
            Daily Priming
          </Text>
          <Pressable
            onPress={() => closeAndNavigate('/daily-priming')}
            style={[styles.actionIcon, { backgroundColor: '#F97316' }]}
          >
            <Ionicons name="sunny" size={20} color="#fff" />
          </Pressable>
        </Animated.View>

        {/* Main + FAB */}
        <Pressable onPress={toggle} style={[styles.fab, { backgroundColor: colors.tint }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Layout.spacing.sm,
  },
  dateHeader: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  dateText: {
    fontSize: Layout.fontSize.title,
    textAlign: 'center',
  },
  fabArea: {
    position: 'absolute',
    right: Layout.spacing.lg,
    alignItems: 'flex-end',
    gap: Layout.spacing.md,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  actionLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
