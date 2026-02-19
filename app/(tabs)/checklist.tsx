import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist, isDueOnDate } from '@/src/hooks/useChecklist';
import { ChecklistItem } from '@/src/types';
import * as Haptics from 'expo-haptics';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDisplayDate(date: Date): string {
  return `${DAYS_SHORT[date.getDay()]} ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

// ─── Today Tab ──────────────────────────────────────────────────────────────

function TodayTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, items } = useChecklist();
  const today = useMemo(() => startOfDay(new Date()), []);
  const dayItems = useMemo(
    () => getItemsForDate(today),
    [today, getItemsForDate, items]
  );

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {dayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear for today</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add a checklist item
          </Text>
        </View>
      ) : (
        dayItems.map((item) => {
          const completed = isCompleted(item.id, today);
          return (
            <Pressable
              key={item.id}
              style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
              onPress={() => {
                toggleCompletion(item.id, today);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
            >
              <Ionicons
                name={completed ? 'checkbox' : 'square-outline'}
                size={24}
                color={completed ? colors.tint : colors.secondaryText}
              />
              <Text
                style={[
                  styles.itemTitle,
                  { color: colors.text },
                  completed && { textDecorationLine: 'line-through', color: colors.secondaryText },
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Upcoming Tab ───────────────────────────────────────────────────────────

interface UpcomingEntry {
  date: Date;
  item: ChecklistItem;
}

function UpcomingTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, items } = useChecklist();

  const entries = useMemo<UpcomingEntry[]>(() => {
    const today = startOfDay(new Date());
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const result: UpcomingEntry[] = [];
    const seenRepeating = new Set<string>(); // track repeating items already shown

    let cursor = addDays(today, 1);
    while (cursor <= endOfYear) {
      const dueItems = getItemsForDate(cursor);
      for (const item of dueItems) {
        // Each item shown only once — at its next upcoming occurrence
        if (seenRepeating.has(item.id)) continue;
        result.push({ date: new Date(cursor), item });
        seenRepeating.add(item.id);
      }
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [getItemsForDate, items]);

  if (entries.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="calendar-outline" size={48} color={colorScheme === 'light' ? Colors.light.secondaryText : Colors.dark.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colorScheme === 'light' ? Colors.light.text : Colors.dark.text }]}>Nothing upcoming</Text>
        <Text style={[styles.emptyMessage, { color: colorScheme === 'light' ? Colors.light.secondaryText : Colors.dark.secondaryText }]}>
          Tap + to add a checklist item
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {entries.map(({ date, item }, index) => (
        <Pressable
          key={`${item.id}-${formatDate(date)}`}
          style={[styles.dateRow, { backgroundColor: colors.cardBackground }]}
          onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
        >
          <Text style={[styles.dateLabel, { color: colors.tint }]}>
            {formatDisplayDate(date)}
          </Text>
          <View style={[styles.dateDivider, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.dateItemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Overdue Tab ─────────────────────────────────────────────────────────────

interface OverdueEntry {
  date: Date;
  item: ChecklistItem;
}

function OverdueTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, items } = useChecklist();

  const entries = useMemo<OverdueEntry[]>(() => {
    const today = startOfDay(new Date());
    const lookbackDays = 30;
    const result: OverdueEntry[] = [];
    // Track items already added so repeating items only show their most recent miss
    const seen = new Set<string>();

    // Iterate most-recent-first so the first miss we encounter per item is the latest
    for (let i = 1; i <= lookbackDays; i++) {
      const date = addDays(today, -i);
      const dueItems = getItemsForDate(date);
      for (const item of dueItems) {
        if (seen.has(item.id)) continue;
        if (!isCompleted(item.id, date)) {
          // Only show if the item doesn't recur today — if it does, the user
          // can handle it in Today and it shouldn't clutter Overdue
          if (!isDueOnDate(item, today)) {
            result.push({ date, item });
            seen.add(item.id);
          }
        }
      }
    }

    return result;
  }, [getItemsForDate, isCompleted, items]);

  if (entries.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="ribbon-outline" size={48} color={colorScheme === 'light' ? Colors.light.secondaryText : Colors.dark.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colorScheme === 'light' ? Colors.light.text : Colors.dark.text }]}>No overdue items</Text>
        <Text style={[styles.emptyMessage, { color: colorScheme === 'light' ? Colors.light.secondaryText : Colors.dark.secondaryText }]}>
          You're all caught up
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {entries.map(({ date, item }) => (
        <Pressable
          key={`${item.id}-${formatDate(date)}`}
          style={[styles.dateRow, { backgroundColor: colors.cardBackground }]}
          onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
        >
          <Text style={[styles.dateLabel, { color: colors.destructive }]}>
            {formatDisplayDate(date)}
          </Text>
          <View style={[styles.dateDivider, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.dateItemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type TabId = 'today' | 'upcoming' | 'overdue';

const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
];

export default function ChecklistScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('today');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.separator }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.tint : colors.secondaryText },
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.tint }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'upcoming' && <UpcomingTab />}
      {activeTab === 'overdue' && <OverdueTab />}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/edit-checklist/new' as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    position: 'relative',
  },
  tabLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    height: 2,
    borderRadius: 1,
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
    paddingBottom: 100,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  itemTitle: {
    fontSize: Layout.fontSize.body,
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: 0,
  },
  dateLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    width: 96,
  },
  dateDivider: {
    width: 1,
    height: 16,
    marginHorizontal: Layout.spacing.md,
  },
  dateItemTitle: {
    fontSize: Layout.fontSize.body,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginTop: Layout.spacing.md,
  },
  emptyMessage: {
    fontSize: Layout.fontSize.body,
    marginTop: Layout.spacing.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    right: Layout.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
