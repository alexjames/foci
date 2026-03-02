import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist } from '@/src/hooks/useChecklist';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import {
  DeadlineTrackerConfig, Deadline,
  HabitTrackerConfig, Habit,
  RoutinesConfig, Routine,
  EventsConfig, Event, EventRecurrence,
  PrioritiesConfig, Priority,
} from '@/src/types';
import { DEADLINE_COLORS } from '@/src/constants/tools';
import { getTaskEmoji } from '@/src/utils/taskEmoji';

const CAP = 3;

// ─── Greeting ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ─── Deadline helpers (copied from DeadlineTrackerList) ──────────────────────

function getDeadlineColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
}

function getDaysUntilDeadline(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDeadlineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDaysSubLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'day left';
  if (days > 1) return 'days left';
  if (days === -1) return 'day ago';
  return 'days ago';
}

// ─── Event helpers (copied from EventsList) ───────────────────────────────────

function getEventColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
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

// ─── Habit helpers (copied from StreakTrackerList) ────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLast7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

function getCurrentStreak(completionSet: Set<string>): number {
  let count = 0;
  const today = new Date();
  const todayKey = toDateKey(today);
  const cursor = new Date(today);
  if (!completionSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (count < 3650) {
    if (!completionSet.has(toDateKey(cursor))) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function getHabitColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return '#6DC8A8';
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, toolId }: { icon: string; label: string; toolId: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const destination = toolId === 'checklist' ? '/checklist' : `/tool/${toolId}`;

  return (
    <Pressable
      onPress={() => router.push(destination as any)}
      style={({ pressed }) => [styles.sectionHeader, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon as any} size={14} color={colors.tint} />
      <Text style={[styles.sectionLabel, { color: colors.tint }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.tint} />
    </Pressable>
  );
}

function MoreLink({ count, toolId }: { count: number; toolId: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const destination = toolId === 'checklist' ? '/checklist' : `/tool/${toolId}`;

  return (
    <Pressable
      onPress={() => router.push(destination as any)}
      style={({ pressed }) => [styles.moreLink, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.moreLinkText, { color: colors.tint }]}>+ {count} more</Text>
    </Pressable>
  );
}

// ─── Priorities Section ───────────────────────────────────────────────────────

function PrioritiesSection({ priorities }: { priorities: Priority[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  if (priorities.length === 0) return null;

  return (
    <View>
      <SectionHeader icon="flag-outline" label="PRIORITIES" toolId="priorities" />
      <View style={styles.sectionItems}>
        {priorities.map((priority, index) => (
          <Pressable
            key={priority.id}
            onPress={() => router.push('/tool/priorities' as any)}
            style={({ pressed }) => [styles.itemRow, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.priorityRank, { color: colors.tint }]}>{index + 1}</Text>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{priority.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Tasks Section ────────────────────────────────────────────────────────────

function TasksSection({
  items,
  today,
  toggleCompletion,
}: {
  items: { id: string; title: string }[];
  today: Date;
  toggleCompletion: (itemId: string, date: Date) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  if (items.length === 0) return null;
  const visible = items.slice(0, CAP);
  const extra = items.length - CAP;

  return (
    <View>
      <SectionHeader icon="checkmark-circle-outline" label="TASKS" toolId="checklist" />
      <View style={styles.sectionItems}>
        {visible.map((item) => (
          <View key={item.id} style={[styles.itemRow, { backgroundColor: colors.background }]}>
            <Pressable
              onPress={() => toggleCompletion(item.id, today)}
              hitSlop={8}
              style={[styles.circleCheckbox, { borderColor: colors.secondaryText }]}
            />
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {getTaskEmoji(item.title)} {item.title}
            </Text>
          </View>
        ))}
      </View>
      {extra > 0 && <MoreLink count={extra} toolId="checklist" />}
    </View>
  );
}

// ─── Deadlines Section ────────────────────────────────────────────────────────

function DeadlinesSection({ deadlines }: { deadlines: Deadline[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  if (deadlines.length === 0) return null;
  const visible = deadlines.slice(0, CAP);
  const extra = deadlines.length - CAP;

  return (
    <View>
      <SectionHeader icon="flag-outline" label="DEADLINES" toolId="deadline-tracker" />
      <View style={styles.sectionItems}>
        {visible.map((deadline) => {
          const daysUntil = getDaysUntilDeadline(deadline.date);
          const accentColor = getDeadlineColor(deadline.color, colorScheme);
          return (
            <Pressable
              key={deadline.id}
              onPress={() => router.push('/tool/deadline-tracker' as any)}
              style={({ pressed }) => [styles.itemRow, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.colorStrip, { backgroundColor: accentColor }]} />
              <View style={styles.itemFlex}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{deadline.title}</Text>
                <Text style={[styles.itemSub, { color: colors.secondaryText }]}>{formatDeadlineDate(deadline.date)}</Text>
              </View>
              <View style={styles.daysRight}>
                <Text style={[styles.daysNum, { color: accentColor }]}>{Math.abs(daysUntil)}</Text>
                <Text style={[styles.daysSub, { color: colors.secondaryText }]}>{getDaysSubLabel(daysUntil)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {extra > 0 && <MoreLink count={extra} toolId="deadline-tracker" />}
    </View>
  );
}

// ─── Events Section ───────────────────────────────────────────────────────────

function EventsSection({ events }: { events: Array<Event & { daysUntil: number }> }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  if (events.length === 0) return null;
  const visible = events.slice(0, CAP);
  const extra = events.length - CAP;

  return (
    <View>
      <SectionHeader icon="calendar-outline" label="EVENTS" toolId="events" />
      <View style={styles.sectionItems}>
        {visible.map(({ daysUntil, ...event }) => {
          const accentColor = getEventColor(event.color, colorScheme);
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push('/tool/events' as any)}
              style={({ pressed }) => [styles.itemRow, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.eventIconBubble, { backgroundColor: accentColor + '22' }]}>
                <Ionicons name={event.icon as any} size={18} color={accentColor} />
              </View>
              <View style={styles.itemFlex}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                <Text style={[styles.itemSub, { color: colors.secondaryText }]}>{formatEventDate(event.date)}</Text>
              </View>
              <View style={styles.daysRight}>
                <Text style={[styles.daysNum, { color: accentColor }]}>{daysUntil}</Text>
                <Text style={[styles.daysSub, { color: colors.secondaryText }]}>{daysUntil === 0 ? 'today' : daysUntil === 1 ? 'day to go' : 'days to go'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {extra > 0 && <MoreLink count={extra} toolId="events" />}
    </View>
  );
}

// ─── Routines Section ─────────────────────────────────────────────────────────

function RoutinesSection({ routines }: { routines: Routine[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  if (routines.length === 0) return null;
  const visible = routines.slice(0, CAP);
  const extra = routines.length - CAP;

  return (
    <View>
      <SectionHeader icon="list-outline" label="ROUTINES" toolId="routines" />
      <View style={styles.sectionItems}>
        {visible.map((routine) => {
          const stepCount = routine.orderedCards.length;
          return (
            <Pressable
              key={routine.id}
              onPress={() => router.push(`/routine-detail/${routine.id}` as any)}
              style={({ pressed }) => [styles.itemRow, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.routineIconCircle, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name={routine.icon as any} size={18} color={colors.tint} />
              </View>
              <View style={styles.itemFlex}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{routine.title}</Text>
                <Text style={[styles.itemSub, { color: colors.secondaryText }]}>
                  {stepCount === 0 ? 'No steps yet' : `${stepCount} step${stepCount !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push(`/routine-detail/${routine.id}?play=true` as any)}
                hitSlop={8}
              >
                <Ionicons name="play-circle" size={30} color={colors.tint} />
              </Pressable>
            </Pressable>
          );
        })}
      </View>
      {extra > 0 && <MoreLink count={extra} toolId="routines" />}
    </View>
  );
}

// ─── Habits Section ───────────────────────────────────────────────────────────

function HabitRow({
  habit,
  scheme,
  onToggleDay,
}: {
  habit: Habit;
  scheme: 'light' | 'dark';
  onToggleDay: (id: string, dateKey: string) => void;
}) {
  const colors = Colors[scheme];
  const accentColor = getHabitColor(habit.color, scheme);
  const completionSet = useMemo(() => new Set(habit.completions), [habit.completions]);
  const currentStreak = useMemo(() => getCurrentStreak(completionSet), [completionSet]);
  const last7 = useMemo(() => getLast7Days(), []);
  const todayKey = toDateKey(new Date());

  return (
    <View style={[styles.itemRow, styles.habitRow, { backgroundColor: colors.background, borderLeftColor: accentColor }]}>
      <View style={styles.itemFlex}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{habit.title}</Text>
        {currentStreak > 0 && (
          <Text style={[styles.itemSub, { color: accentColor }]}>
            🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <View style={styles.dayRow}>
        {last7.map((d) => {
          const key = toDateKey(d);
          const done = completionSet.has(key);
          const isToday = key === todayKey;
          return (
            <Pressable
              key={key}
              onPress={() => onToggleDay(habit.id, key)}
              style={styles.dayCell}
              hitSlop={4}
            >
              <Text style={[styles.dayLabel, { color: isToday ? accentColor : colors.secondaryText }]}>
                {DAY_LABELS[d.getDay()]}
              </Text>
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={done ? accentColor : colors.cardBorder}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HabitsSection({
  habits,
  onToggleDay,
}: {
  habits: Habit[];
  onToggleDay: (id: string, dateKey: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  if (habits.length === 0) return null;
  const visible = habits.slice(0, CAP);
  const extra = habits.length - CAP;

  return (
    <View>
      <SectionHeader icon="checkmark-done-outline" label="HABITS" toolId="streak-tracker" />
      <View style={styles.sectionItems}>
        {visible.map((habit) => (
          <HabitRow key={habit.id} habit={habit} scheme={colorScheme} onToggleDay={onToggleDay} />
        ))}
      </View>
      {extra > 0 && <MoreLink count={extra} toolId="streak-tracker" />}
    </View>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export function BriefingCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const greeting = useMemo(() => getGreeting(), []);

  // Priorities
  const { config: prioritiesConfig } = useToolConfig<PrioritiesConfig>('priorities');
  const priorities = prioritiesConfig?.priorities ?? [];

  // Tasks
  const { getItemsForDate, isCompleted, toggleCompletion } = useChecklist();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const todayItems = useMemo(() => getItemsForDate(today), [getItemsForDate, today]);
  const pendingTodayItems = useMemo(
    () => todayItems.filter((item) => !isCompleted(item.id, today)),
    [todayItems, isCompleted, today]
  );

  // Deadlines
  const { config: deadlineConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');
  const upcomingDeadlines = useMemo(() => {
    const deadlines = deadlineConfig?.deadlines ?? [];
    return deadlines
      .filter((d) => getDaysUntilDeadline(d.date) >= 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [deadlineConfig]);

  // Events
  const { config: eventsConfig } = useToolConfig<EventsConfig>('events');
  const upcomingEvents = useMemo(() => {
    const events = eventsConfig?.events ?? [];
    return events
      .map((e) => ({ ...e, daysUntil: getDaysUntilNextOccurrence(e.date, e.recurrence) }))
      .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [eventsConfig]);

  // Routines
  const { config: routinesConfig } = useToolConfig<RoutinesConfig>('routines');
  const routines = routinesConfig?.routines ?? [];

  // Habits
  const { config: habitConfig, setConfig: setHabitConfig } = useToolConfig<HabitTrackerConfig>('streak-tracker');
  const habits = habitConfig?.habits ?? [];

  const toggleHabitDay = useCallback(
    (habitId: string, dateKey: string) => {
      if (!habitConfig) return;
      setHabitConfig({
        ...habitConfig,
        habits: habitConfig.habits.map((h) => {
          if (h.id !== habitId) return h;
          const has = h.completions.includes(dateKey);
          return {
            ...h,
            completions: has
              ? h.completions.filter((c) => c !== dateKey)
              : [...h.completions, dateKey],
          };
        }),
      });
    },
    [habitConfig, setHabitConfig]
  );

  const hasAny =
    priorities.length > 0 ||
    pendingTodayItems.length > 0 ||
    upcomingDeadlines.length > 0 ||
    upcomingEvents.length > 0 ||
    routines.length > 0 ||
    habits.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.greeting, { color: colors.secondaryText }]}>{greeting}</Text>
      {hasAny && (
        <View style={styles.sections}>
          <PrioritiesSection priorities={priorities} />
          <TasksSection
            items={pendingTodayItems}
            today={today}
            toggleCompletion={toggleCompletion}
          />
          <RoutinesSection routines={routines} />
          <HabitsSection habits={habits} onToggleDay={toggleHabitDay} />
          <DeadlinesSection deadlines={upcomingDeadlines} />
          <EventsSection events={upcomingEvents} />
        </View>
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
    marginBottom: Layout.spacing.sm,
  },
  sections: {
    gap: Layout.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },
  sectionLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionItems: {
    gap: Layout.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    minHeight: 40,
  },
  itemFlex: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  itemSub: {
    fontSize: Layout.fontSize.caption,
    marginTop: 1,
  },
  // Priorities
  priorityRank: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  // Tasks
  circleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  // Deadlines
  colorStrip: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  daysRight: {
    alignItems: 'center',
    minWidth: 42,
  },
  daysNum: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
  daysSub: {
    fontSize: 9,
    textAlign: 'center',
  },
  // Events
  eventIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Routines
  routineIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Habits
  habitRow: {
    borderLeftWidth: 3,
    flexWrap: 'nowrap',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  // More link
  moreLink: {
    paddingTop: Layout.spacing.xs,
    paddingLeft: Layout.spacing.sm,
    alignSelf: 'flex-start',
  },
  moreLinkText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
});
