import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
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
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 240;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimerDisplay(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

// ─── Checklist Focus Timer ────────────────────────────────────────────────────

interface ChecklistFocusTimerProps {
  taskTitle: string;
  onStop: (elapsedSeconds: number) => void;
  onDismiss: () => void;
}

function ChecklistFocusTimer({ taskTitle, onStop, onDismiss }: ChecklistFocusTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const progress = useSharedValue(0);

  // Spin the ring continuously while running — one full rotation per minute
  useEffect(() => {
    const pct = (elapsed % 60) / 60;
    progress.value = withTiming(pct, { duration: 900, easing: Easing.linear });
  }, [elapsed]);

  const tick = useCallback(() => {
    setElapsed((prev) => prev + 1);
  }, []);

  const handlePause = () => {
    clearInterval(timerRef.current);
    setPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleResume = () => {
    setPaused(false);
    timerRef.current = setInterval(tick, 1000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStop = () => {
    clearInterval(timerRef.current);
    deactivateKeepAwake();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStop(elapsed);
  };

  useEffect(() => {
    activateKeepAwakeAsync();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      clearInterval(timerRef.current);
      deactivateKeepAwake();
    };
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={timerStyles.screen}>
        <Text style={timerStyles.taskTitle} numberOfLines={2}>{taskTitle}</Text>

        <View style={timerStyles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              stroke="#222" strokeWidth={STROKE_WIDTH} fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              stroke="#0A84FF" strokeWidth={STROKE_WIDTH} fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={timerStyles.timeOverlay}>
            <Text style={timerStyles.elapsed}>{formatTimerDisplay(elapsed)}</Text>
            <Text style={timerStyles.elapsedLabel}>elapsed</Text>
          </View>
        </View>

        <View style={timerStyles.controls}>
          <Pressable onPress={handleStop} style={timerStyles.secondaryBtn}>
            <Ionicons name="stop" size={22} color="#999" />
          </Pressable>
          <Pressable
            onPress={paused ? handleResume : handlePause}
            style={timerStyles.mainBtn}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={30} color="#fff" />
          </Pressable>
          <View style={{ width: 52 }} />
        </View>
      </View>
    </Modal>
  );
}

const timerStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  taskTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 48,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  elapsed: {
    fontSize: 52,
    fontWeight: '200',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  elapsedLabel: {
    fontSize: Layout.fontSize.caption,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    gap: Layout.spacing.xl,
  },
  mainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Task Detail Card Modal ───────────────────────────────────────────────────

interface DetailEntry {
  item: ChecklistItem;
  date: Date;
}

interface TaskDetailModalProps {
  entries: DetailEntry[];
  initialIndex: number;
  onClose: () => void;
  onToggle: (item: ChecklistItem, date: Date) => void;
  onFocusComplete: (item: ChecklistItem, date: Date, elapsedSeconds: number) => void;
  isCompleted: (itemId: string, date: Date) => boolean;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem, afterDelete: () => void) => void;
}

function TaskDetailModal({
  entries,
  initialIndex,
  onClose,
  onToggle,
  onFocusComplete,
  isCompleted,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [index, setIndex] = useState(initialIndex);
  const [focusItem, setFocusItem] = useState<DetailEntry | null>(null);

  const current = entries[index];
  if (!current) return null;

  const done = isCompleted(current.item.id, current.date);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {focusItem && (
        <ChecklistFocusTimer
          taskTitle={focusItem.item.title}
          onDismiss={() => setFocusItem(null)}
          onStop={(elapsed) => {
            setFocusItem(null);
            Alert.alert(
              'Session complete',
              `You spent ${formatDuration(elapsed)} on this task. Mark it as complete?`,
              [
                { text: 'Not yet', style: 'cancel' },
                {
                  text: 'Mark complete',
                  onPress: () => {
                    onFocusComplete(focusItem.item, focusItem.date, elapsed);
                  },
                },
              ]
            );
          }}
        />
      )}

      <View style={detailStyles.sheet}>
        {/* Header */}
        <View style={detailStyles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={detailStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.secondaryText} />
          </Pressable>
          <Text style={[detailStyles.headerCount, { color: colors.secondaryText }]}>
            {index + 1} / {entries.length}
          </Text>
          <View style={detailStyles.headerActions}>
            <Pressable
              hitSlop={8}
              style={detailStyles.headerIconBtn}
              onPress={() => onEdit(current.item)}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.secondaryText} />
            </Pressable>
            <Pressable
              hitSlop={8}
              style={detailStyles.headerIconBtn}
              onPress={() => onDelete(current.item, () => {
                if (entries.length === 1) {
                  onClose();
                } else {
                  setIndex((i) => Math.min(i, entries.length - 2));
                }
              })}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </Pressable>
          </View>
        </View>

        {/* Card */}
        <View style={[detailStyles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[detailStyles.cardTitle, { color: colors.text }]}>
            {current.item.title}
          </Text>
          <Text style={[detailStyles.cardDate, { color: colors.secondaryText }]}>
            {formatDisplayDate(current.date)}
          </Text>

          {done && (
            <View style={detailStyles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={detailStyles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={detailStyles.actions}>
          <Pressable
            style={[detailStyles.focusBtn, { backgroundColor: colors.tint }]}
            onPress={() => setFocusItem(current)}
          >
            <Ionicons name="timer-outline" size={20} color="#fff" />
            <Text style={detailStyles.focusBtnText}>Start Focus</Text>
          </Pressable>

          <Pressable
            style={[detailStyles.checkBtn, { borderColor: done ? colors.tint : colors.cardBorder, backgroundColor: done ? colors.tint : 'transparent' }]}
            onPress={() => onToggle(current.item, current.date)}
          >
            <Ionicons name={done ? 'checkmark' : 'square-outline'} size={18} color={done ? '#fff' : colors.secondaryText} />
            <Text style={[detailStyles.checkBtnText, { color: done ? '#fff' : colors.secondaryText }]}>
              {done ? 'Completed' : 'Mark complete'}
            </Text>
          </Pressable>
        </View>

        {/* Pagination */}
        <View style={detailStyles.pagination}>
          <Pressable
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            style={[detailStyles.pageBtn, { opacity: index === 0 ? 0.3 : 1 }]}
          >
            <Ionicons name="chevron-up" size={24} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
            disabled={index === entries.length - 1}
            style={[detailStyles.pageBtn, { opacity: index === entries.length - 1 ? 0.3 : 1 }]}
          >
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: Layout.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCount: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.xl,
    minHeight: 160,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  cardDate: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Layout.spacing.md,
  },
  completedBadgeText: {
    fontSize: Layout.fontSize.caption,
    color: '#34C759',
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  focusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  focusBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1.5,
  },
  checkBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.xl,
    paddingTop: Layout.spacing.xl,
  },
  pageBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Today Tab ──────────────────────────────────────────────────────────────

function TodayTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, updateCompletion, addItem, deleteItem, items } = useChecklist();
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

  // Tomorrow's items split into pending / completed
  const tomorrowAllEntries = useMemo(
    () => getItemsForDate(tomorrow).map((item) => ({ item, date: tomorrow })),
    [tomorrow, getItemsForDate, items]
  );
  const tomorrowPending = useMemo(
    () => tomorrowAllEntries.filter(({ item }) => !isCompleted(item.id, tomorrow)).map(({ item }) => item),
    [tomorrowAllEntries, isCompleted, tomorrow]
  );
  const tomorrowCompleted = useMemo(
    () => tomorrowAllEntries.filter(({ item }) => isCompleted(item.id, tomorrow)),
    [tomorrowAllEntries, isCompleted, tomorrow]
  );

  // This week: days 2–6 from today, deduplicated by item id, split into pending / completed
  const weekAllEntries = useMemo<{ date: Date; item: ChecklistItem }[]>(() => {
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
  const weekSourceEntries = useMemo(
    () => weekAllEntries.filter(({ item, date }) => !isCompleted(item.id, date)),
    [weekAllEntries, isCompleted]
  );
  const weekCompleted = useMemo(
    () => weekAllEntries.filter(({ item, date }) => isCompleted(item.id, date)),
    [weekAllEntries, isCompleted]
  );

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
  const scrollRef = useRef<ScrollView>(null);
  const quickAddRowRef = useRef<View>(null);
  const keyboardTopRef = useRef<number>(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      keyboardTopRef.current = 0;
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleToggle = useCallback(
    (item: ChecklistItem, date: Date) => {
      if (date === today) {
        const id = item.id;
        const isPending = pendingComplete.has(id);
        const alreadyDone = isCompleted(id, today);
        if (isPending || alreadyDone) {
          setPendingComplete((prev) => { const s = new Set(prev); s.delete(id); return s; });
        } else {
          setPendingComplete((prev) => new Set(prev).add(id));
        }
        toggleCompletion(item.id, date);
      } else {
        toggleCompletion(item.id, date);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowQuickAdd(true);
    },
    [toggleCompletion, today, pendingComplete, isCompleted]
  );

  const scrollOffsetRef = useRef(0);

  const commitQuickAdd = useCallback(() => {
    const title = quickAddText.trim();
    if (!title) return;
    addItem({ title, recurrence: 'once' });
    setQuickAddText('');
    setTimeout(() => {
      const kbTop = keyboardTopRef.current;
      if (!kbTop || !quickAddRowRef.current) return;
      quickAddRowRef.current.measure((_x, _y, _w, h, _pageX, pageY) => {
        const rowBottom = pageY + h;
        const overlap = rowBottom - kbTop;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollOffsetRef.current + overlap + 8, animated: true });
        }
      });
    }, 50);
  }, [quickAddText, addItem]);

  const handleSubmitEditing = useCallback(() => {
    commitQuickAdd();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [commitQuickAdd]);

  const [todayOpen, setTodayOpen] = useState(true);
  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(false);

  // All pending entries across all sections (for detail card navigation)
  const allPendingEntries = useMemo<DetailEntry[]>(() => [
    ...todayPendingFiltered.map((item) => ({ item, date: today })),
    ...tomorrowPending.map((item) => ({ item, date: tomorrow })),
    ...weekSourceEntries.map(({ item, date }) => ({ item, date })),
  ], [todayPendingFiltered, tomorrowPending, weekSourceEntries, today, tomorrow]);

  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const handleFocusComplete = useCallback(
    (item: ChecklistItem, date: Date, elapsedSeconds: number) => {
      // Mark the task complete
      toggleCompletion(item.id, date);
      if (date === today) {
        setPendingComplete((prev) => new Set(prev).add(item.id));
      }
      // Store time as a note on the completion record
      updateCompletion({ itemId: item.id, date: formatDate(date), notes: `Focus session: ${formatDuration(elapsedSeconds)}` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [toggleCompletion, updateCompletion, today]
  );

  // Refs for stable render callback
  const handleToggleRef = useRef(handleToggle);
  const colorsRef = useRef(colors);
  const deleteItemRef = useRef(deleteItem);
  const allPendingEntriesRef = useRef(allPendingEntries);
  handleToggleRef.current = handleToggle;
  colorsRef.current = colors;
  deleteItemRef.current = deleteItem;
  allPendingEntriesRef.current = allPendingEntries;

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
          <Swipeable
            renderRightActions={() => (
              <View style={styles.swipeDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeDeleteText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(direction) => {
              if (direction === 'right') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                deleteItemRef.current(item.id);
              }
            }}
            overshootRight={false}
            enabled={!isActive}
          >
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
                style={[
                  styles.circleCheckbox,
                  { backgroundColor: 'transparent', borderColor: colors.secondaryText },
                ]}
              />
              <Pressable
                style={styles.itemRowContent}
                onPress={() => {
                  const idx = allPendingEntriesRef.current.findIndex((e) => e.item.id === item.id);
                  setDetailIndex(idx >= 0 ? idx : 0);
                }}
                onLongPress={() => {
                  isDragging.current = true;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }}
                delayLongPress={300}
              >
                <Text
                  style={[styles.itemTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
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
          </Swipeable>
        </ScaleDecorator>
      );
    },
    []
  );

  const allCompleted = useMemo(
    () => [
      ...todayCompletedWithPending.map((item) => ({ item, date: today })),
      ...tomorrowCompleted,
      ...weekCompleted,
    ],
    [todayCompletedWithPending, tomorrowCompleted, weekCompleted, today]
  );

  const hasAnything = todayItems.length > 0 || tomorrowAllEntries.length > 0 || weekAllEntries.length > 0;

  return (
    <>
      {detailIndex !== null && allPendingEntries.length > 0 && (
        <TaskDetailModal
          entries={allPendingEntries}
          initialIndex={detailIndex}
          onClose={() => setDetailIndex(null)}
          onToggle={handleToggle}
          onFocusComplete={handleFocusComplete}
          isCompleted={isCompleted}
          onEdit={(item) => {
            setDetailIndex(null);
            router.push(`/edit-checklist/${item.id}` as any);
          }}
          onDelete={(item, afterDelete) => {
            Alert.alert('Delete Item', `Delete "${item.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteItem(item.id);
                  afterDelete();
                },
              },
            ]);
          }}
        />
      )}
      <KeyboardAvoidingView
        style={styles.tabContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.flex1}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
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
          {todayOpen && (
            <View ref={quickAddRowRef} style={[styles.quickAddRow, { backgroundColor: colors.cardBackground }]}>
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
          {allCompleted.length > 0 && (
            <CollapsibleSection title="Completed" count={allCompleted.length} defaultOpen={false}>
              {allCompleted.map(({ item, date }) => (
                <Pressable
                  key={`${item.id}-${formatDate(date)}`}
                  style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleToggle(item, date)}
                  onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
                >
                  <View style={[styles.circleCheckbox, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
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
      </KeyboardAvoidingView>
    </>
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
  flex1: {
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
  swipeDeleteAction: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  circleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
