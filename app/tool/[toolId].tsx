import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ToolId, MementoMoriConfig, AffirmationsConfig, BreathingConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { TOOL_REGISTRY } from '@/src/constants/tools';

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
  MonthDotsView,
  ProgressBarView,
  SeasonsView,
  HeartbeatsView,
  SunsetsView,
} from '@/src/components/memento/visualizations';

// Goal imports
import { GoalCard } from '@/src/components/GoalCard';
import { EmptyState } from '@/src/components/EmptyState';

// Breathing imports
import { BreathingSessionView } from '@/src/components/breathing/BreathingSessionView';

// Focus Timer imports
import { FocusTimerSession } from '@/src/components/focus-timer/FocusTimerSession';

// Affirmation imports
import { AffirmationsList } from '@/src/components/affirmations/AffirmationsList';

// Deadline Tracker imports
import { DeadlineTrackerList } from '@/src/components/deadline-tracker/DeadlineTrackerList';

// Streak Tracker imports
import { StreakTrackerList } from '@/src/components/streak-tracker/StreakTrackerList';

// Routine imports
import { RoutineCardList } from '@/src/components/routine/RoutineCardList';
import { RoutinePlayView } from '@/src/components/routine/RoutinePlayView';

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
      case 'monthDots': return <MonthDotsView lifeData={lifeData} />;
      case 'progressBar': return <ProgressBarView lifeData={lifeData} />;
      case 'seasons': return <SeasonsView lifeData={lifeData} />;
      case 'heartbeats': return <HeartbeatsView lifeData={lifeData} />;
      case 'sunsets': return <SunsetsView lifeData={lifeData} />;
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

function GoalsView() {
  const router = useRouter();
  const { goals, deleteGoal, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.goalsScrollContent}>
        {goals.length === 0 ? (
          <EmptyState title="No Goals Yet" message="Tap the + button to add your first goal." />
        ) : (
          <>
            {goals.map((goal) => (
              <View key={goal.id} style={[styles.goalRow, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                <Pressable onPress={() => router.push(`/edit-goal/${goal.id}`)} style={styles.goalInfo}>
                  <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                  {goal.outcome ? (
                    <Text style={[styles.goalSubtext, { color: colors.secondaryText }]} numberOfLines={1}>{goal.outcome}</Text>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => handleDelete(goal.id, goal.name)} hitSlop={8} style={{ padding: Layout.spacing.xs }}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            ))}
            {!canAddGoal && (
              <View style={[styles.maxGoalsMessage, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.secondaryText} />
                <Text style={[styles.maxGoalsText, { color: colors.secondaryText }]}>
                  Avoid setting too many goals at once. Research shows that the brain functions best when focused on 4 or fewer goals at any given point in time.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <View style={styles.bottomActions}>
        {goals.length > 0 && (
          <Pressable onPress={() => router.push('/reveal')} style={[styles.reviewButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.reviewButtonText}>Review Goals</Text>
          </Pressable>
        )}
        {canAddGoal && (
          <Pressable onPress={() => router.push('/edit-goal/new')} style={styles.fab}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AffirmationsView() {
  return <AffirmationsList />;
}

function BreathingView() {
  return <BreathingSessionView />;
}

function FocusTimerView() {
  return <FocusTimerSession />;
}

function DeadlineTrackerView() {
  return <DeadlineTrackerList />;
}

function StreakTrackerView() {
  return <StreakTrackerList />;
}

function RoutineView({ toolId }: { toolId: 'morning-routine' | 'evening-routine' }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return <RoutinePlayView toolId={toolId} onComplete={() => setIsPlaying(false)} />;
  }
  return <RoutineCardList toolId={toolId} onPlay={() => setIsPlaying(true)} />;
}

export default function ToolScreen() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);

  const renderTool = () => {
    switch (toolId as ToolId) {
      case 'memento-mori': return <MementoView />;
      case 'goals': return <GoalsView />;
      case 'affirmations': return <AffirmationsView />;
      case 'breathing': return <BreathingView />;
      case 'focus-timer': return <FocusTimerView />;
      case 'deadline-tracker': return <DeadlineTrackerView />;
      case 'streak-tracker': return <StreakTrackerView />;
      case 'morning-routine': return <RoutineView toolId="morning-routine" />;
      case 'evening-routine': return <RoutineView toolId="evening-routine" />;
      default: return <Text style={{ color: colors.text }}>Unknown tool</Text>;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {tool?.name ?? 'Tool'}
        </Text>
        <View style={{ width: 24 }} />
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
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  goalInfo: { flex: 1, marginRight: Layout.spacing.md },
  goalName: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  goalSubtext: { fontSize: Layout.fontSize.caption, marginTop: 2 },
  maxGoalsMessage: {
    flexDirection: 'row',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.sm,
    alignItems: 'flex-start',
  },
  maxGoalsText: {
    flex: 1,
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
  },
  goalsScrollContent: {
    padding: Layout.spacing.md,
    paddingBottom: 200,
    flexGrow: 1,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.md,
    gap: Layout.spacing.md,
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
  reviewButton: {
    alignSelf: 'stretch',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
