import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist, isDueOnDate } from '@/src/hooks/useChecklist';
import { ChecklistItem } from '@/src/types';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionId = 'today' | 'tomorrow' | 'week';

interface DragItem {
  section: SectionId;
  item: ChecklistItem;
  date: Date;
  key: string;
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Pressable style={styles.sectionHeader} onPress={onToggle} hitSlop={4}>
      <Ionicons
        name={open ? 'chevron-down' : 'chevron-forward'}
        size={16}
        color={colors.secondaryText}
      />
      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: colors.cardBorder }]}>
        <Text style={[styles.sectionBadgeText, { color: colors.secondaryText }]}>{count}</Text>
      </View>
    </Pressable>
  );
}

// ─── Collapsible Section (used for Completed) ────────────────────────────────

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <SectionHeader title={title} count={count} open={open} onToggle={() => setOpen((o) => !o)} />
      {open && children}
    </View>
  );
}

// ─── Draggable section list ───────────────────────────────────────────────────
// Renders a section header + a DraggableFlatList of items for ONE section.
// Headers are outside the FlatList so they don't confuse offset calculations.

function DraggableSection({
  title,
  items,
  open,
  onToggle,
  onDragEnd,
  renderDragItem,
}: {
  title: string;
  items: DragItem[];
  open: boolean;
  onToggle: () => void;
  onDragEnd: (section: SectionId, newOrder: DragItem[]) => void;
  renderDragItem: (params: RenderItemParams<DragItem>) => React.ReactElement;
}) {
  const section = items[0]?.section ?? 'today';
  return (
    <View>
      <SectionHeader title={title} count={items.length} open={open} onToggle={onToggle} />
      {open && (
        <DraggableFlatList
          data={items}
          keyExtractor={(entry) => entry.key}
          renderItem={renderDragItem}
          onDragEnd={({ data }) => onDragEnd(section, data)}
          activationDistance={8}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

// ─── Today Tab ──────────────────────────────────────────────────────────────

function TodayTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, addItem, items } = useChecklist();
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  // Today's items split into pending / completed
  const todayItems = useMemo(() => getItemsForDate(today), [today, getItemsForDate, items]);
  const todayPending = useMemo(
    () => todayItems.filter((item) => !isCompleted(item.id, today)),
    [todayItems, isCompleted, today]
  );
  const todayCompleted = useMemo(
    () => todayItems.filter((item) => isCompleted(item.id, today)),
    [todayItems, isCompleted, today]
  );

  // Tomorrow's pending items
  const tomorrowPending = useMemo(
    () => getItemsForDate(tomorrow).filter((item) => !isCompleted(item.id, tomorrow)),
    [tomorrow, getItemsForDate, items, isCompleted]
  );

  // This week: days 2–6 from today, deduplicated by item id
  const weekSourceEntries = useMemo<{ date: Date; item: ChecklistItem }[]>(() => {
    const seen = new Set<string>();
    const result: { date: Date; item: ChecklistItem }[] = [];
    for (let i = 2; i <= 6; i++) {
      const date = addDays(today, i);
      for (const item of getItemsForDate(date)) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        result.push({ date, item });
      }
    }
    return result;
  }, [today, getItemsForDate, items]);

  // Optimistic completion: item IDs checked off but not yet reflected in context state
  const [pendingComplete, setPendingComplete] = useState<Set<string>>(new Set());

  const todayPendingFiltered = useMemo(
    () => todayPending.filter((item) => !pendingComplete.has(item.id)),
    [todayPending, pendingComplete]
  );
  const todayCompletedWithPending = useMemo(
    () => [
      ...todayCompleted,
      ...todayPending.filter((item) => pendingComplete.has(item.id)),
    ],
    [todayCompleted, todayPending, pendingComplete]
  );

  // Once context state catches up, remove from pendingComplete
  React.useEffect(() => {
    setPendingComplete((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const id of prev) {
        if (isCompleted(id, today)) next.delete(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [isCompleted, today]);

  // Convert source arrays to DragItem arrays (local order state lives here)
  const [todayDragItems, setTodayDragItems] = useState<DragItem[]>([]);
  const [tomorrowDragItems, setTomorrowDragItems] = useState<DragItem[]>([]);
  const [weekDragItems, setWeekDragItems] = useState<DragItem[]>([]);

  // Sync drag items from source whenever source changes (skip during drag)
  const isDragging = useRef(false);

  React.useEffect(() => {
    if (isDragging.current) return;
    setTodayDragItems(todayPendingFiltered.map((item) => ({ section: 'today' as SectionId, item, date: today, key: `today-${item.id}` })));
  }, [todayPendingFiltered, today]);

  React.useEffect(() => {
    if (isDragging.current) return;
    setTomorrowDragItems(tomorrowPending.map((item) => ({ section: 'tomorrow' as SectionId, item, date: tomorrow, key: `tomorrow-${item.id}` })));
  }, [tomorrowPending, tomorrow]);

  React.useEffect(() => {
    if (isDragging.current) return;
    setWeekDragItems(weekSourceEntries.map(({ date, item }) => ({ section: 'week' as SectionId, item, date, key: `week-${item.id}` })));
  }, [weekSourceEntries]);

  const [quickAddText, setQuickAddText] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleToggle = useCallback(
    (item: ChecklistItem, date: Date) => {
      // Optimistically move today's items immediately; for other days just toggle
      if (date === today) {
        setPendingComplete((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }
      toggleCompletion(item.id, date);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowQuickAdd(true);
    },
    [toggleCompletion, today]
  );

  const commitQuickAdd = useCallback(() => {
    const title = quickAddText.trim();
    if (!title) return;
    addItem({ title, recurrence: 'daily' });
    setQuickAddText('');
  }, [quickAddText, addItem]);

  const handleSubmitEditing = useCallback(() => {
    commitQuickAdd();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [commitQuickAdd]);

  const [todayOpen, setTodayOpen] = useState(true);
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(false);

  // Refs for stable render callback
  const handleToggleRef = useRef(handleToggle);
  const colorsRef = useRef(colors);
  handleToggleRef.current = handleToggle;
  colorsRef.current = colors;

  const handleSectionDragEnd = useCallback(
    (section: SectionId, newOrder: DragItem[]) => {
      isDragging.current = false;
      if (section === 'today') setTodayDragItems(newOrder);
      else if (section === 'tomorrow') setTomorrowDragItems(newOrder);
      else setWeekDragItems(newOrder);
    },
    []
  );

  const renderDragItem = useCallback(
    ({ item: entry, drag, isActive }: RenderItemParams<DragItem>) => {
      const colors = colorsRef.current;
      const { item, date, section } = entry;
      return (
        <ScaleDecorator>
          <View
            style={[
              styles.itemRow,
              { backgroundColor: colors.cardBackground },
              isActive && styles.itemRowActive,
            ]}
          >
            <Pressable
              onPress={() => handleToggleRef.current(item, date)}
              hitSlop={8}
            >
              <Ionicons name="square-outline" size={24} color={colors.secondaryText} />
            </Pressable>
            <Pressable
              style={styles.itemRowContent}
              onLongPress={() => {
                isDragging.current = true;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }}
              delayLongPress={300}
            >
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {section === 'week' && !isActive && (
                <Text style={[styles.weekDateLabel, { color: colors.secondaryText }]}>
                  {formatDisplayDate(date)}
                </Text>
              )}
              {isActive && (
                <Ionicons
                  name="reorder-three-outline"
                  size={20}
                  color={colors.secondaryText}
                  style={{ opacity: 0.4 }}
                />
              )}
            </Pressable>
          </View>
        </ScaleDecorator>
      );
    },
    []
  );

  const hasAnything = todayItems.length > 0 || tomorrowPending.length > 0 || weekSourceEntries.length > 0;
  const showQuickAddRow = showQuickAdd || todayCompletedWithPending.length > 0;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {!hasAnything ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add a checklist item
          </Text>
        </View>
      ) : (
        <>
          {/* ── Today ── */}
          <DraggableSection
            title="Today"
            items={todayDragItems}
            open={todayOpen}
            onToggle={() => setTodayOpen((o) => !o)}
            onDragEnd={handleSectionDragEnd}
            renderDragItem={renderDragItem}
          />

          {/* Quick-add row */}
          {showQuickAddRow && (
            <View style={[styles.quickAddRow, { backgroundColor: colors.cardBackground }]}>
              <Pressable
                onPress={() => {
                  setShowQuickAdd(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                hitSlop={8}
              >
                <Ionicons name="add" size={22} color={colors.tint} />
              </Pressable>
              <TextInput
                ref={inputRef}
                style={[styles.quickAddInput, { color: colors.text }]}
                placeholder="Add item…"
                placeholderTextColor={colors.secondaryText}
                value={quickAddText}
                onChangeText={setQuickAddText}
                onSubmitEditing={handleSubmitEditing}
                returnKeyType="done"
                blurOnSubmit={false}
                onFocus={() => setShowQuickAdd(true)}
                onBlur={commitQuickAdd}
              />
            </View>
          )}

          {/* ── Tomorrow ── */}
          {tomorrowDragItems.length > 0 && (
            <DraggableSection
              title="Tomorrow"
              items={tomorrowDragItems}
              open={tomorrowOpen}
              onToggle={() => setTomorrowOpen((o) => !o)}
              onDragEnd={handleSectionDragEnd}
              renderDragItem={renderDragItem}
            />
          )}

          {/* ── This Week ── */}
          {weekDragItems.length > 0 && (
            <DraggableSection
              title="This Week"
              items={weekDragItems}
              open={weekOpen}
              onToggle={() => setWeekOpen((o) => !o)}
              onDragEnd={handleSectionDragEnd}
              renderDragItem={renderDragItem}
            />
          )}

          {/* ── Completed ── */}
          {todayCompletedWithPending.length > 0 && (
            <CollapsibleSection title="Completed" count={todayCompletedWithPending.length} defaultOpen={false}>
              {todayCompletedWithPending.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleToggle(item, today)}
                  onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
                >
                  <Ionicons name="checkbox" size={24} color={colors.tint} />
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: colors.secondaryText, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </CollapsibleSection>
          )}
        </>
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
    const seenRepeating = new Set<string>();

    let cursor = addDays(today, 1);
    while (cursor <= endOfYear) {
      const dueItems = getItemsForDate(cursor);
      for (const item of dueItems) {
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
      {entries.map(({ date, item }) => (
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
    const seen = new Set<string>();

    for (let i = 1; i <= lookbackDays; i++) {
      const date = addDays(today, -i);
      const dueItems = getItemsForDate(date);
      for (const item of dueItems) {
        if (seen.has(item.id)) continue;
        if (!isCompleted(item.id, date)) {
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
    paddingBottom: 100,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  itemRowActive: {
    opacity: 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  itemRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: Layout.spacing.sm,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.xs,
    gap: Layout.spacing.xs,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekDateLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  quickAddInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
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
