import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { HabitTrackerConfig, Habit } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getLongestStreak(completionSet: Set<string>): number {
  if (completionSet.size === 0) return 0;
  const sorted = Array.from(completionSet).sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function getHabitColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return '#6DC8A8'; // default turquoise
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Year Grid ──────────────────────────────────────────────────────────────

function YearGrid({
  completionSet,
  accentColor,
  colors,
}: {
  completionSet: Set<string>;
  accentColor: string;
  colors: typeof Colors.light;
}) {
  const CELL = 11;
  const GAP = 2;
  const DOW_LABEL_WIDTH = 18;

  // Build weeks: last 53 weeks ending today
  const today = new Date();

  // Start from Monday of the week 52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const startDow = startDate.getDay();
  const daysToMon = startDow === 0 ? 6 : startDow - 1;
  startDate.setDate(startDate.getDate() - daysToMon);

  // Each column = one week starting Monday
  type Cell = { dateKey: string; inRange: boolean };
  const columns: Cell[][] = [];
  const monthLabels: { col: number; month: number }[] = [];
  const seenMonths = new Set<number>();

  let cursor = new Date(startDate);
  while (cursor <= today) {
    const week: Cell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      week.push({ dateKey: toDateKey(cursor), inRange: cursor <= today });
      // Track month starts
      if (cursor.getDate() <= 7 && !seenMonths.has(cursor.getMonth())) {
        seenMonths.add(cursor.getMonth());
        monthLabels.push({ col: columns.length, month: cursor.getMonth() });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
    if (columns.length > 54) break;
  }

  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.gridScrollContent}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
    >
      <View>
        {/* Month labels row */}
        <View style={[styles.gridMonthRow, { marginLeft: DOW_LABEL_WIDTH + GAP }]}>
          {columns.map((_, ci) => {
            const entry = monthLabels.find((e) => e.col === ci);
            return (
              <View key={ci} style={{ width: CELL + GAP, overflow: 'visible' }}>
                {entry ? (
                  <Text style={[styles.gridMonthLabel, { color: colors.secondaryText }]} numberOfLines={1}>
                    {MONTH_LABELS[entry.month]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Grid body */}
        <View style={styles.gridBody}>
          {/* Day-of-week labels (Mon=0 .. Sun=6) */}
          <View style={[styles.gridDowCol, { width: DOW_LABEL_WIDTH, marginRight: GAP }]}>
            {['Mo', '', 'We', '', 'Fr', '', 'Su'].map((label, i) => (
              <View key={i} style={{ height: CELL + GAP, justifyContent: 'center' }}>
                {label ? (
                  <Text style={[styles.gridDowLabel, { color: colors.secondaryText }]}>
                    {label}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Columns */}
          <View style={styles.gridCols}>
            {columns.map((week, ci) => (
              <View key={ci} style={{ marginRight: GAP }}>
                {week.map((cell, ri) => {
                  const done = cell.inRange && completionSet.has(cell.dateKey);
                  return (
                    <View
                      key={ri}
                      style={[
                        styles.gridCell,
                        {
                          width: CELL,
                          height: CELL,
                          marginBottom: GAP,
                          borderRadius: 2,
                          backgroundColor: done
                            ? accentColor
                            : cell.inRange
                            ? colors.cardBorder
                            : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Detail Sheet ────────────────────────────────────────────────────────────

function HabitDetailSheet({
  habit,
  visible,
  onClose,
}: {
  habit: Habit | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  if (!habit) return null;

  const accentColor = getHabitColor(habit.color, colorScheme);
  const completionSet = new Set(habit.completions);
  const today = new Date();

  // Days completed this week (Mon–today)
  const dayOfWeek = today.getDay(); // 0=Sun
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  let thisWeek = 0;
  for (let i = 0; i <= daysFromMon; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (completionSet.has(toDateKey(d))) thisWeek++;
  }

  // Days completed this month
  const daysIntoMonth = today.getDate();
  let thisMonth = 0;
  for (let i = 0; i < daysIntoMonth; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (completionSet.has(toDateKey(d))) thisMonth++;
  }

  const handleConfigure = () => {
    onClose();
    router.push(`/edit-streak/${habit.id}` as any);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderTopColor: accentColor }]}>
        <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

        {/* Title row */}
        <View style={styles.sheetTitleRow}>
          <View style={{ width: 38 }} />
          <Text style={[styles.sheetTitle, { color: accentColor }]} numberOfLines={2}>
            {habit.title}
          </Text>
          <Pressable onPress={handleConfigure} hitSlop={8} style={styles.configureButton}>
            <Ionicons name="settings-outline" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: accentColor }]}>{thisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>this week</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.secondaryText }]}>{thisMonth}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>this month</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.secondaryText }]}>{habit.completions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>total days</Text>
          </View>
        </View>

        {/* Year grid */}
        <Text style={[styles.gridSectionLabel, { color: colors.secondaryText }]}>PAST YEAR</Text>
        <YearGrid completionSet={completionSet} accentColor={accentColor} colors={colors} />
      </View>
    </Modal>
  );
}

// ─── Habit Card ──────────────────────────────────────────────────────────────

function DeleteAction() {
  return (
    <View style={styles.swipeActionRight}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Delete</Text>
      </View>
    </View>
  );
}

function SwipeableHabitCard({
  habit,
  scheme,
  onCardPress,
  onToggleDay,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  habit: Habit;
  scheme: 'light' | 'dark';
  onCardPress: (id: string) => void;
  onToggleDay: (id: string, dateKey: string) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colors = Colors[scheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getHabitColor(habit.color, scheme);
  const completionSet = useMemo(() => new Set(habit.completions), [habit.completions]);
  const currentStreak = useMemo(() => getCurrentStreak(completionSet), [completionSet]);
  const last7 = useMemo(() => getLast7Days(), []);
  const todayKey = toDateKey(new Date());

  const handleSwipeLeft = useCallback(() => {
    swipeableRef.current?.close();
    onDelete(habit.id, habit.title);
  }, [habit.id, habit.title, onDelete]);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <DeleteAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') handleSwipeLeft();
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderLeftColor: accentColor }]}>
            {/* Left: title + streak */}
            <Pressable
              onPress={() => onCardPress(habit.id)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }}
              style={styles.cardLeft}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {habit.title}
              </Text>
              {currentStreak > 0 && (
                <Text style={[styles.cardStreak, { color: accentColor }]}>
                  🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                </Text>
              )}
              {habit.notificationEnabled && (
                <Ionicons name="notifications-outline" size={12} color={colors.secondaryText} style={styles.notifIcon} />
              )}
            </Pressable>

            {/* 7-day circles */}
            <View style={styles.dayRow}>
              {last7.map((d) => {
                const key = toDateKey(d);
                const done = completionSet.has(key);
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      onToggleDay(habit.id, key);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.dayCell}
                    hitSlop={4}
                  >
                    <Text style={[
                      styles.dayLabel,
                      { color: isToday ? accentColor : colors.secondaryText },
                      isToday && styles.dayLabelToday,
                    ]}>
                      {DAY_LABELS[d.getDay()]}
                    </Text>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={done ? accentColor : colors.cardBorder}
                    />
                  </Pressable>
                );
              })}
            </View>

            {showHandle && (
              <Ionicons
                name="reorder-three-outline"
                size={20}
                color={colors.secondaryText}
                style={styles.dragHandle}
              />
            )}
          </View>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

// ─── Main List ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: HabitTrackerConfig = {
  toolId: 'streak-tracker',
  habits: [],
  notificationEnabled: false,
};

export function StreakTrackerList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<HabitTrackerConfig>('streak-tracker');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const habits = config?.habits ?? [];
  const canAdd = habits.length < 20;
  const selectedHabit = selectedId ? habits.find((h) => h.id === selectedId) ?? null : null;

  const toggleDay = useCallback(
    (id: string, dateKey: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        habits: current.habits.map((h) => {
          if (h.id !== id) return h;
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
    [config, setConfig]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Habit', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSelectedId(null);
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, habits: current.habits.filter((h) => h.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Habit[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, habits: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => (
      <SwipeableHabitCard
        habit={item}
        scheme={colorScheme}
        onCardPress={setSelectedId}
        onToggleDay={toggleDay}
        onDelete={handleDelete}
        drag={() => { setIsDragging(true); drag(); }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [colorScheme, toggleDay, handleDelete, isDragging]
  );

  return (
    <View style={styles.container}>
      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No habits yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to start tracking your first habit
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}
      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable onPress={() => router.push('/edit-streak/new' as any)} style={styles.fab}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      )}
      <HabitDetailSheet
        habit={selectedHabit}
        visible={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Layout.spacing.md, gap: Layout.spacing.sm, flexGrow: 1, paddingBottom: 100 },

  swipeableContainer: { borderRadius: Layout.borderRadius.md, overflow: 'hidden', marginBottom: Layout.spacing.sm },
  swipeableActive: { opacity: 0.95, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  swipeActionRight: { flex: 1, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'flex-end', paddingRight: Layout.spacing.lg, borderRadius: Layout.borderRadius.md },
  swipeActionContent: { alignItems: 'center', gap: 4 },
  swipeText: { color: '#fff', fontSize: Layout.fontSize.caption, fontWeight: '600' },

  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: Layout.spacing.md, paddingLeft: Layout.spacing.md, paddingRight: Layout.spacing.sm, borderLeftWidth: 4, gap: Layout.spacing.sm },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  cardStreak: { fontSize: Layout.fontSize.caption, marginTop: 2 },
  notifIcon: { marginTop: 4 },
  dragHandle: { opacity: 0.4 },

  dayRow: { flexDirection: 'row', gap: 4 },
  dayCell: { alignItems: 'center', gap: 2 },
  dayLabel: { fontSize: 10, fontWeight: '500' },
  dayLabelToday: { fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: Layout.fontSize.title, fontWeight: '600', marginTop: Layout.spacing.md },
  emptyMessage: { fontSize: Layout.fontSize.body, marginTop: Layout.spacing.sm, textAlign: 'center' },

  fabContainer: { position: 'absolute', bottom: Layout.spacing.xl, left: 0, right: 0, alignItems: 'center' },
  fab: { backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 4, padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xxl },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Layout.spacing.lg },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Layout.spacing.lg },
  sheetTitle: { flex: 1, fontSize: Layout.fontSize.heading, fontWeight: '700', lineHeight: 34, textAlign: 'center' },
  configureButton: { paddingLeft: Layout.spacing.md, paddingTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Layout.spacing.sm },
  statDivider: { width: 1, height: 40 },
  statNumber: { fontSize: Layout.fontSize.title, fontWeight: '700' },
  statLabel: { fontSize: Layout.fontSize.caption, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  gridSectionLabel: { fontSize: Layout.fontSize.caption, fontWeight: '600', letterSpacing: 0.8, marginBottom: Layout.spacing.sm },
  gridScrollContent: { paddingBottom: 4 },
  gridMonthRow: { flexDirection: 'row', marginBottom: 2 },
  gridMonthLabel: { fontSize: 9, fontWeight: '500', width: 24 },
  gridBody: { flexDirection: 'row' },
  gridDowCol: { justifyContent: 'flex-start' },
  gridDowLabel: { fontSize: 9, fontWeight: '500' },
  gridCols: { flexDirection: 'row' },
  gridCell: {},
});
