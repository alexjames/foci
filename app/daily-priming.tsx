import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useGoals } from '@/src/hooks/useGoals';
import { useChecklist } from '@/src/hooks/useChecklist';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import {
  PrioritiesConfig,
  HabitTrackerConfig,
  DeadlineTrackerConfig,
  EventsConfig,
  EventRecurrence,
  IdentitiesConfig,
} from '@/src/types';
import { getTaskEmoji } from '@/src/utils/taskEmoji';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntilNextOccurrence(dateStr: string, recurrence?: EventRecurrence): number {
  const now = new Date();
  const target = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const rec = recurrence ?? { type: 'none' };

  if (rec.type === 'none') {
    return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (rec.type === 'annually') {
    const thisYear = new Date(now.getFullYear(), target.getMonth(), target.getDate());
    const next = thisYear >= todayStart ? thisYear : new Date(now.getFullYear() + 1, target.getMonth(), target.getDate());
    return Math.round((next.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (rec.type === 'monthly') {
    const dayOfMonth = target.getDate();
    let candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (candidate < todayStart) candidate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    return Math.round((candidate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (rec.type === 'every-x-months') {
    const intervalMs = rec.months * 30 * 24 * 60 * 60 * 1000;
    let next = new Date(targetStart);
    while (next < todayStart) next = new Date(next.getTime() + intervalMs);
    return Math.round((next.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (rec.type === 'every-x-days') {
    const intervalMs = rec.days * 24 * 60 * 60 * 1000;
    let next = new Date(targetStart);
    while (next < todayStart) next = new Date(next.getTime() + intervalMs);
    return Math.round((next.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PrimingItem =
  | { kind: 'text'; value: string }
  | { kind: 'two-line'; title: string; sub: string };

interface PrimingScreenData {
  id: string;
  title: string;
  items: PrimingItem[];
}

// ─── Per-Screen Component ─────────────────────────────────────────────────────

function PrimingScreen({
  screen,
  isCurrent,
  topInset,
}: {
  screen: PrimingScreenData;
  isCurrent: boolean;
  topInset: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const itemOpacities = useRef(screen.items.map(() => new Animated.Value(0)));

  // If items array length changes (shouldn't normally), re-sync ref
  while (itemOpacities.current.length < screen.items.length) {
    itemOpacities.current.push(new Animated.Value(0));
  }
  const opacities = itemOpacities.current.slice(0, screen.items.length);

  useEffect(() => {
    if (!isCurrent) {
      titleOpacity.setValue(0);
      opacities.forEach((o) => o.setValue(0));
      return;
    }

    Animated.sequence([
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.stagger(
        200,
        opacities.map((o) =>
          Animated.timing(o, { toValue: 1, duration: 400, useNativeDriver: true })
        )
      ),
    ]).start();
  }, [isCurrent]);

  // Close button bottom: topInset + 12 (top) + 36 (height) = topInset + 48, plus 24px spacing
  const contentTop = topInset + 48 + 24;

  return (
    <ScrollView
      style={[styles.screen, { width: SCREEN_WIDTH }]}
      contentContainerStyle={{ paddingTop: contentTop, paddingBottom: Layout.spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Text style={[styles.screenTitle, { color: colors.text, opacity: titleOpacity }]}>
        {screen.title}
      </Animated.Text>
      <View style={styles.itemList}>
        {screen.items.map((item, index) => (
          <Animated.View key={index} style={{ opacity: opacities[index] }}>
            {item.kind === 'text' ? (
              <Text style={[styles.itemText, { color: colors.text }]}>{item.value}</Text>
            ) : (
              <View style={styles.twoLineItem}>
                <Text style={[styles.itemText, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.itemSub, { color: colors.secondaryText }]}>{item.sub}</Text>
              </View>
            )}
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DailyPrimingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<PrimingScreenData>>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { goals } = useGoals();

  const { config: prioritiesConfig } = useToolConfig<PrioritiesConfig>('priorities');
  const priorities = prioritiesConfig?.priorities ?? [];

  const { getItemsForDate, isCompleted } = useChecklist();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const pendingTasks = useMemo(
    () => getItemsForDate(today).filter((item) => !isCompleted(item.id, today)),
    [getItemsForDate, isCompleted, today]
  );

  const { config: habitConfig } = useToolConfig<HabitTrackerConfig>('streak-tracker');
  const habits = habitConfig?.habits ?? [];

  const { config: deadlineConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');
  const upcomingDeadlines = useMemo(() => {
    const deadlines = deadlineConfig?.deadlines ?? [];
    return deadlines
      .filter((d) => getDaysUntil(d.date) >= 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [deadlineConfig]);

  const { config: identitiesConfig } = useToolConfig<IdentitiesConfig>('identities');
  const identities = identitiesConfig?.identities ?? [];

  const { config: eventsConfig } = useToolConfig<EventsConfig>('events');
  const upcomingEvents = useMemo(() => {
    const events = eventsConfig?.events ?? [];
    return events
      .map((e) => ({ ...e, daysUntil: getDaysUntilNextOccurrence(e.date, e.recurrence) }))
      .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [eventsConfig]);

  // ── Screen Config ─────────────────────────────────────────────────────────

  const screens = useMemo<PrimingScreenData[]>(() => {
    const result: PrimingScreenData[] = [];

    result.push({
      id: 'welcome',
      title: getGreeting(),
      items: [{ kind: 'text', value: "Let's make today count." }],
    });

    for (const identity of identities) {
      if (identity.affirmations.length > 0) {
        result.push({
          id: `identity-${identity.id}`,
          title: `I am ${identity.title}`,
          items: identity.affirmations.map((a) => ({ kind: 'text' as const, value: a.text })),
        });
      }
    }

    if (goals.length > 0) {
      result.push({
        id: 'goals',
        title: 'Your goals are',
        items: goals.map((g) => ({ kind: 'text', value: `• ${g.name}` })),
      });
    }

    if (priorities.length > 0) {
      result.push({
        id: 'priorities',
        title: 'Your current priorities are',
        items: priorities.map((p, i) => ({ kind: 'text', value: `${i + 1}.  ${p.text}` })),
      });
    }

    if (pendingTasks.length > 0) {
      result.push({
        id: 'tasks',
        title: "Your To-Do's for the day",
        items: pendingTasks.map((t) => ({
          kind: 'text',
          value: `${getTaskEmoji(t.title)}  ${t.title}`,
        })),
      });
    }

    if (habits.length > 0) {
      result.push({
        id: 'habits',
        title: "Habits you're working on",
        items: habits.map((h) => ({ kind: 'text', value: `• ${h.title}` })),
      });
    }

    if (upcomingDeadlines.length > 0) {
      result.push({
        id: 'deadlines',
        title: 'Upcoming deadlines',
        items: upcomingDeadlines.map((d) => {
          const days = getDaysUntil(d.date);
          return {
            kind: 'two-line' as const,
            title: d.title,
            sub: days === 0 ? 'Due today' : `in ${days} day${days !== 1 ? 's' : ''}`,
          };
        }),
      });
    }

    if (upcomingEvents.length > 0) {
      result.push({
        id: 'events',
        title: 'Upcoming events',
        items: upcomingEvents.map((e) => ({
          kind: 'two-line' as const,
          title: e.title,
          sub: e.daysUntil === 0 ? 'Today' : formatEventDate(e.date),
        })),
      });
    }

    return result;
  }, [goals, identities, priorities, pendingTasks, habits, upcomingDeadlines, upcomingEvents]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={screens}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PrimingScreen screen={item} isCurrent={index === currentIndex} topInset={insets.top} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        decelerationRate="fast"
      />

      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        hitSlop={12}
      >
        <Ionicons name="close" size={24} color={colors.secondaryText} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: Layout.spacing.xl,
  },
  screenTitle: {
    fontSize: Layout.fontSize.hero,
    fontWeight: '700',
    marginBottom: Layout.spacing.xl,
    lineHeight: 44,
  },
  itemList: {
    gap: Layout.spacing.md,
  },
  itemText: {
    fontSize: Layout.fontSize.title,
    lineHeight: 30,
  },
  twoLineItem: {
    gap: 4,
  },
  itemSub: {
    fontSize: Layout.fontSize.body,
  },
  closeBtn: {
    position: 'absolute',
    right: Layout.spacing.lg,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
