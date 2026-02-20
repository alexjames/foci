import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  Modal,
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
import { DeadlineTrackerConfig, Deadline } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

function getDeadlineColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDeadlineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDaysNumber(days: number): string {
  return Math.abs(days).toString();
}

function getDaysSubLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'day left';
  if (days > 1) return 'days left';
  if (days === -1) return 'day ago';
  return 'days ago';
}

type TimeUnit = 'days' | 'weeks' | 'months' | 'years';

function getAvailableUnits(days: number): TimeUnit[] {
  const abs = Math.abs(days);
  if (abs < 7) return ['days'];
  if (abs < 30) return ['days', 'weeks'];
  if (abs < 365) return ['days', 'weeks', 'months'];
  return ['days', 'weeks', 'months', 'years'];
}

type TimePart = { value: number; label: string };

function formatTimeUnit(days: number, unit: TimeUnit): { parts: TimePart[]; suffix: string } {
  const abs = Math.abs(days);
  const suffix = days >= 0 ? 'left' : 'ago';

  if (days === 0) return { parts: [{ value: 0, label: '' }], suffix: 'days today' };

  switch (unit) {
    case 'days':
      return { parts: [{ value: abs, label: '' }], suffix: days > 0 ? 'days left' : 'days ago' };
    case 'weeks': {
      const weeks = Math.floor(abs / 7);
      const remDays = abs % 7;
      return {
        parts: [
          { value: weeks, label: 'W' },
          ...(remDays > 0 ? [{ value: remDays, label: 'D' }] : []),
        ],
        suffix,
      };
    }
    case 'months': {
      const months = Math.floor(abs / 30);
      const rem = abs % 30;
      const weeks = Math.floor(rem / 7);
      const remDays = rem % 7;
      return {
        parts: [
          { value: months, label: 'M' },
          ...(weeks > 0 ? [{ value: weeks, label: 'W' }] : []),
          ...(remDays > 0 ? [{ value: remDays, label: 'D' }] : []),
        ],
        suffix,
      };
    }
    case 'years': {
      const years = Math.floor(abs / 365);
      const rem = abs % 365;
      const months = Math.floor(rem / 30);
      const rem2 = rem % 30;
      const weeks = Math.floor(rem2 / 7);
      const remDays = rem2 % 7;
      return {
        parts: [
          { value: years, label: 'Y' },
          ...(months > 0 ? [{ value: months, label: 'M' }] : []),
          ...(weeks > 0 ? [{ value: weeks, label: 'W' }] : []),
          ...(remDays > 0 ? [{ value: remDays, label: 'D' }] : []),
        ],
        suffix,
      };
    }
  }
}

function RightAction() {
  return (
    <View style={styles.swipeActionRight}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Delete</Text>
      </View>
    </View>
  );
}

function LeftAction() {
  return (
    <View style={styles.swipeActionLeft}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Complete</Text>
      </View>
    </View>
  );
}

function SwipeableDeadlineCard({
  deadline,
  scheme,
  showHandle,
  onCardPress,
  onComplete,
  onDelete,
  drag,
  isActive,
}: {
  deadline: Deadline;
  scheme: 'light' | 'dark';
  showHandle: boolean;
  onCardPress: (id: string) => void;
  onComplete: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
}) {
  const colors = Colors[scheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getDeadlineColor(deadline.color, scheme);
  const daysUntil = getDaysUntil(deadline.date);
  const isPast = daysUntil < 0;

  const handleSwipeRight = useCallback(() => {
    onComplete(deadline.id, deadline.title);
    swipeableRef.current?.close();
  }, [deadline.id, deadline.title, onComplete]);

  const handleSwipeLeft = useCallback(() => {
    onDelete(deadline.id, deadline.title);
    swipeableRef.current?.close();
  }, [deadline.id, deadline.title, onDelete]);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <RightAction />}
          renderLeftActions={() => <LeftAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'left') handleSwipeRight();
            else handleSwipeLeft();
          }}
          overshootRight={false}
          overshootLeft={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onCardPress(deadline.id)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[
              styles.card,
              { backgroundColor: colors.cardBackground, borderLeftColor: accentColor },
            ]}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {deadline.title}
              </Text>
              <Text style={[styles.cardDate, { color: colors.secondaryText }]}>
                {formatDeadlineDate(deadline.date)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.cardRight}>
              <Text style={[styles.daysNumber, { color: isPast ? colors.destructive : accentColor }]}>
                {daysUntil === 0 ? '0' : getDaysNumber(daysUntil)}
              </Text>
              <Text style={[styles.daysSubLabel, { color: isPast ? colors.destructive : accentColor }]}>
                {getDaysSubLabel(daysUntil)}
              </Text>
            </View>
            {showHandle && (
              <Ionicons
                name="reorder-three-outline"
                size={20}
                color={colors.secondaryText}
                style={styles.dragHandle}
              />
            )}
          </Pressable>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

