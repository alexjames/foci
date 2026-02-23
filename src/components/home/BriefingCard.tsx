import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist, isDueOnDate } from '@/src/hooks/useChecklist';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DeadlineTrackerConfig, HabitTrackerConfig, RoutinesConfig, EventsConfig, EventRecurrence } from '@/src/types';

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

interface BriefingRowProps {
  count: number;
  label: string;
  toolId: string;
}

function BriefingRow({ count, label, toolId }: BriefingRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  if (count === 0) return null;

  const destination = toolId === 'checklist'
    ? '/checklist'
    : `/tool/${toolId}`;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push(destination as any)}
        style={({ pressed }) => [styles.countPill, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.countText, { color: colors.tint }]}>{count}</Text>
      </Pressable>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

export function BriefingCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const greeting = useMemo(() => getGreeting(), []);

  // To-do: pending items today
  const { getItemsForDate, isCompleted } = useChecklist();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const todayItems = useMemo(() => getItemsForDate(today), [getItemsForDate, today]);
  const pendingTodos = useMemo(
    () => todayItems.filter((item) => !isCompleted(item.id, today)).length,
    [todayItems, isCompleted, today]
  );

  // Deadlines: upcoming (not past)
  const { config: deadlineConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');
  const upcomingDeadlines = useMemo(() => {
    const deadlines = deadlineConfig?.deadlines ?? [];
    return deadlines.filter((d) => getDaysUntil(d.date) >= 0).length;
  }, [deadlineConfig]);

  // Routines
  const { config: routinesConfig } = useToolConfig<RoutinesConfig>('routines');
  const routineCount = routinesConfig?.routines?.length ?? 0;

  // Habits
  const { config: habitConfig } = useToolConfig<HabitTrackerConfig>('streak-tracker');
  const habitCount = habitConfig?.habits?.length ?? 0;

  // Events: upcoming in the next 30 days
  const { config: eventsConfig } = useToolConfig<EventsConfig>('events');
  const upcomingEvents = useMemo(() => {
    const events = eventsConfig?.events ?? [];
    return events.filter((e) => {
      const days = getDaysUntilNextOccurrence(e.date, e.recurrence);
      return days >= 0 && days <= 30;
    }).length;
  }, [eventsConfig]);

  const hasAny = pendingTodos > 0 || upcomingDeadlines > 0 || routineCount > 0 || habitCount > 0 || upcomingEvents > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.greeting, { color: colors.secondaryText }]}>{greeting}</Text>
      {hasAny && (
        <>
          <Text style={[styles.subheading, { color: colors.secondaryText }]}>You have</Text>
          <View style={styles.rows}>
            <BriefingRow count={pendingTodos} label="to-do items pending" toolId="checklist" />
            <BriefingRow count={upcomingDeadlines} label="deadlines upcoming" toolId="deadline-tracker" />
            <BriefingRow count={upcomingEvents} label="events coming up" toolId="events" />
            <BriefingRow count={routineCount} label="routines to get to" toolId="routines" />
            <BriefingRow count={habitCount} label="habits to work on" toolId="streak-tracker" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  greeting: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    marginBottom: 2,
  },
  subheading: {
    fontSize: Layout.fontSize.body,
    marginBottom: Layout.spacing.md,
  },
  rows: {
    gap: Layout.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  countPill: {
    minWidth: 32,
    alignItems: 'center',
  },
  countText: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
  rowLabel: {
    fontSize: Layout.fontSize.body,
  },
});
