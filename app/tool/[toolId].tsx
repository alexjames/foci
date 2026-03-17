import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  useColorScheme,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ToolId, Goal } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { TOOL_REGISTRY, DEADLINE_COLORS } from '@/src/constants/tools';

// Goal imports
import { useGoals } from '@/src/hooks/useGoals';
import { EmptyState } from '@/src/components/EmptyState';

// Focus Timer imports
import { FocusTimerSession } from '@/src/components/focus-timer/FocusTimerSession';
import { useChecklist } from '@/src/hooks/useChecklist';

// Identities import
import { IdentitiesList } from '@/src/components/identities/IdentitiesList';

// Deadline Tracker imports
import { DeadlineTrackerList, SortMode } from '@/src/components/deadline-tracker/DeadlineTrackerList';

// Streak Tracker imports
import { StreakTrackerList } from '@/src/components/streak-tracker/StreakTrackerList';

// Routines import
import { RoutineList } from '@/src/components/routine/RoutineList';

// Events import
import { EventsList, SortMode as EventSortMode } from '@/src/components/events/EventsList';

// Priorities import
import { PrioritiesView } from '@/src/components/priorities/PrioritiesView';

function computeGoalProgress(g: Goal): { fraction: number; label: string } | null {
  if (!g.unit) return null;
  if (g.unit === 'percentage') {
    const v = g.percentageValue ?? 0;
    return { fraction: v / 100, label: `${v}%` };
  }
  if (g.unit === 'number') {
    const v = g.numberValue ?? 0;
    const t = g.numberTarget ?? 1;
    return { fraction: Math.min(t > 0 ? v / t : 0, 1), label: `${v} / ${t}` };
  }
  if (g.unit === 'milestone') {
    const steps = g.milestoneSteps ?? [];
    const done = steps.filter((s) => s.completed).length;
    return { fraction: steps.length ? done / steps.length : 0, label: `${done} / ${steps.length}` };
  }
  return null;
}

function formatGoalDate(isoString: string | undefined): string | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `By ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getGoalColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#7ECECE' : '#7ECECE';
}

function GoalDeleteAction() {
  return (
    <View style={styles.goalSwipeAction}>
      <View style={styles.goalSwipeContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.goalSwipeText}>Delete</Text>
      </View>
    </View>
  );
}

function SwipeableGoalCard({
  goal,
  onPress,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  goal: Goal;
  onPress: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getGoalColor(goal.color, colorScheme);

  return (
    <ScaleDecorator>
      <View style={[styles.goalSwipeContainer, isActive && styles.goalSwipeActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <GoalDeleteAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') {
              swipeableRef.current?.close();
              Alert.alert('Delete Goal', `Delete "${goal.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(goal.id, goal.name) },
              ]);
            }
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onPress(goal.id)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.goalRow, { backgroundColor: colors.cardBackground, borderLeftColor: accentColor }]}
          >
            <View style={styles.goalInfo}>
              <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
              {(() => {
                const progress = computeGoalProgress(goal);
                if (!progress) return null;
                return (
                  <View style={styles.goalProgressRow}>
                    <View style={styles.goalProgressTrack}>
                      <View style={[styles.goalProgressFill, { width: `${Math.round(progress.fraction * 100)}%` as any, backgroundColor: accentColor }]} />
                    </View>
                    <Text style={[styles.goalProgressLabel, { color: accentColor }]}>{progress.label}</Text>
                  </View>
                );
              })()}
              {(() => {
                const dateLabel = formatGoalDate(goal.dueDate);
                if (!dateLabel) return null;
                return (
                  <Text style={[styles.goalSubtext, { color: colors.secondaryText }]} numberOfLines={1}>{dateLabel}</Text>
                );
              })()}
            </View>
            {showHandle && (
              <Ionicons name="reorder-three-outline" size={20} color={colors.secondaryText} style={{ opacity: 0.4 }} />
            )}
          </Pressable>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