function DeadlineDetailSheet({
  deadline,
  visible,
  onClose,
  onComplete,
}: {
  deadline: Deadline | null;
  visible: boolean;
  onClose: () => void;
  onComplete: (id: string, title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [unitIndex, setUnitIndex] = useState(0);

  const daysUntil = deadline ? getDaysUntil(deadline.date) : 0;
  const availableUnits = deadline ? getAvailableUnits(daysUntil) : ['days' as TimeUnit];
  const handleUnitTap = () => {
    setUnitIndex((prev) => (prev + 1) % availableUnits.length);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Reset unit index when deadline changes
  React.useEffect(() => { setUnitIndex(0); }, [deadline?.id]);

  if (!deadline) return null;

  const accentColor = getDeadlineColor(deadline.color, colorScheme);
  const isPast = daysUntil < 0;
  const countColor = isPast ? colors.destructive : accentColor;

  const currentUnit = availableUnits[Math.min(unitIndex, availableUnits.length - 1)];
  const { parts, suffix } = formatTimeUnit(daysUntil, currentUnit);
  const hasMore = availableUnits.length > 1;

  const handleConfigure = () => {
    onClose();
    router.push(`/edit-deadline/${deadline.id}` as any);
  };

  const handleComplete = () => {
    onComplete(deadline.id, deadline.title);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.cardBackground,
            borderTopColor: accentColor,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

        {/* Title row */}
        <View style={styles.sheetTitleRow}>
          <View style={{ width: 38 }} />
          <Text style={[styles.sheetTitle, { color: accentColor }]} numberOfLines={2}>
            {deadline.title}
          </Text>
          <Pressable onPress={handleConfigure} hitSlop={8} style={styles.configureButton}>
            <Ionicons name="settings-outline" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        {/* Due date */}
        <View style={[styles.dueDateRow, { backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.secondaryText} />
          <Text style={[styles.dueDateText, { color: colors.secondaryText }]}>
            Due {formatDeadlineDate(deadline.date)}
          </Text>
        </View>

        {/* Stats — tap to cycle unit */}
        <Pressable style={styles.statsArea} onPress={hasMore ? handleUnitTap : undefined}>
          <View style={styles.statPartsRow}>
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={[styles.statPartSpacer, { color: countColor }]}> </Text>}
                <Text style={[styles.statPartValue, { color: countColor }]}>{part.value}</Text>
                {part.label ? <Text style={[styles.statPartLabel, { color: countColor }]}>{part.label}</Text> : null}
              </React.Fragment>
            ))}
          </View>
          <Text style={[styles.statSuffix, { color: colors.secondaryText }]}>{suffix}</Text>
          {hasMore && (
            <Ionicons name="repeat-outline" size={14} color={colors.secondaryText} style={{ opacity: 0.4, marginTop: 4 }} />
          )}
        </Pressable>

        {/* Complete button */}
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => [styles.completeButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.completeButtonText}>Mark as Complete</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const DEFAULT_CONFIG: DeadlineTrackerConfig = {
  toolId: 'deadline-tracker',
  deadlines: [],
  notificationEnabled: false,
};

export function DeadlineTrackerList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const deadlines = config?.deadlines ?? [];
  const canAdd = deadlines.length < 10;

  const selectedDeadline = selectedId ? deadlines.find((d) => d.id === selectedId) ?? null : null;

  const removeDeadline = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        deadlines: current.deadlines.filter((d) => d.id !== id),
      });
    },
    [config, setConfig]
  );

  const handleComplete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Complete Deadline', `Mark "${title}" as complete? This will remove it.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            removeDeadline(id);
            setSelectedId(null);
          },
        },
      ]);
    },
    [removeDeadline]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Deadline', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeDeadline(id),
        },
      ]);
    },
    [removeDeadline]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Deadline[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, deadlines: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Deadline>) => (
      <SwipeableDeadlineCard
        deadline={item}
        scheme={colorScheme}
        showHandle={isDragging}
        onCardPress={setSelectedId}
        onComplete={handleComplete}
        onDelete={handleDelete}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
      />
    ),
    [colorScheme, isDragging, handleComplete, handleDelete]
  );

  return (
    <View style={styles.container}>
      {deadlines.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No deadlines yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add your first deadline
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={deadlines}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}
      {!canAdd && deadlines.length > 0 && (
        <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
          <Text style={[styles.limitText, { color: colors.secondaryText }]}>
            Maximum of 10 deadlines reached.
          </Text>
        </View>
      )}
      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push('/edit-deadline/new' as any)}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      )}
      <DeadlineDetailSheet
        deadline={selectedDeadline}
        visible={selectedId !== null}
        onClose={() => setSelectedId(null)}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
    paddingBottom: 100,
  },
  swipeableContainer: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Layout.spacing.sm,
  },
  swipeableActive: {
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  swipeActionRight: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionLeft: {
    flex: 1,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionContent: {
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderLeftWidth: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Layout.spacing.md,
  },
  cardRight: {
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    lineHeight: 24,
  },
  daysSubLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  dragHandle: {
    marginLeft: Layout.spacing.sm,
    opacity: 0.4,
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
  limitMessage: {
    flexDirection: 'row',
    margin: Layout.spacing.md,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
    alignItems: 'center',
  },
  limitText: {
    flex: 1,
    fontSize: Layout.fontSize.caption,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Detail sheet
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 4,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Layout.spacing.lg,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.md,
  },
  sheetTitle: {
    flex: 1,
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
  },
  configureButton: {
    paddingLeft: Layout.spacing.md,
    paddingTop: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.lg,
  },
  dueDateText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  statsArea: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
  },
  statPartsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statPartValue: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
  },
  statPartLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginRight: Layout.spacing.sm,
  },
  statPartSpacer: {
    fontSize: Layout.fontSize.heading,
  },
  statSuffix: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginTop: 4,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  swipeHint: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    opacity: 0.6,
  },
});
