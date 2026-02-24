import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
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
import { ToolId, MementoMoriConfig, AffirmationsConfig, BreathingConfig, Goal } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { TOOL_REGISTRY, DEADLINE_COLORS } from '@/src/constants/tools';

// Memento imports
import { useGoals } from '@/src/hooks/useGoals';
import { calculateLifeData } from '@/src/utils/lifeData';
import {
  BirthdayPrompt,
  CountdownTimer,
  ViewSwitcher,
  VisualizationType,
} from '@/src/components/memento';
import {
  HourglassView,
  YearGridView,
  WeekGridView,
  ProgressBarView,
  SeasonsView,
  HeartbeatsView,
  SunsetsView,
} from '@/src/components/memento/visualizations';

// Goal imports
import { EmptyState } from '@/src/components/EmptyState';

// Breathing imports
import { BreathingSessionView } from '@/src/components/breathing/BreathingSessionView';

// Focus Timer imports
import { FocusTimerSession } from '@/src/components/focus-timer/FocusTimerSession';

// Affirmation imports
import { AffirmationsList } from '@/src/components/affirmations/AffirmationsList';
import { AffirmationsPlayerView } from '@/src/components/affirmations/AffirmationsPlayerView';

// Deadline Tracker imports
import { DeadlineTrackerList, SortMode } from '@/src/components/deadline-tracker/DeadlineTrackerList';

// Tally Counter imports
import { TallyCounterList } from '@/src/components/tally-counter/TallyCounterList';

// Streak Tracker imports
import { StreakTrackerList } from '@/src/components/streak-tracker/StreakTrackerList';

// Routines import
import { RoutineList } from '@/src/components/routine/RoutineList';

// Motivational Quotes import
import { QuotesView } from '@/src/components/motivational-quotes/QuotesView';

// Events import
import { EventsList, SortMode as EventSortMode } from '@/src/components/events/EventsList';

function MementoView() {
  const { config, setConfig } = useToolConfig<MementoMoriConfig>('memento-mori');
  const [activeView, setActiveView] = useState<VisualizationType>('hourglass');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleBirthdaySet = useCallback(
    (date: Date) => {
      setConfig({
        ...(config ?? { toolId: 'memento-mori', lifeExpectancy: 80, notificationEnabled: false }),
        birthday: date.toISOString(),
      });
    },
    [config, setConfig]
  );

  const lifeData = useMemo(() => {
    if (!config?.birthday) return null;
    return calculateLifeData(new Date(config.birthday), config.lifeExpectancy ?? 80);
  }, [config?.birthday, config?.lifeExpectancy]);

  if (!config?.birthday || !lifeData) {
    return (
      <BirthdayPrompt
        onComplete={handleBirthdaySet}
        lifeExpectancy={config?.lifeExpectancy ?? 80}
      />
    );
  }

  const renderVisualization = () => {
    switch (activeView) {
      case 'hourglass': return <HourglassView lifeData={lifeData} />;
      case 'yearGrid': return <YearGridView lifeData={lifeData} />;
      case 'weekGrid': return <WeekGridView lifeData={lifeData} />;
      case 'progressBar': return <ProgressBarView lifeData={lifeData} />;
      case 'seasons': return <SeasonsView lifeData={lifeData} />;
      case 'sunsets': return <SunsetsView lifeData={lifeData} />;
      case 'heartbeats': return <HeartbeatsView lifeData={lifeData} />;
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <CountdownTimer
        birthday={new Date(config.birthday)}
        lifeExpectancy={config.lifeExpectancy ?? 80}
      />
      <ViewSwitcher active={activeView} onChange={setActiveView} />
      {renderVisualization()}
    </ScrollView>
  );
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
              {goal.outcome ? (
                <Text style={[styles.goalSubtext, { color: colors.secondaryText }]} numberOfLines={1}>{goal.outcome}</Text>
              ) : null}
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

  const ListFooter = (
    <View>
      {canAddGoal && (
        <View style={styles.goalsAddRow}>
          <Pressable onPress={() => router.push('/new-goal')} style={[styles.goalsAddButton, { borderColor: colors.cardBorder }]}>
            <Ionicons name="add" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>
      )}
      {!canAddGoal && (
        <View style={[styles.maxGoalsMessage, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.secondaryText} />
          <Text style={[styles.maxGoalsText, { color: colors.secondaryText }]}>
            Avoid setting too many goals at once. Research shows that the brain functions best when focused on 4 or fewer goals at any given point in time.
          </Text>
        </View>
      )}
    </View>
  );

  if (goals.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState title="No Goals Yet" message="Tap the + button to add your first goal." />
        <View style={styles.goalsAddRow}>
          <Pressable onPress={() => router.push('/new-goal')} style={[styles.goalsAddButton, { borderColor: colors.cardBorder }]}>
            <Ionicons name="add" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>
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
      {goals.length > 0 && (
        <View style={styles.goalsFabRow} pointerEvents="box-none">
          <Pressable onPress={() => router.push('/reveal')} style={[styles.goalsFab, { backgroundColor: colors.tint }]}>
            <Ionicons name="play" size={26} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function AffirmationsView({ playing, onPlay, onClosePlayer }: { playing: boolean; onPlay: () => void; onClosePlayer: () => void }) {
  const { config } = useToolConfig<AffirmationsConfig>('affirmations');
  const allItems = (config?.affirmations ?? []).map((a) => a.text);

  if (playing) {
    return <AffirmationsPlayerView items={allItems} />;
  }
  return <AffirmationsList onPlay={onPlay} />;
}

function BreathingView() {
  return <BreathingSessionView />;
}

function FocusTimerView() {
  return <FocusTimerSession />;
}

function DeadlineTrackerView({ sortMode }: { sortMode: SortMode }) {
  return <DeadlineTrackerList sortMode={sortMode} />;
}

function StreakTrackerView() {
  return <StreakTrackerList />;
}

function TallyCounterView() {
  return <TallyCounterList />;
}

function RoutinesView() {
  return <RoutineList />;
}

function MotivationalQuotesView() {
  return <QuotesView />;
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
  const [affirmationsPlaying, setAffirmationsPlaying] = useState(false);

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
  const isAffirmations = toolId === 'affirmations';

  const renderTool = () => {
    switch (toolId as ToolId) {
      case 'memento-mori': return <MementoView />;
      case 'goals': return <GoalsView />;
      case 'affirmations': return (
        <AffirmationsView
          playing={affirmationsPlaying}
          onPlay={() => setAffirmationsPlaying(true)}
          onClosePlayer={() => setAffirmationsPlaying(false)}
        />
      );
      case 'breathing': return <BreathingView />;
      case 'focus-timer': return <FocusTimerView />;
      case 'deadline-tracker': return <DeadlineTrackerView sortMode={sortMode} />;
      case 'streak-tracker': return <StreakTrackerView />;
      case 'routines': return <RoutinesView />;
      case 'tally-counter': return <TallyCounterView />;
      case 'motivational-quotes': return <MotivationalQuotesView />;
      case 'events': return <EventsView sortMode={eventSortMode} />;
      default: return <Text style={{ color: colors.text }}>Unknown tool</Text>;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable
          onPress={() => {
            if (isAffirmations && affirmationsPlaying) {
              setAffirmationsPlaying(false);
            } else {
              router.back();
            }
          }}
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
  goalsAddRow: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  goalsAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  goalsFabRow: {
    position: 'absolute',
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalsFab: {
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