function GoalsView() {
  const router = useRouter();
  const { goals, deleteGoal, setGoals, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isDragging, setIsDragging] = useState(false);

  const handleDelete = useCallback((id: string, _name: string) => {
    deleteGoal(id);
  }, [deleteGoal]);

  const handleDragEnd = useCallback(({ data }: { data: Goal[] }) => {
    setGoals(data.map((g, i) => ({ ...g, order: i })));
    setIsDragging(false);
  }, [setGoals]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Goal>) => (
      <SwipeableGoalCard
        goal={item}
        onPress={(id) => router.push(`/edit-goal/${id}`)}
        onDelete={handleDelete}
        drag={() => { setIsDragging(true); drag(); }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [handleDelete, isDragging, router]
  );

  const ListFooter = !canAddGoal ? (
    <View style={[styles.maxGoalsMessage, { backgroundColor: colors.cardBackground }]}>
      <Ionicons name="information-circle-outline" size={20} color={colors.secondaryText} />
      <Text style={[styles.maxGoalsText, { color: colors.secondaryText }]}>
        Avoid setting too many goals at once. Research shows that the brain functions best when focused on 4 or fewer goals at any given point in time.
      </Text>
    </View>
  ) : null;

  if (goals.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title="No Goals Yet" message="Tap the + button to add your first goal." />
        {canAddGoal && (
          <View style={styles.fabContainer}>
            <Pressable onPress={() => router.push('/new-goal')} style={styles.fab}>
              <Ionicons name="add" size={28} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <DraggableFlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.goalsScrollContent}
        activationDistance={1}
      />
      {canAddGoal && (
        <View style={styles.fabContainer}>
          <Pressable onPress={() => router.push('/new-goal')} style={styles.fab}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function IdentitiesView() {
  return <IdentitiesList />;
}

function FocusTimerView() {
  const { taskTitle, taskItemId, taskDateStr } = useLocalSearchParams<{
    taskTitle?: string;
    taskItemId?: string;
    taskDateStr?: string;
  }>();
  const router = useRouter();
  const { toggleCompletion } = useChecklist();

  if (taskTitle && taskItemId && taskDateStr) {
    return (
      <FocusTimerSession
        taskTitle={taskTitle}
        onTaskDismiss={() => router.back()}
        onTaskComplete={(elapsed) => {
          const date = new Date(taskDateStr);
          Alert.alert(
            'Session complete',
            `You focused for ${Math.round(elapsed / 60)}m on this task. Mark it as complete?`,
            [
              { text: 'Not yet', style: 'cancel', onPress: () => router.back() },
              {
                text: 'Mark complete',
                onPress: () => {
                  toggleCompletion(taskItemId, date);
                  router.back();
                },
              },
            ]
          );
        }}
      />
    );
  }

  return <FocusTimerSession />;
}

function DeadlineTrackerView({ sortMode }: { sortMode: SortMode }) {
  return <DeadlineTrackerList sortMode={sortMode} />;
}

function StreakTrackerView() {
  return <StreakTrackerList />;
}

function RoutinesView() {
  return <RoutineList />;
}

function EventsView({ sortMode }: { sortMode: EventSortMode }) {
  return <EventsList sortMode={sortMode} />;
}

const SORT_MODES: SortMode[] = ['manual', 'date', 'name'];
const SORT_ICONS: Record<SortMode, string> = {
  manual: 'reorder-four-outline',
  date: 'calendar-outline',
  name: 'text-outline',
};

const EVENT_SORT_MODES: EventSortMode[] = ['manual', 'date', 'name'];
const EVENT_SORT_ICONS: Record<EventSortMode, string> = {
  manual: 'reorder-four-outline',
  date: 'calendar-outline',
  name: 'text-outline',
};

export default function ToolScreen() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [eventSortMode, setEventSortMode] = useState<EventSortMode>('manual');
  const cycleSort = () => {
    setSortMode((prev) => {
      const idx = SORT_MODES.indexOf(prev);
      return SORT_MODES[(idx + 1) % SORT_MODES.length];
    });
  };

  const cycleEventSort = () => {
    setEventSortMode((prev) => {
      const idx = EVENT_SORT_MODES.indexOf(prev);
      return EVENT_SORT_MODES[(idx + 1) % EVENT_SORT_MODES.length];
    });
  };

  const isDeadlineTracker = toolId === 'deadline-tracker';
  const isEvents = toolId === 'events';

  const renderTool = () => {
    switch (toolId as ToolId) {
      case 'goals': return <GoalsView />;
      case 'identities': return <IdentitiesView />;
      case 'focus-timer': return <FocusTimerView />;
      case 'deadline-tracker': return <DeadlineTrackerView sortMode={sortMode} />;
      case 'streak-tracker': return <StreakTrackerView />;
      case 'routines': return <RoutinesView />;
      case 'events': return <EventsView sortMode={eventSortMode} />;
      case 'priorities': return <PrioritiesView />;
      default: return <Text style={{ color: colors.text }}>Unknown tool</Text>;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {tool?.name ?? 'Tool'}
        </Text>
        {isDeadlineTracker ? (
          <Pressable onPress={cycleSort} hitSlop={8}>
            <Ionicons
              name={SORT_ICONS[sortMode] as any}
              size={20}
              color={colors.text}
            />
          </Pressable>
        ) : isEvents ? (
          <Pressable onPress={cycleEventSort} hitSlop={8}>
            <Ionicons
              name={EVENT_SORT_ICONS[eventSortMode] as any}
              size={20}
              color={colors.text}
            />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      <View style={{ flex: 1 }}>{renderTool()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
  },
  goalSwipeContainer: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  goalSwipeActive: {
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  goalSwipeAction: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  goalSwipeContent: { alignItems: 'center', gap: 4 },
  goalSwipeText: { color: '#fff', fontSize: Layout.fontSize.caption, fontWeight: '600' },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  goalInfo: { flex: 1 },
  goalName: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
  },
  goalProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalProgressLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  goalSubtext: { fontSize: Layout.fontSize.caption, marginTop: 2 },
  maxGoalsMessage: {
    flexDirection: 'row',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.md,
    marginHorizontal: Layout.spacing.md,
    gap: Layout.spacing.sm,
    alignItems: 'flex-start',
  },
  maxGoalsText: {
    flex: 1,
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
  },
  goalsScrollContent: {
    paddingTop: Layout.spacing.md,
    paddingBottom: 100,
    flexGrow: 1,
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
