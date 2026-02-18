import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
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
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDaysLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;
  if (days === -1) return '1 day ago';
  return `${Math.abs(days)} days ago`;
}

function RightAction() {
  return (
    <View style={styles.swipeActionRight}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.swipeText}>Delete</Text>
    </View>
  );
}

function LeftAction() {
  return (
    <View style={styles.swipeActionLeft}>
      <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
      <Text style={styles.swipeText}>Complete</Text>
    </View>
  );
}

function SwipeableDeadlineCard({
  deadline,
  scheme,
  onComplete,
  onDelete,
}: {
  deadline: Deadline;
  scheme: 'light' | 'dark';
  onComplete: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const colors = Colors[scheme];
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);
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
      containerStyle={styles.swipeableContainer}
    >
      <Pressable
        onPress={() => router.push(`/edit-deadline/${deadline.id}` as any)}
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
        <View style={styles.cardRight}>
          <Text
            style={[
              styles.daysText,
              { color: isPast ? colors.destructive : accentColor },
            ]}
          >
            {getDaysLabel(daysUntil)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export function DeadlineTrackerList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');

  const deadlines = config?.deadlines ?? [];
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const canAdd = deadlines.length < 10;

  const defaultConfig: DeadlineTrackerConfig = {
    toolId: 'deadline-tracker',
    deadlines: [],
    notificationEnabled: false,
  };

  const removeDeadline = useCallback(
    (id: string) => {
      const current = config ?? defaultConfig;
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
          onPress: () => removeDeadline(id),
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No deadlines yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
              Tap + to add your first deadline
            </Text>
          </View>
        ) : (
          sorted.map((d) => (
            <SwipeableDeadlineCard
              key={d.id}
              deadline={d}
              scheme={colorScheme}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))
        )}
        {!canAdd && deadlines.length > 0 && (
          <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
            <Text style={[styles.limitText, { color: colors.secondaryText }]}>
              Maximum of 10 deadlines reached.
            </Text>
          </View>
        )}
      </ScrollView>
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
  swipeText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginTop: 2,
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
  cardRight: {
    marginLeft: Layout.spacing.md,
    alignItems: 'flex-end',
  },
  daysText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
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
});
