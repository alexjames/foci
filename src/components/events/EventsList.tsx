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
import { EventsConfig, Event, EventRecurrence } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

function getEventColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
}

function getDaysUntil(dateStr: string, recurrence?: EventRecurrence): number {
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
    // Same day-of-month, next upcoming month
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

function getDaysUntilNextOccurrence(dateStr: string, recurrence?: EventRecurrence): number {
  return getDaysUntil(dateStr, recurrence);
}

function formatRecurrence(rec: EventRecurrence): string | null {
  switch (rec.type) {
    case 'annually': return 'Yearly';
    case 'monthly': return 'Monthly';
    case 'every-x-months': return `Every ${rec.months}mo`;
    case 'every-x-days': return `Every ${rec.days}d`;
    default: return null;
  }
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

type TimeUnit = 'days' | 'weeks' | 'months';

function getAvailableUnits(days: number): TimeUnit[] {
  if (days < 7) return ['days'];
  if (days < 30) return ['days', 'weeks'];
  return ['days', 'weeks', 'months'];
}

type TimePart = { value: number; label: string };

function formatTimeUnit(days: number, unit: TimeUnit): { parts: TimePart[]; suffix: string } {
  if (days === 0) return { parts: [{ value: 0, label: '' }], suffix: 'today' };

  switch (unit) {
    case 'days':
      return { parts: [{ value: days, label: '' }], suffix: days === 1 ? 'day away' : 'days away' };
    case 'weeks': {
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      return {
        parts: [
          { value: weeks, label: 'W' },
          ...(remDays > 0 ? [{ value: remDays, label: 'D' }] : []),
        ],
        suffix: 'away',
      };
    }
    case 'months': {
      const months = Math.floor(days / 30);
      const rem = days % 30;
      const weeks = Math.floor(rem / 7);
      const remDays = rem % 7;
      return {
        parts: [
          { value: months, label: 'M' },
          ...(weeks > 0 ? [{ value: weeks, label: 'W' }] : []),
          ...(remDays > 0 ? [{ value: remDays, label: 'D' }] : []),
        ],
        suffix: 'away',
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

function SwipeableEventCard({
  event,
  scheme,
  showHandle,
  onCardPress,
  onDelete,
  drag,
  isActive,
}: {
  event: Event;
  scheme: 'light' | 'dark';
  showHandle: boolean;
  onCardPress: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
}) {
  const colors = Colors[scheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getEventColor(event.color, scheme);

  const handleSwipeLeft = useCallback(() => {
    onDelete(event.id, event.title);
    swipeableRef.current?.close();
  }, [event.id, event.title, onDelete]);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <RightAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') handleSwipeLeft();
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onCardPress(event.id)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[
              styles.card,
              { backgroundColor: colors.cardBackground, borderLeftColor: accentColor },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: accentColor + '22' }]}>
              <Ionicons name={event.icon as any} size={22} color={accentColor} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardDate, { color: colors.secondaryText }]}>
                  {formatEventDate(event.date)}
                </Text>
                {event.recurrence && event.recurrence.type !== 'none' && (
                  <Text style={[styles.recurrenceBadge, { color: accentColor }]}>
                    {formatRecurrence(event.recurrence)}
                  </Text>
                )}
              </View>
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

function EventDetailSheet({
  event,
  visible,
  onClose,
}: {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [unitIndex, setUnitIndex] = useState(0);

  const daysUntil = event ? getDaysUntil(event.date, event.recurrence) : 0;
  const availableUnits = event ? getAvailableUnits(daysUntil) : (['days'] as TimeUnit[]);

  const handleUnitTap = () => {
    setUnitIndex((prev) => (prev + 1) % availableUnits.length);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  React.useEffect(() => { setUnitIndex(0); }, [event?.id]);

  if (!event) return null;

  const accentColor = getEventColor(event.color, colorScheme);
  const currentUnit = availableUnits[Math.min(unitIndex, availableUnits.length - 1)];
  const { parts, suffix } = formatTimeUnit(daysUntil, currentUnit);
  const hasMore = availableUnits.length > 1;

  const handleConfigure = () => {
    onClose();
    router.push(`/edit-event/${event.id}` as any);
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
        <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.sheetTitleRow}>
          <View style={{ width: 38 }} />
          <View style={styles.sheetTitleCenter}>
            <Ionicons name={event.icon as any} size={28} color={accentColor} style={styles.sheetIcon} />
            <Text style={[styles.sheetTitle, { color: accentColor }]} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
          <Pressable onPress={handleConfigure} hitSlop={8} style={styles.configureButton}>
            <Ionicons name="settings-outline" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        <View style={[styles.dueDateRow, { backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.secondaryText} />
          <Text style={[styles.dueDateText, { color: colors.secondaryText }]}>
            {formatEventDate(event.date)}
          </Text>
        </View>

        <Pressable style={styles.statsArea} onPress={hasMore ? handleUnitTap : undefined}>
          <View style={styles.statPartsRow}>
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={[styles.statPartSpacer, { color: accentColor }]}> </Text>}
                <Text style={[styles.statPartValue, { color: accentColor }]}>{part.value}</Text>
                {part.label ? <Text style={[styles.statPartLabel, { color: accentColor }]}>{part.label}</Text> : null}
              </React.Fragment>
            ))}
          </View>
          <Text style={[styles.statSuffix, { color: colors.secondaryText }]}>{suffix}</Text>
          {hasMore && (
            <Ionicons name="repeat-outline" size={14} color={colors.secondaryText} style={{ opacity: 0.4, marginTop: 4 }} />
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const DEFAULT_CONFIG: EventsConfig = {
  toolId: 'events',
  events: [],
};

export type SortMode = 'manual' | 'date' | 'name';

export function EventsList({ sortMode = 'manual' }: { sortMode?: SortMode }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<EventsConfig>('events');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const events = config?.events ?? [];

  const sortedEvents = React.useMemo(() => {
    if (sortMode === 'date') {
      return [...events].sort((a, b) => getDaysUntilNextOccurrence(a.date, a.recurrence) - getDaysUntilNextOccurrence(b.date, b.recurrence));
    }
    if (sortMode === 'name') {
      return [...events].sort((a, b) => a.title.localeCompare(b.title));
    }
    return events;
  }, [events, sortMode]);

  const selectedEvent = selectedId ? events.find((e) => e.id === selectedId) ?? null : null;

  const removeEvent = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        events: current.events.filter((e) => e.id !== id),
      });
    },
    [config, setConfig]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Event', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeEvent(id),
        },
      ]);
    },
    [removeEvent]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Event[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, events: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Event>) => (
      <SwipeableEventCard
        event={item}
        scheme={colorScheme}
        showHandle={isDragging}
        onCardPress={setSelectedId}
        onDelete={handleDelete}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
      />
    ),
    [colorScheme, isDragging, handleDelete]
  );

  return (
    <View style={styles.container}>
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No events yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add birthdays, anniversaries, and more
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={sortedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={sortMode === 'manual' ? 1 : 999}
        />
      )}
      <View style={styles.fabContainer}>
        <Pressable
          onPress={() => router.push('/edit-event/new' as any)}
          style={styles.fab}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
      <EventDetailSheet
        event={selectedEvent}
        visible={selectedId !== null}
        onClose={() => setSelectedId(null)}
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
    gap: Layout.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginTop: 2,
  },
  cardDate: {
    fontSize: Layout.fontSize.caption,
  },
  recurrenceBadge: {
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
    paddingHorizontal: Layout.spacing.xl,
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
  sheetTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sheetIcon: {
    marginBottom: Layout.spacing.xs,
  },
  sheetTitle: {
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
});
