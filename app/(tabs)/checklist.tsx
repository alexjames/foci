import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
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
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist, isDueOnDate } from '@/src/hooks/useChecklist';
import { ChecklistItem, Subtask } from '@/src/types';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getTaskEmoji } from '@/src/utils/taskEmoji';
import { useLists } from '@/src/hooks/useLists';

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

type SectionId = 'today' | 'tomorrow' | 'week' | 'later';

interface DragItem {
  section: SectionId;
  item: ChecklistItem;
  date: Date;
  key: string;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = 'complete' | 'delete';

function Toast({ visible, message, type }: { visible: boolean; message: string; type: ToastType }) {
  const translateY = useRef(new RNAnimated.Value(-80)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const isShowing = useRef(false);

  useEffect(() => {
    if (visible && !isShowing.current) {
      isShowing.current = true;
      translateY.setValue(-80);
      opacity.setValue(0);
      RNAnimated.parallel([
        RNAnimated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        RNAnimated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else if (!visible && isShowing.current) {
      isShowing.current = false;
      RNAnimated.parallel([
        RNAnimated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  const bg = type === 'complete' ? '#34C759' : '#FF3B30';
  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[toastStyles.container, { transform: [{ translateY }], opacity, backgroundColor: bg }]}
    >
      <Text style={toastStyles.text}>{message}</Text>
    </RNAnimated.View>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, type: ToastType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 1000);
  }, []);
  return { toast, show };
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

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
  onReschedule: (item: ChecklistItem, newDate: Date) => void;
  onUpdateItem: (item: ChecklistItem) => void;
  onMarkComplete?: () => void;
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
  onReschedule,
  onUpdateItem,
  onMarkComplete,
}: TaskDetailModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [index, setIndex] = useState(initialIndex);
  const [focusItem, setFocusItem] = useState<DetailEntry | null>(null);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const subtaskInputRef = useRef<TextInput>(null);

  const current = entries[index];

  // Reset subtask input when navigating between entries
  useEffect(() => {
    setSubtaskInput('');
    setShowSubtaskInput(false);
  }, [index]);

  if (!current) return null;

  const dateStr = formatDate(current.date);
  const done = isCompleted(current.item.id, current.date);
  const today = startOfDay(new Date());
  const isToday = formatDate(current.date) === formatDate(today);
  const subtasks: Subtask[] = current.item.subtasks ?? [];
  const allSubtasksDone = subtasks.length > 0 && subtasks.every((s) => s.completedDates.includes(dateStr));

  const toggleSubtask = (subtask: Subtask) => {
    const alreadyDone = subtask.completedDates.includes(dateStr);
    const newSubtask: Subtask = {
      ...subtask,
      completedDates: alreadyDone
        ? subtask.completedDates.filter((d) => d !== dateStr)
        : [...subtask.completedDates, dateStr],
    };
    const newSubtasks = subtasks.map((s) => s.id === subtask.id ? newSubtask : s);
    const updatedItem = { ...current.item, subtasks: newSubtasks };
    onUpdateItem(updatedItem);

    // Auto-check parent when all subtasks are done
    const nowAllDone = newSubtasks.every((s) => s.completedDates.includes(dateStr));
    if (nowAllDone && !done) {
      onToggle(updatedItem, current.date);
    }
    // Auto-uncheck parent when a subtask is unchecked
    if (alreadyDone && done) {
      onToggle(updatedItem, current.date);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addSubtask = () => {
    const title = subtaskInput.trim();
    if (!title) return;
    const newSubtask: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      completedDates: [],
    };
    onUpdateItem({ ...current.item, subtasks: [...subtasks, newSubtask] });
    setSubtaskInput('');
  };

  // When parent is toggled off externally, uncheck all subtasks for this date
  const handleParentToggle = () => {
    if (done && subtasks.length > 0) {
      // Unchecking parent — clear all subtask completions for this date
      const newSubtasks = subtasks.map((s) => ({
        ...s,
        completedDates: s.completedDates.filter((d) => d !== dateStr),
      }));
      onUpdateItem({ ...current.item, subtasks: newSubtasks });
    }
    onToggle(current.item, current.date);
    if (!done) {
      onMarkComplete?.();
    }
  };

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

        <ScrollView contentContainerStyle={detailStyles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Card */}
        <View style={[detailStyles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[detailStyles.cardTitle, { color: colors.text }]}>
            {current.item.title}
          </Text>
          <Text style={[detailStyles.cardDate, { color: colors.secondaryText }]}>
            {formatDisplayDate(current.date)}
          </Text>

          {(done || allSubtasksDone) && (
            <View style={detailStyles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={detailStyles.completedBadgeText}>Completed</Text>
            </View>
          )}

          {!current.item.recurringRuleId && (
            <View style={detailStyles.rescheduleRow}>
              <Pressable
                style={[detailStyles.rescheduleBtn, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  const newDate = isToday ? addDays(today, 1) : today;
                  onReschedule(current.item, newDate);
                  onClose();
                }}
              >
                <Text style={[detailStyles.rescheduleBtnText, { color: colors.text }]}>
                  {isToday ? 'Move to tomorrow' : 'Do this today'}
                </Text>
              </Pressable>
              <Pressable
                style={[detailStyles.rescheduleBtn, { borderColor: colors.cardBorder }]}
                onPress={() => {
                  onReschedule(current.item, addDays(today, 3));
                  onClose();
                }}
              >
                <Text style={[detailStyles.rescheduleBtnText, { color: colors.text }]}>
                  Move to later this week
                </Text>
              </Pressable>
            </View>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <View style={detailStyles.subtaskList}>
              <DraggableFlatList
                data={subtasks}
                keyExtractor={(s) => s.id}
                scrollEnabled={false}
                activationDistance={8}
                onDragEnd={({ data }) => {
                  onUpdateItem({ ...current.item, subtasks: data });
                }}
                renderItem={({ item: subtask, drag, isActive: subtaskActive }) => {
                  const subtaskDone = subtask.completedDates.includes(dateStr);
                  return (
                    <ScaleDecorator>
                      <Swipeable
                        renderRightActions={() => (
                          <View style={detailStyles.subtaskDeleteAction}>
                            <Ionicons name="trash-outline" size={18} color="#fff" />
                          </View>
                        )}
                        onSwipeableOpen={(direction: 'left' | 'right') => {
                          if (direction === 'left') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onUpdateItem({
                              ...current.item,
                              subtasks: subtasks.filter((s) => s.id !== subtask.id),
                            });
                          }
                        }}
                        overshootRight={false}
                        enabled={!subtaskActive}
                      >
                        <Pressable
                          style={[detailStyles.subtaskRow, { backgroundColor: colors.cardBackground }]}
                          onPress={() => toggleSubtask(subtask)}
                          onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            drag();
                          }}
                          delayLongPress={300}
                        >
                          <View style={[
                            detailStyles.subtaskCheckbox,
                            subtaskDone
                              ? { backgroundColor: colors.tint, borderColor: colors.tint }
                              : { backgroundColor: 'transparent', borderColor: colors.secondaryText },
                          ]}>
                            {subtaskDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <Text style={[
                            detailStyles.subtaskTitle,
                            { color: subtaskDone ? colors.secondaryText : colors.text },
                            subtaskDone && { textDecorationLine: 'line-through' },
                          ]}>
                            {subtask.title}
                          </Text>
                          {subtaskActive && (
                            <Ionicons name="reorder-three-outline" size={18} color={colors.secondaryText} style={{ opacity: 0.4 }} />
                          )}
                        </Pressable>
                      </Swipeable>
                    </ScaleDecorator>
                  );
                }}
              />
            </View>
          )}

          {/* Add subtask row */}
          {showSubtaskInput ? (
            <View style={detailStyles.subtaskInputRow}>
              <View style={[detailStyles.subtaskCheckbox, { backgroundColor: 'transparent', borderColor: colors.cardBorder }]} />
              <TextInput
                ref={subtaskInputRef}
                style={[detailStyles.subtaskInput, { color: colors.text }]}
                placeholder="New subtask…"
                placeholderTextColor={colors.secondaryText}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                onSubmitEditing={() => {
                  addSubtask();
                  setTimeout(() => subtaskInputRef.current?.focus(), 50);
                }}
                onBlur={() => {
                  addSubtask();
                  setShowSubtaskInput(false);
                }}
                returnKeyType="done"
                blurOnSubmit={false}
                autoFocus
              />
            </View>
          ) : (
            <Pressable
              style={detailStyles.addSubtaskBtn}
              onPress={() => {
                setShowSubtaskInput(true);
                setTimeout(() => subtaskInputRef.current?.focus(), 50);
              }}
            >
              <Ionicons name="add" size={16} color={colors.tint} />
              <Text style={[detailStyles.addSubtaskText, { color: colors.tint }]}>Add subtask</Text>
            </Pressable>
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
            onPress={handleParentToggle}
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: Layout.spacing.md,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.sm,
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
    paddingTop: Layout.spacing.sm,
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
  subtaskList: {
    marginTop: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  subtaskDeleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
    borderRadius: Layout.borderRadius.md,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subtaskTitle: {
    fontSize: Layout.fontSize.body,
    flex: 1,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    marginTop: Layout.spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingTop: Layout.spacing.md,
  },
  addSubtaskText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
  },
  rescheduleRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.lg,
  },
  rescheduleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleBtnText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
    textAlign: 'center',
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
  const { getItemsForDate, isCompleted, toggleCompletion, updateCompletion, addItem, updateItem, moveToTrash, spawnRecurringInstances, items } = useChecklist();
  const { syncChecklistToList } = useLists();
  const today = useMemo(() => startOfDay(new Date()), []);

  // Spawn recurring instances when the screen comes into focus (picks up newly added rules)
  useFocusEffect(
    useCallback(() => {
      spawnRecurringInstances(formatDate(new Date()));
    }, [spawnRecurringInstances])
  );

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

  // Sync drag items from source whenever source changes (skip during drag or subtask update)
  const isDragging = useRef(false);
  const isSubtaskUpdate = useRef(false);

  React.useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) {
      isSubtaskUpdate.current = false;
      return;
    }
    setTodayDragItems(todayPendingFiltered.map((item) => ({ section: 'today' as SectionId, item, date: today, key: `today-${item.id}` })));
  }, [todayPendingFiltered, today]);

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
      const nowCompleted = !isCompleted(item.id, date);
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
      syncChecklistToList(item.id, nowCompleted);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowQuickAdd(true);
    },
    [toggleCompletion, syncChecklistToList, today, pendingComplete, isCompleted]
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

  // All pending entries for today (for detail card navigation)
  const allPendingEntries = useMemo<DetailEntry[]>(() => [
    ...todayPendingFiltered.map((item) => ({ item, date: today })),
  ], [todayPendingFiltered, today]);

  const allEntries = useMemo<DetailEntry[]>(() => [
    ...todayPendingFiltered.map((item) => ({ item, date: today })),
    ...todayCompletedWithPending.map((item) => ({ item, date: today })),
  ], [todayPendingFiltered, todayCompletedWithPending, today]);

  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const { toast: checklistToast, show: showToast } = useToast();

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
  const moveToTrashRef = useRef(moveToTrash);
  const swipeableRefs = useRef<Map<string, { current: SwipeableMethods | null }>>(new Map());
  const updateItemRef = useRef(updateItem);
  const allPendingEntriesRef = useRef(allPendingEntries);
  const allEntriesRef = useRef(allEntries);
  const showToastRef = useRef(showToast);
  handleToggleRef.current = handleToggle;
  colorsRef.current = colors;
  moveToTrashRef.current = moveToTrash;
  updateItemRef.current = updateItem;
  allPendingEntriesRef.current = allPendingEntries;
  allEntriesRef.current = allEntries;
  showToastRef.current = showToast;

  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const expandedSubtaskIdsRef = useRef(expandedSubtaskIds);
  expandedSubtaskIdsRef.current = expandedSubtaskIds;

  const handleSectionDragEnd = useCallback(
    (section: SectionId, newOrder: DragItem[]) => {
      isDragging.current = false;
      if (section === 'today') setTodayDragItems(newOrder);
    },
    []
  );

  const renderDragItem = useCallback(
    ({ item: entry, drag, isActive }: RenderItemParams<DragItem>) => {
      const colors = colorsRef.current;
      const { item, date, section } = entry;
      const dateStr = formatDate(date);
      const subtasks = item.subtasks ?? [];
      const expanded = expandedSubtaskIdsRef.current.has(item.id);
      const hasSubtasks = subtasks.length > 0;
      return (
        <ScaleDecorator>
          <Swipeable
            ref={(() => {
              if (!swipeableRefs.current.has(item.id)) {
                swipeableRefs.current.set(item.id, { current: null });
              }
              return swipeableRefs.current.get(item.id) as React.RefObject<SwipeableMethods | null>;
            })()}
            renderRightActions={() => (
              <View style={styles.swipeDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeDeleteText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(direction: 'left' | 'right') => {
              if (direction === 'left') {
                if (item.recurringRuleId) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  swipeableRefs.current.get(item.id)?.current?.close();
                  Alert.alert(
                    'Cannot Delete',
                    'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
                  );
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                moveToTrashRef.current(item.id, formatDate(new Date()));
                showToastRef.current('Task deleted', 'delete');
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
                (expanded && hasSubtasks) && { alignItems: 'flex-start' },
              ]}
            >
              <Pressable
                onPress={() => handleToggleRef.current(item, date)}
                hitSlop={8}
                style={[
                  styles.circleCheckbox,
                  { backgroundColor: 'transparent', borderColor: colors.secondaryText },
                  (expanded && hasSubtasks) && { marginTop: 2 },
                ]}
              />
              <View style={styles.itemExpandBlock}>
                <Pressable
                  style={styles.itemRowContent}
                  onPress={() => {
                    const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id);
                    setDetailIndex(idx >= 0 ? idx : 0);
                  }}
                  onLongPress={() => {
                    isDragging.current = true;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    drag();
                  }}
                  delayLongPress={300}
                >
                  <View style={styles.itemTitleBlock}>
                    <Text
                      style={[styles.itemTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {getTaskEmoji(item.title)} {item.title}
                    </Text>
                    {!isActive && !expanded && hasSubtasks && (
                      <View style={styles.subtaskPill}>
                        <Ionicons name="list-outline" size={11} color={colors.secondaryText} />
                        <Text style={[styles.subtaskPillText, { color: colors.secondaryText }]}>
                          {subtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>
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
                  {!isActive && hasSubtasks && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setExpandedSubtaskIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.subtaskExpandBtn}
                    >
                      <Ionicons
                        name={expanded ? 'remove' : 'add'}
                        size={16}
                        color={colors.secondaryText}
                      />
                    </Pressable>
                  )}
                </Pressable>
                {expanded && hasSubtasks && (
                  <View style={styles.inlineSubtaskList}>
                    {subtasks.map((subtask) => {
                      const subtaskDone = subtask.completedDates.includes(dateStr);
                      return (
                        <Pressable
                          key={subtask.id}
                          style={styles.inlineSubtaskRow}
                          onPress={() => {
                            const alreadyDone = subtask.completedDates.includes(dateStr);
                            const newSubtask: Subtask = {
                              ...subtask,
                              completedDates: alreadyDone
                                ? subtask.completedDates.filter((d) => d !== dateStr)
                                : [...subtask.completedDates, dateStr],
                            };
                            const newSubtasks = subtasks.map((s) => s.id === subtask.id ? newSubtask : s);
                            const updatedItem = { ...item, subtasks: newSubtasks };
                            isSubtaskUpdate.current = true;
                            updateItemRef.current(updatedItem);
                            setTodayDragItems((prev) => prev.map((e) => e.item.id === item.id ? { ...e, item: updatedItem } : e));
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <View style={[
                            styles.inlineSubtaskCheckbox,
                            subtaskDone
                              ? { backgroundColor: colors.tint, borderColor: colors.tint }
                              : { backgroundColor: 'transparent', borderColor: colors.secondaryText },
                          ]}>
                            {subtaskDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                          </View>
                          <Text style={[
                            styles.inlineSubtaskTitle,
                            { color: subtaskDone ? colors.secondaryText : colors.text },
                            subtaskDone && { textDecorationLine: 'line-through' },
                          ]}>
                            {subtask.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </Swipeable>
        </ScaleDecorator>
      );
    },
    [expandedSubtaskIds]
  );

  const allCompleted = useMemo(
    () => todayCompletedWithPending.map((item) => ({ item, date: today })),
    [todayCompletedWithPending, today]
  );

  const hasAnything = todayItems.length > 0;

  return (
    <>
      {detailIndex !== null && allEntries.length > 0 && (
        <TaskDetailModal
          entries={allEntries}
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
            if (item.recurringRuleId) {
              Alert.alert(
                'Cannot Delete',
                'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
              );
              return;
            }
            Alert.alert('Delete Item', `Delete "${item.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  moveToTrash(item.id, formatDate(new Date()));
                  afterDelete();
                  showToast('Task deleted', 'delete');
                },
              },
            ]);
          }}
          onReschedule={(item, newDate) => {
            updateItem({ ...item, recurrence: 'once', startDate: formatDate(newDate) });
          }}
          onUpdateItem={updateItem}
          onMarkComplete={() => {
            setDetailIndex(null);
            showToast('Marked complete', 'complete');
          }}
        />
      )}
      <Toast visible={checklistToast !== null} message={checklistToast?.message ?? ''} type={checklistToast?.type ?? 'complete'} />
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
                placeholder="Quick add item…"
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

          {/* ── Completed ── */}
          {allCompleted.length > 0 && (
            <CollapsibleSection title="Completed" count={allCompleted.length} defaultOpen={false}>
              {allCompleted.map(({ item, date }) => (
                <View
                  key={`${item.id}-${formatDate(date)}`}
                  style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
                >
                  <Pressable
                    onPress={() => handleToggle(item, date)}
                    hitSlop={8}
                    style={[styles.circleCheckbox, { backgroundColor: colors.tint, borderColor: colors.tint }]}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.itemRowContent}
                    onPress={() => {
                      const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id);
                      setDetailIndex(idx >= 0 ? idx : 0);
                    }}
                  >
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: colors.secondaryText, textDecorationLine: 'line-through' },
                      ]}
                    >
                      {getTaskEmoji(item.title)} {item.title}
                    </Text>
                  </Pressable>
                </View>
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

function UpcomingTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, updateCompletion, updateItem, moveToTrash, items } = useChecklist();
  const { syncChecklistToList } = useLists();
  // router used in onEdit inside TaskDetailModal

  const today = useMemo(() => startOfDay(new Date()), []);

  const handleToggle = useCallback(
    (itemId: string, date: Date) => {
      const nowCompleted = !isCompleted(itemId, date);
      toggleCompletion(itemId, date);
      syncChecklistToList(itemId, nowCompleted);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [toggleCompletion, syncChecklistToList, isCompleted]
  );

  // Build upcoming entries deduplicated by item id, first occurrence wins
  const { tomorrowEntries, weekEntries, laterEntries } = useMemo(() => {
    const seen = new Set<string>();
    const tomorrowItems: DragItem[] = [];
    const weekItems: DragItem[] = [];
    const laterItems: DragItem[] = [];

    // Tomorrow = day 1
    for (const item of getItemsForDate(addDays(today, 1))) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      tomorrowItems.push({ section: 'tomorrow', item, date: addDays(today, 1), key: `tmrw-${item.id}` });
    }

    // This Week = days 2–6
    for (let d = 2; d <= 6; d++) {
      const date = addDays(today, d);
      for (const item of getItemsForDate(date)) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        weekItems.push({ section: 'week', item, date, key: `week-${item.id}` });
      }
    }

    // Later = day 7 onwards (up to end of year), deduplicated
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    let cursor = addDays(today, 7);
    while (cursor <= endOfYear) {
      for (const item of getItemsForDate(cursor)) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        laterItems.push({ section: 'later', item, date: new Date(cursor), key: `later-${item.id}` });
      }
      cursor = addDays(cursor, 1);
    }

    return { tomorrowEntries: tomorrowItems, weekEntries: weekItems, laterEntries: laterItems };
  }, [today, getItemsForDate, items]);

  const [tomorrowDragItems, setTomorrowDragItems] = useState<DragItem[]>([]);
  const [weekDragItems, setWeekDragItems] = useState<DragItem[]>([]);
  const [laterDragItems, setLaterDragItems] = useState<DragItem[]>([]);

  const isDragging = useRef(false);
  const isSubtaskUpdate = useRef(false);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setTomorrowDragItems(tomorrowEntries);
  }, [tomorrowEntries]);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setWeekDragItems(weekEntries);
  }, [weekEntries]);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setLaterDragItems(laterEntries);
  }, [laterEntries]);

  const [tomorrowOpen, setTomorrowOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [laterOpen, setLaterOpen] = useState(true);

  const handleDragEnd = useCallback((section: SectionId, newOrder: DragItem[]) => {
    isDragging.current = false;
    if (section === 'tomorrow') setTomorrowDragItems(newOrder);
    else if (section === 'week') setWeekDragItems(newOrder);
    else if (section === 'later') setLaterDragItems(newOrder);
  }, []);

  // Split drag items into pending (shown in sections) and completed (shown at bottom)
  const allDragItems = useMemo(
    () => [...tomorrowDragItems, ...weekDragItems, ...laterDragItems],
    [tomorrowDragItems, weekDragItems, laterDragItems]
  );
  const completedEntries = useMemo<DetailEntry[]>(
    () => allDragItems.filter((d) => isCompleted(d.item.id, d.date)).map((d) => ({ item: d.item, date: d.date })),
    [allDragItems, isCompleted]
  );
  const tomorrowPendingItems = useMemo(
    () => tomorrowDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [tomorrowDragItems, isCompleted]
  );
  const weekPendingItems = useMemo(
    () => weekDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [weekDragItems, isCompleted]
  );
  const laterPendingItems = useMemo(
    () => laterDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [laterDragItems, isCompleted]
  );

  // Flat ordered list of all entries (pending + completed) for detail modal navigation
  const allEntries = useMemo<DetailEntry[]>(
    () => [
      ...tomorrowPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...weekPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...laterPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...completedEntries,
    ],
    [tomorrowPendingItems, weekPendingItems, laterPendingItems, completedEntries]
  );
  const allEntriesRef = useRef(allEntries);
  allEntriesRef.current = allEntries;

  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const { toast: checklistToast, show: showToast } = useToast();

  const handleFocusComplete = useCallback(
    (item: ChecklistItem, date: Date, elapsedSeconds: number) => {
      toggleCompletion(item.id, date);
      updateCompletion({ itemId: item.id, date: formatDate(date), notes: `Focus session: ${formatDuration(elapsedSeconds)}` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [toggleCompletion, updateCompletion]
  );

  const moveToTrashRef = useRef(moveToTrash);
  const colorsRef = useRef(colors);
  const updateItemRef = useRef(updateItem);
  const swipeableRefs = useRef<Map<string, { current: SwipeableMethods | null }>>(new Map());
  const showToastRef = useRef(showToast);
  moveToTrashRef.current = moveToTrash;
  colorsRef.current = colors;
  updateItemRef.current = updateItem;
  showToastRef.current = showToast;

  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const expandedSubtaskIdsRef = useRef(expandedSubtaskIds);
  expandedSubtaskIdsRef.current = expandedSubtaskIds;

  const renderDragItem = useCallback(
    ({ item: entry, drag, isActive }: RenderItemParams<DragItem>) => {
      const c = colorsRef.current;
      const { item, date, section } = entry;
      const dateStr = formatDate(date);
      const subtasks = item.subtasks ?? [];
      const expanded = expandedSubtaskIdsRef.current.has(item.id);
      const hasSubtasks = subtasks.length > 0;
      return (
        <ScaleDecorator>
          <Swipeable
            ref={(() => {
              if (!swipeableRefs.current.has(item.id)) {
                swipeableRefs.current.set(item.id, { current: null });
              }
              return swipeableRefs.current.get(item.id) as React.RefObject<SwipeableMethods | null>;
            })()}
            renderRightActions={() => (
              <View style={styles.swipeDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeDeleteText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(direction: 'left' | 'right') => {
              if (direction === 'left') {
                if (item.recurringRuleId) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  swipeableRefs.current.get(item.id)?.current?.close();
                  Alert.alert(
                    'Cannot Delete',
                    'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
                  );
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                moveToTrashRef.current(item.id, formatDate(new Date()));
                showToastRef.current('Task deleted', 'delete');
              }
            }}
            overshootRight={false}
            enabled={!isActive}
          >
            <View
              style={[
                styles.itemRow,
                { backgroundColor: c.cardBackground },
                isActive && styles.itemRowActive,
                (expanded && hasSubtasks) && { alignItems: 'flex-start' },
              ]}
            >
              <Pressable
                onPress={() => handleToggle(item.id, date)}
                hitSlop={8}
                style={[
                  styles.circleCheckbox,
                  isCompleted(item.id, date)
                    ? { backgroundColor: c.tint, borderColor: c.tint }
                    : { backgroundColor: 'transparent', borderColor: c.secondaryText },
                  (expanded && hasSubtasks) && { marginTop: 2 },
                ]}
              >
                {isCompleted(item.id, date) && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </Pressable>
              <View style={styles.itemExpandBlock}>
                <Pressable
                  style={styles.itemRowContent}
                  onPress={() => {
                    const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id);
                    setDetailIndex(idx >= 0 ? idx : 0);
                  }}
                  onLongPress={() => {
                    isDragging.current = true;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    drag();
                  }}
                  delayLongPress={300}
                >
                  <View style={styles.itemTitleBlock}>
                    <Text style={[styles.itemTitle, { color: c.text }]} numberOfLines={1}>
                      {getTaskEmoji(item.title)} {item.title}
                    </Text>
                    {!isActive && !expanded && hasSubtasks && (
                      <View style={styles.subtaskPill}>
                        <Ionicons name="list-outline" size={11} color={c.secondaryText} />
                        <Text style={[styles.subtaskPillText, { color: c.secondaryText }]}>
                          {subtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  {(section === 'week' || section === 'later') && !isActive && (
                    <Text style={[styles.weekDateLabel, { color: c.secondaryText }]}>
                      {formatDisplayDate(date)}
                    </Text>
                  )}
                  {isActive && (
                    <Ionicons
                      name="reorder-three-outline"
                      size={20}
                      color={c.secondaryText}
                      style={{ opacity: 0.4 }}
                    />
                  )}
                  {!isActive && hasSubtasks && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setExpandedSubtaskIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.subtaskExpandBtn}
                    >
                      <Ionicons
                        name={expanded ? 'remove' : 'add'}
                        size={16}
                        color={c.secondaryText}
                      />
                    </Pressable>
                  )}
                </Pressable>
                {expanded && hasSubtasks && (
                  <View style={styles.inlineSubtaskList}>
                    {subtasks.map((subtask) => {
                      const subtaskDone = subtask.completedDates.includes(dateStr);
                      return (
                        <Pressable
                          key={subtask.id}
                          style={styles.inlineSubtaskRow}
                          onPress={() => {
                            const alreadyDone = subtask.completedDates.includes(dateStr);
                            const newSubtask: Subtask = {
                              ...subtask,
                              completedDates: alreadyDone
                                ? subtask.completedDates.filter((d) => d !== dateStr)
                                : [...subtask.completedDates, dateStr],
                            };
                            const newSubtasks = subtasks.map((s) => s.id === subtask.id ? newSubtask : s);
                            const updatedItem = { ...item, subtasks: newSubtasks };
                            const patchList = (prev: DragItem[]) => prev.map((e) => e.item.id === item.id ? { ...e, item: updatedItem } : e);
                            isSubtaskUpdate.current = true;
                            setTomorrowDragItems(patchList);
                            setWeekDragItems(patchList);
                            setLaterDragItems(patchList);
                            updateItemRef.current(updatedItem);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <View style={[
                            styles.inlineSubtaskCheckbox,
                            subtaskDone
                              ? { backgroundColor: c.tint, borderColor: c.tint }
                              : { backgroundColor: 'transparent', borderColor: c.secondaryText },
                          ]}>
                            {subtaskDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                          </View>
                          <Text style={[
                            styles.inlineSubtaskTitle,
                            { color: subtaskDone ? c.secondaryText : c.text },
                            subtaskDone && { textDecorationLine: 'line-through' },
                          ]}>
                            {subtask.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </Swipeable>
        </ScaleDecorator>
      );
    },
    [isCompleted, toggleCompletion, expandedSubtaskIds]
  );

  const hasAnything =
    tomorrowPendingItems.length > 0 || weekPendingItems.length > 0 || laterPendingItems.length > 0 || completedEntries.length > 0;

  if (!hasAnything) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="calendar-outline" size={48} color={colors.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing upcoming</Text>
        <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
          Tap + to add a checklist item
        </Text>
      </View>
    );
  }

  return (
    <>
      {detailIndex !== null && allEntries.length > 0 && (
        <TaskDetailModal
          entries={allEntries}
          initialIndex={detailIndex}
          onClose={() => setDetailIndex(null)}
          onToggle={(item, date) => handleToggle(item.id, date)}
          onFocusComplete={handleFocusComplete}
          isCompleted={isCompleted}
          onEdit={(item) => {
            setDetailIndex(null);
            router.push(`/edit-checklist/${item.id}` as any);
          }}
          onDelete={(item, afterDelete) => {
            if (item.recurringRuleId) {
              Alert.alert(
                'Cannot Delete',
                'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
              );
              return;
            }
            Alert.alert('Delete Item', `Delete "${item.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  moveToTrash(item.id, formatDate(new Date()));
                  afterDelete();
                  showToast('Task deleted', 'delete');
                },
              },
            ]);
          }}
          onReschedule={(item, newDate) => {
            updateItem({ ...item, recurrence: 'once', startDate: formatDate(newDate) });
          }}
          onUpdateItem={updateItem}
          onMarkComplete={() => {
            setDetailIndex(null);
            showToast('Marked complete', 'complete');
          }}
        />
      )}
      <Toast visible={checklistToast !== null} message={checklistToast?.message ?? ''} type={checklistToast?.type ?? 'complete'} />
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
        {tomorrowPendingItems.length > 0 && (
          <DraggableSection
            title="Tomorrow"
            items={tomorrowPendingItems}
            open={tomorrowOpen}
            onToggle={() => setTomorrowOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {weekPendingItems.length > 0 && (
          <DraggableSection
            title="This Week"
            items={weekPendingItems}
            open={weekOpen}
            onToggle={() => setWeekOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {laterPendingItems.length > 0 && (
          <DraggableSection
            title="Later"
            items={laterPendingItems}
            open={laterOpen}
            onToggle={() => setLaterOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {completedEntries.length > 0 && (
          <CollapsibleSection title="Completed" count={completedEntries.length} defaultOpen={false}>
            {completedEntries.map(({ item, date }) => (
              <View
                key={`${item.id}-${formatDate(date)}`}
                style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
              >
                <Pressable
                  onPress={() => handleToggle(item.id, date)}
                  hitSlop={8}
                  style={[styles.circleCheckbox, { backgroundColor: colors.tint, borderColor: colors.tint }]}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </Pressable>
                <Pressable
                  style={styles.itemRowContent}
                  onPress={() => {
                    const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id && formatDate(e.date) === formatDate(date));
                    setDetailIndex(idx >= 0 ? idx : 0);
                  }}
                >
                  <Text style={[styles.itemTitle, { color: colors.secondaryText, textDecorationLine: 'line-through' }]}>
                    {getTaskEmoji(item.title)} {item.title}
                  </Text>
                </Pressable>
              </View>
            ))}
          </CollapsibleSection>
        )}
      </ScrollView>
    </>
  );
}

// ─── Overdue Tab ─────────────────────────────────────────────────────────────

function OverdueTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, updateCompletion, updateItem, moveToTrash, items } = useChecklist();
  const { syncChecklistToList } = useLists();

  const today = useMemo(() => startOfDay(new Date()), []);

  const handleToggle = useCallback(
    (itemId: string, date: Date) => {
      const nowCompleted = !isCompleted(itemId, date);
      toggleCompletion(itemId, date);
      syncChecklistToList(itemId, nowCompleted);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [toggleCompletion, syncChecklistToList, isCompleted]
  );

  // Build overdue entries split into Yesterday / This Week / Earlier
  const { yesterdayEntries, weekEntries, earlierEntries } = useMemo(() => {
    const seen = new Set<string>();
    const yesterdayItems: DragItem[] = [];
    const weekItems: DragItem[] = [];
    const earlierItems: DragItem[] = [];

    const addIfOverdue = (item: ChecklistItem, date: Date, bucket: DragItem[], section: SectionId, key: string) => {
      if (seen.has(item.id)) return;
      if (isDueOnDate(item, today)) return; // already showing in Today
      seen.add(item.id);
      bucket.push({ section, item, date, key: `${key}-${item.id}` });
    };

    // Yesterday = day -1
    for (const item of getItemsForDate(addDays(today, -1))) {
      addIfOverdue(item, addDays(today, -1), yesterdayItems, 'tomorrow', 'yest');
    }

    // This Week = days -2 to -6
    for (let d = 2; d <= 6; d++) {
      const date = addDays(today, -d);
      for (const item of getItemsForDate(date)) {
        addIfOverdue(item, date, weekItems, 'week', `week${d}`);
      }
    }

    // Earlier = days -7 to -30
    for (let d = 7; d <= 30; d++) {
      const date = addDays(today, -d);
      for (const item of getItemsForDate(date)) {
        addIfOverdue(item, date, earlierItems, 'later', `earlier${d}`);
      }
    }

    return { yesterdayEntries: yesterdayItems, weekEntries: weekItems, earlierEntries: earlierItems };
  }, [today, getItemsForDate, items]);

  const [yesterdayDragItems, setYesterdayDragItems] = useState<DragItem[]>([]);
  const [weekDragItems, setWeekDragItems] = useState<DragItem[]>([]);
  const [earlierDragItems, setEarlierDragItems] = useState<DragItem[]>([]);

  const isDragging = useRef(false);
  const isSubtaskUpdate = useRef(false);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setYesterdayDragItems(yesterdayEntries);
  }, [yesterdayEntries]);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setWeekDragItems(weekEntries);
  }, [weekEntries]);

  useEffect(() => {
    if (isDragging.current || isSubtaskUpdate.current) { isSubtaskUpdate.current = false; return; }
    setEarlierDragItems(earlierEntries);
  }, [earlierEntries]);

  const [yesterdayOpen, setYesterdayOpen] = useState(true);
  const [weekOpen, setWeekOpen] = useState(true);
  const [earlierOpen, setEarlierOpen] = useState(true);

  const handleDragEnd = useCallback((section: SectionId, newOrder: DragItem[]) => {
    isDragging.current = false;
    if (section === 'tomorrow') setYesterdayDragItems(newOrder);
    else if (section === 'week') setWeekDragItems(newOrder);
    else if (section === 'later') setEarlierDragItems(newOrder);
  }, []);

  // Split drag items into pending (shown in sections) and completed (shown at bottom)
  const allOverdueDragItems = useMemo(
    () => [...yesterdayDragItems, ...weekDragItems, ...earlierDragItems],
    [yesterdayDragItems, weekDragItems, earlierDragItems]
  );
  const overdueCompletedEntries = useMemo<DetailEntry[]>(
    () => allOverdueDragItems.filter((d) => isCompleted(d.item.id, d.date)).map((d) => ({ item: d.item, date: d.date })),
    [allOverdueDragItems, isCompleted]
  );
  const yesterdayPendingItems = useMemo(
    () => yesterdayDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [yesterdayDragItems, isCompleted]
  );
  const weekPendingItems = useMemo(
    () => weekDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [weekDragItems, isCompleted]
  );
  const earlierPendingItems = useMemo(
    () => earlierDragItems.filter((d) => !isCompleted(d.item.id, d.date)),
    [earlierDragItems, isCompleted]
  );

  // Flat list for detail modal navigation (pending + completed)
  const allEntries = useMemo<DetailEntry[]>(
    () => [
      ...yesterdayPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...weekPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...earlierPendingItems.map((d) => ({ item: d.item, date: d.date })),
      ...overdueCompletedEntries,
    ],
    [yesterdayPendingItems, weekPendingItems, earlierPendingItems, overdueCompletedEntries]
  );
  const allEntriesRef = useRef(allEntries);
  allEntriesRef.current = allEntries;

  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const { toast: checklistToast, show: showToast } = useToast();

  const handleFocusComplete = useCallback(
    (item: ChecklistItem, date: Date, elapsedSeconds: number) => {
      toggleCompletion(item.id, date);
      updateCompletion({ itemId: item.id, date: formatDate(date), notes: `Focus session: ${formatDuration(elapsedSeconds)}` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [toggleCompletion, updateCompletion]
  );

  const moveToTrashRef = useRef(moveToTrash);
  const colorsRef = useRef(colors);
  const updateItemRef = useRef(updateItem);
  const swipeableRefs = useRef<Map<string, { current: SwipeableMethods | null }>>(new Map());
  const showToastRef = useRef(showToast);
  moveToTrashRef.current = moveToTrash;
  colorsRef.current = colors;
  updateItemRef.current = updateItem;
  showToastRef.current = showToast;

  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const expandedSubtaskIdsRef = useRef(expandedSubtaskIds);
  expandedSubtaskIdsRef.current = expandedSubtaskIds;

  const renderDragItem = useCallback(
    ({ item: entry, drag, isActive }: RenderItemParams<DragItem>) => {
      const c = colorsRef.current;
      const { item, date, section } = entry;
      const dateStr = formatDate(date);
      const subtasks = item.subtasks ?? [];
      const expanded = expandedSubtaskIdsRef.current.has(item.id);
      const hasSubtasks = subtasks.length > 0;
      return (
        <ScaleDecorator>
          <Swipeable
            ref={(() => {
              if (!swipeableRefs.current.has(item.id)) {
                swipeableRefs.current.set(item.id, { current: null });
              }
              return swipeableRefs.current.get(item.id) as React.RefObject<SwipeableMethods | null>;
            })()}
            renderRightActions={() => (
              <View style={styles.swipeDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeDeleteText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(direction: 'left' | 'right') => {
              if (direction === 'left') {
                if (item.recurringRuleId) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  swipeableRefs.current.get(item.id)?.current?.close();
                  Alert.alert(
                    'Cannot Delete',
                    'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
                  );
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                moveToTrashRef.current(item.id, formatDate(new Date()));
                showToastRef.current('Task deleted', 'delete');
              }
            }}
            overshootRight={false}
            enabled={!isActive}
          >
            <View
              style={[
                styles.itemRow,
                { backgroundColor: c.cardBackground },
                isActive && styles.itemRowActive,
                (expanded && hasSubtasks) && { alignItems: 'flex-start' },
              ]}
            >
              <Pressable
                onPress={() => handleToggle(item.id, date)}
                hitSlop={8}
                style={[
                  styles.circleCheckbox,
                  isCompleted(item.id, date)
                    ? { backgroundColor: c.tint, borderColor: c.tint }
                    : { backgroundColor: 'transparent', borderColor: c.secondaryText },
                  (expanded && hasSubtasks) && { marginTop: 2 },
                ]}
              >
                {isCompleted(item.id, date) && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </Pressable>
              <View style={styles.itemExpandBlock}>
                <Pressable
                  style={styles.itemRowContent}
                  onPress={() => {
                    const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id);
                    setDetailIndex(idx >= 0 ? idx : 0);
                  }}
                  onLongPress={() => {
                    isDragging.current = true;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    drag();
                  }}
                  delayLongPress={300}
                >
                  <View style={styles.itemTitleBlock}>
                    <Text style={[styles.itemTitle, { color: c.text }]} numberOfLines={1}>
                      {getTaskEmoji(item.title)} {item.title}
                    </Text>
                    {!isActive && !expanded && hasSubtasks && (
                      <View style={styles.subtaskPill}>
                        <Ionicons name="list-outline" size={11} color={c.secondaryText} />
                        <Text style={[styles.subtaskPillText, { color: c.secondaryText }]}>
                          {subtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  {(section === 'week' || section === 'later') && !isActive && (
                    <Text style={[styles.weekDateLabel, { color: c.secondaryText }]}>
                      {formatDisplayDate(date)}
                    </Text>
                  )}
                  {isActive && (
                    <Ionicons
                      name="reorder-three-outline"
                      size={20}
                      color={c.secondaryText}
                      style={{ opacity: 0.4 }}
                    />
                  )}
                  {!isActive && hasSubtasks && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setExpandedSubtaskIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.subtaskExpandBtn}
                    >
                      <Ionicons
                        name={expanded ? 'remove' : 'add'}
                        size={16}
                        color={c.secondaryText}
                      />
                    </Pressable>
                  )}
                </Pressable>
                {expanded && hasSubtasks && (
                  <View style={styles.inlineSubtaskList}>
                    {subtasks.map((subtask) => {
                      const subtaskDone = subtask.completedDates.includes(dateStr);
                      return (
                        <Pressable
                          key={subtask.id}
                          style={styles.inlineSubtaskRow}
                          onPress={() => {
                            const alreadyDone = subtask.completedDates.includes(dateStr);
                            const newSubtask: Subtask = {
                              ...subtask,
                              completedDates: alreadyDone
                                ? subtask.completedDates.filter((d) => d !== dateStr)
                                : [...subtask.completedDates, dateStr],
                            };
                            const newSubtasks = subtasks.map((s) => s.id === subtask.id ? newSubtask : s);
                            const updatedItem = { ...item, subtasks: newSubtasks };
                            const patchList = (prev: DragItem[]) => prev.map((e) => e.item.id === item.id ? { ...e, item: updatedItem } : e);
                            isSubtaskUpdate.current = true;
                            setYesterdayDragItems(patchList);
                            setWeekDragItems(patchList);
                            setEarlierDragItems(patchList);
                            updateItemRef.current(updatedItem);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <View style={[
                            styles.inlineSubtaskCheckbox,
                            subtaskDone
                              ? { backgroundColor: c.tint, borderColor: c.tint }
                              : { backgroundColor: 'transparent', borderColor: c.secondaryText },
                          ]}>
                            {subtaskDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                          </View>
                          <Text style={[
                            styles.inlineSubtaskTitle,
                            { color: subtaskDone ? c.secondaryText : c.text },
                            subtaskDone && { textDecorationLine: 'line-through' },
                          ]}>
                            {subtask.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </Swipeable>
        </ScaleDecorator>
      );
    },
    [isCompleted, toggleCompletion, expandedSubtaskIds]
  );

  const hasAnything =
    yesterdayPendingItems.length > 0 || weekPendingItems.length > 0 || earlierPendingItems.length > 0 || overdueCompletedEntries.length > 0;

  if (!hasAnything) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="ribbon-outline" size={48} color={colors.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No overdue items</Text>
        <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
          You're all caught up
        </Text>
      </View>
    );
  }

  return (
    <>
      {detailIndex !== null && allEntries.length > 0 && (
        <TaskDetailModal
          entries={allEntries}
          initialIndex={detailIndex}
          onClose={() => setDetailIndex(null)}
          onToggle={(item, date) => handleToggle(item.id, date)}
          onFocusComplete={handleFocusComplete}
          isCompleted={isCompleted}
          onEdit={(item) => {
            setDetailIndex(null);
            router.push(`/edit-checklist/${item.id}` as any);
          }}
          onDelete={(item, afterDelete) => {
            if (item.recurringRuleId) {
              Alert.alert(
                'Cannot Delete',
                'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
              );
              return;
            }
            Alert.alert('Delete Item', `Delete "${item.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  moveToTrash(item.id, formatDate(new Date()));
                  afterDelete();
                  showToast('Task deleted', 'delete');
                },
              },
            ]);
          }}
          onReschedule={(item, newDate) => {
            updateItem({ ...item, recurrence: 'once', startDate: formatDate(newDate) });
          }}
          onUpdateItem={updateItem}
          onMarkComplete={() => {
            setDetailIndex(null);
            showToast('Marked complete', 'complete');
          }}
        />
      )}
      <Toast visible={checklistToast !== null} message={checklistToast?.message ?? ''} type={checklistToast?.type ?? 'complete'} />
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
        {yesterdayPendingItems.length > 0 && (
          <DraggableSection
            title="Yesterday"
            items={yesterdayPendingItems}
            open={yesterdayOpen}
            onToggle={() => setYesterdayOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {weekPendingItems.length > 0 && (
          <DraggableSection
            title="This Week"
            items={weekPendingItems}
            open={weekOpen}
            onToggle={() => setWeekOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {earlierPendingItems.length > 0 && (
          <DraggableSection
            title="Earlier"
            items={earlierPendingItems}
            open={earlierOpen}
            onToggle={() => setEarlierOpen((o) => !o)}
            onDragEnd={handleDragEnd}
            renderDragItem={renderDragItem}
          />
        )}
        {overdueCompletedEntries.length > 0 && (
          <CollapsibleSection title="Completed" count={overdueCompletedEntries.length} defaultOpen={false}>
            {overdueCompletedEntries.map(({ item, date }) => (
              <View
                key={`${item.id}-${formatDate(date)}`}
                style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
              >
                <Pressable
                  onPress={() => handleToggle(item.id, date)}
                  hitSlop={8}
                  style={[styles.circleCheckbox, { backgroundColor: colors.tint, borderColor: colors.tint }]}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </Pressable>
                <Pressable
                  style={styles.itemRowContent}
                  onPress={() => {
                    const idx = allEntriesRef.current.findIndex((e) => e.item.id === item.id && formatDate(e.date) === formatDate(date));
                    setDetailIndex(idx >= 0 ? idx : 0);
                  }}
                >
                  <Text style={[styles.itemTitle, { color: colors.secondaryText, textDecorationLine: 'line-through' }]}>
                    {getTaskEmoji(item.title)} {item.title}
                  </Text>
                </Pressable>
              </View>
            ))}
          </CollapsibleSection>
        )}
      </ScrollView>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recurrenceLabel(item: ChecklistItem): string {
  switch (item.recurrence) {
    case 'daily': return 'Daily';
    case 'weekdays': return 'Weekdays';
    case 'weekends': return 'Weekends';
    case 'specific-days': {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return (item.specificDays ?? []).map((d) => names[d]).join(', ') || 'Specific days';
    }
    case 'every-n-days':
      return `Every ${item.everyNDays ?? '?'} days`;
    default:
      return '';
  }
}

function timeAgoLabel(trashedAt: string): string {
  const trashed = new Date(trashedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - trashed.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// ─── Recurring View ───────────────────────────────────────────────────────────

function RecurringView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { items, deleteRecurringRule } = useChecklist();

  const recurringItems = useMemo(
    () => items.filter((i) => i.recurrence !== 'once' && !i.trashedAt && i.kind !== 'template' && !i.recurringRuleId),
    [items]
  );

  if (recurringItems.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="repeat-outline" size={48} color={colors.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No recurring tasks</Text>
        <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
          Tap + to create a repeating task
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {recurringItems.map((item) => (
        <Swipeable
          key={item.id}
          renderRightActions={() => (
            <View style={styles.swipeDeleteAction}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.swipeDeleteText}>Delete</Text>
            </View>
          )}
          onSwipeableOpen={(direction: 'left' | 'right') => {
            if (direction === 'left') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert('Delete Recurring Task', `Delete "${item.title}"? This will also delete all instances of this task.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteRecurringRule(item.id) },
              ]);
            }
          }}
          overshootRight={false}
        >
          <Pressable
            style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.push(`/edit-checklist/${item.id}` as any)}
          >
            <Ionicons name="repeat-outline" size={18} color={colors.secondaryText} />
            <View style={styles.itemExpandBlock}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {getTaskEmoji(item.title)} {item.title}
              </Text>
              <Text style={[viewStyles.recurLabel, { color: colors.secondaryText }]}>
                {recurrenceLabel(item)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </Pressable>
        </Swipeable>
      ))}
    </ScrollView>
  );
}

// ─── Templates View ───────────────────────────────────────────────────────────

function TemplatesView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { items, deleteItem } = useChecklist();

  const templateItems = useMemo(
    () => items.filter((i) => i.kind === 'template'),
    [items]
  );

  if (templateItems.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="copy-outline" size={48} color={colors.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No templates</Text>
        <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
          Tap + to create a reusable task template
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {templateItems.map((item) => (
        <Swipeable
          key={item.id}
          renderRightActions={() => (
            <View style={styles.swipeDeleteAction}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.swipeDeleteText}>Delete</Text>
            </View>
          )}
          onSwipeableOpen={(direction: 'left' | 'right') => {
            if (direction === 'left') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert('Delete Template', `Delete "${item.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
              ]);
            }
          }}
          overshootRight={false}
        >
          <View style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="copy-outline" size={18} color={colors.secondaryText} />
            <View style={styles.itemExpandBlock}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {getTaskEmoji(item.title)} {item.title}
              </Text>
              {(item.subtasks?.length ?? 0) > 0 && (
                <Text style={[viewStyles.recurLabel, { color: colors.secondaryText }]}>
                  {item.subtasks!.length} subtask{item.subtasks!.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <View style={viewStyles.templateActions}>
              <Pressable
                hitSlop={8}
                style={[viewStyles.templateBtn, { borderColor: colors.tint }]}
                onPress={() => router.push(`/edit-checklist/new?templateId=${item.id}` as any)}
              >
                <Text style={[viewStyles.templateBtnText, { color: colors.tint }]}>Use</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => router.push(`/edit-checklist/${item.id}?kind=template` as any)}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.secondaryText} />
              </Pressable>
            </View>
          </View>
        </Swipeable>
      ))}
    </ScrollView>
  );
}

// ─── Trash View ───────────────────────────────────────────────────────────────

function TrashView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, restoreFromTrash, deleteTrashItem } = useChecklist();

  const trashItems = useMemo(
    () => items.filter((i) => i.trashedAt).sort((a, b) => (b.trashedAt! > a.trashedAt! ? 1 : -1)),
    [items]
  );

  const handleEmptyTrash = () => {
    Alert.alert('Empty Trash', 'Permanently delete all trashed items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Empty Trash',
        style: 'destructive',
        onPress: () => { trashItems.forEach((i) => deleteTrashItem(i.id)); },
      },
    ]);
  };

  if (trashItems.length === 0) {
    return (
      <View style={[styles.tabContent, styles.emptyState]}>
        <Ionicons name="trash-outline" size={48} color={colors.secondaryText} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Trash is empty</Text>
        <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
          Completed one-time tasks appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.listContent}>
      {trashItems.map((item) => (
        <Swipeable
          key={item.id}
          renderLeftActions={() => (
            <View style={viewStyles.swipeRestoreAction}>
              <Ionicons name="arrow-undo-outline" size={22} color="#fff" />
              <Text style={styles.swipeDeleteText}>Restore</Text>
            </View>
          )}
          renderRightActions={() => (
            <View style={styles.swipeDeleteAction}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.swipeDeleteText}>Delete</Text>
            </View>
          )}
          onSwipeableOpen={(direction: 'left' | 'right') => {
            if (direction === 'right') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              restoreFromTrash(item.id);
            } else if (direction === 'left') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              deleteTrashItem(item.id);
            }
          }}
          overshootLeft={false}
          overshootRight={false}
        >
          <View style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.secondaryText} style={{ opacity: 0.5 }} />
            <View style={styles.itemExpandBlock}>
              <Text style={[styles.itemTitle, { color: colors.secondaryText, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                {getTaskEmoji(item.title)} {item.title}
              </Text>
              <Text style={[viewStyles.recurLabel, { color: colors.secondaryText }]}>
                {timeAgoLabel(item.trashedAt!)}
              </Text>
            </View>
          </View>
        </Swipeable>
      ))}

      <Pressable
        style={[viewStyles.emptyTrashBtn, { borderColor: colors.destructive }]}
        onPress={handleEmptyTrash}
      >
        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
        <Text style={[viewStyles.emptyTrashText, { color: colors.destructive }]}>Empty Trash</Text>
      </Pressable>
    </ScrollView>
  );
}

const viewStyles = StyleSheet.create({
  recurLabel: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  templateBtn: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 3,
  },
  templateBtnText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  swipeRestoreAction: {
    flex: 1,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  emptyTrashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.lg,
  },
  emptyTrashText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

type TabId = 'today' | 'upcoming' | 'overdue';
type ViewId = 'tasks' | 'recurring' | 'templates' | 'trash';

const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
];

const MENU_ITEMS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
  { id: 'recurring', label: 'Recurring', icon: 'repeat-outline' },
  { id: 'templates', label: 'Templates', icon: 'copy-outline' },
  { id: 'trash', label: 'Trash', icon: 'trash-outline' },
];


export default function ChecklistScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottom = insets.bottom + 70;
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [activeView, setActiveView] = useState<ViewId>('tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { spawnRecurringInstances } = useChecklist();

  // Always reset to Tasks view when navigating to this tab
  useFocusEffect(
    useCallback(() => {
      setActiveView('tasks');
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          hitSlop={8}
          onPress={() => setDrawerOpen(true)}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <Ionicons name="menu-outline" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, colors.text]);

  const fabAction = () => {
    if (activeView === 'templates') {
      router.push('/edit-checklist/new?kind=template' as any);
    } else {
      router.push('/edit-checklist/new' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Drawer modal */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Pressable style={navStyles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <Pressable
            style={[navStyles.drawer, { backgroundColor: colors.cardBackground }]}
            onPress={() => {}}
          >
            <View style={[navStyles.drawerHandle, { backgroundColor: colors.separator }]} />
            {MENU_ITEMS.map((item) => {
              const active = activeView === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[navStyles.drawerRow, active && { backgroundColor: colors.tint + '18' }]}
                  onPress={() => {
                    setActiveView(item.id);
                    setDrawerOpen(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={active ? colors.tint : colors.secondaryText}
                  />
                  <Text style={[navStyles.drawerLabel, { color: active ? colors.tint : colors.text }]}>
                    {item.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={colors.tint} style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tasks view: sub-tab bar + tab content */}
      {activeView === 'tasks' && (
        <>
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
          {activeTab === 'today' && <TodayTab />}
          {activeTab === 'upcoming' && <UpcomingTab />}
          {activeTab === 'overdue' && <OverdueTab />}
        </>
      )}

      {activeView === 'recurring' && <RecurringView />}
      {activeView === 'templates' && <TemplatesView />}
      {activeView === 'trash' && <TrashView />}

      {/* FAB — hidden on trash */}
      {activeView !== 'trash' && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.tint, bottom: fabBottom }]}
          onPress={fabAction}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const navStyles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  drawer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    paddingTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Layout.spacing.md,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.xs,
  },
  drawerLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});

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
  itemTitleBlock: {
    flex: 1,
    flexDirection: 'column',
  },
  subtaskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  subtaskPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemExpandBlock: {
    flex: 1,
    flexDirection: 'column',
  },
  subtaskExpandBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSubtaskList: {
    marginTop: Layout.spacing.sm,
    gap: Layout.spacing.xs,
  },
  inlineSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: 3,
  },
  inlineSubtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inlineSubtaskTitle: {
    fontSize: Layout.fontSize.caption,
    flex: 1,
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
    right: Layout.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
