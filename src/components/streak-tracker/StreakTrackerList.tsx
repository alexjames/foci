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
import { StreakTrackerConfig, Streak } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

function getStreakColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#FB923C' : '#EA580C';
}

function getDaysSince(dateStr: string): number {
  const now = new Date();
  const start = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.max(0, Math.round((todayStart.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatStreakDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDaysLabel(days: number): string {
  return days === 1 ? 'day' : 'days';
}

const RESET_MESSAGES = [
  "Every master was once a beginner. You've got this.",
  "Falling down is part of the journey. Getting back up is what matters.",
  "A setback is a setup for a comeback. Start again.",
  "The best time to restart is right now. You're stronger than you think.",
  "Progress isn't always linear. What matters is you're trying again.",
];

function getRandomResetMessage(): string {
  return RESET_MESSAGES[Math.floor(Math.random() * RESET_MESSAGES.length)];
}

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

function ResetAction() {
  return (
    <View style={styles.swipeActionLeft}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="refresh-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Reset</Text>
      </View>
    </View>
  );
}

function SwipeableStreakCard({
  streak,
  scheme,
  onCardPress,
  onReset,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  streak: Streak;
  scheme: 'light' | 'dark';
  onCardPress: (id: string) => void;
  onReset: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colors = Colors[scheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getStreakColor(streak.color, scheme);
  const daysSince = getDaysSince(streak.startDate);

  const handleSwipeRight = useCallback(() => {
    onReset(streak.id, streak.title);
    swipeableRef.current?.close();
  }, [streak.id, streak.title, onReset]);

  const handleSwipeLeft = useCallback(() => {
    onDelete(streak.id, streak.title);
    swipeableRef.current?.close();
  }, [streak.id, streak.title, onDelete]);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <DeleteAction />}
          renderLeftActions={() => <ResetAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'left') handleSwipeRight();
            else handleSwipeLeft();
          }}
          overshootRight={false}
          overshootLeft={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onCardPress(streak.id)}
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
                {streak.title}
              </Text>
              <Text style={[styles.cardDate, { color: colors.secondaryText }]}>
                Since {formatStreakDate(streak.startDate)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.cardRight}>
              <Text style={[styles.daysNumber, { color: accentColor }]}>
                {daysSince}
              </Text>
              <Text style={[styles.daysSubLabel, { color: accentColor }]}>
                {getDaysLabel(daysSince)}
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

function StreakDetailSheet({
  streak,
  visible,
  onClose,
  onReset,
}: {
  streak: Streak | null;
  visible: boolean;
  onClose: () => void;
  onReset: (id: string, title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  if (!streak) return null;

  const accentColor = getStreakColor(streak.color, colorScheme);
  const currentDays = getDaysSince(streak.startDate);
  const longestDays = Math.max(streak.longestDays ?? 0, currentDays);

  const handleConfigure = () => {
    onClose();
    router.push(`/edit-streak/${streak.id}` as any);
  };

  const handleReset = () => {
    onReset(streak.id, streak.title);
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
            {streak.title}
          </Text>
          <Pressable onPress={handleConfigure} hitSlop={8} style={styles.configureButton}>
            <Ionicons name="settings-outline" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: accentColor }]}>{currentDays}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>current</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.secondaryText }]}>{longestDays}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>longest</Text>
          </View>
        </View>

        {/* Reset button */}
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.resetButtonText}>Reset Streak</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const DEFAULT_CONFIG: StreakTrackerConfig = {
  toolId: 'streak-tracker',
  streaks: [],
  notificationEnabled: false,
};

export function StreakTrackerList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<StreakTrackerConfig>('streak-tracker');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const streaks = config?.streaks ?? [];
  const canAdd = streaks.length < 20;

  const selectedStreak = selectedId ? streaks.find((s) => s.id === selectedId) ?? null : null;

  const removeStreak = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        streaks: current.streaks.filter((s) => s.id !== id),
      });
    },
    [config, setConfig]
  );

  const resetStreak = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        streaks: current.streaks.map((s) => {
          if (s.id !== id) return s;
          const currentDays = getDaysSince(s.startDate);
          return {
            ...s,
            startDate: new Date().toISOString(),
            longestDays: Math.max(s.longestDays ?? 0, currentDays),
          };
        }),
      });
    },
    [config, setConfig]
  );

  const handleReset = useCallback(
    (id: string, title: string) => {
      const message = getRandomResetMessage();
      Alert.alert(
        'Reset Streak',
        `Reset "${title}" to 0 days?\n\n${message}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              resetStreak(id);
              setSelectedId(null);
            },
          },
        ]
      );
    },
    [resetStreak]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Streak', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeStreak(id),
        },
      ]);
    },
    [removeStreak]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Streak[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, streaks: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Streak>) => (
      <SwipeableStreakCard
        streak={item}
        scheme={colorScheme}
        onCardPress={setSelectedId}
        onReset={handleReset}
        onDelete={handleDelete}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [colorScheme, handleReset, handleDelete, isDragging]
  );

  return (
    <View style={styles.container}>
      {streaks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flame-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No streaks yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to start tracking your first streak
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={streaks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}
      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push('/edit-streak/new' as any)}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      )}
      <StreakDetailSheet
        streak={selectedStreak}
        visible={selectedId !== null}
        onClose={() => setSelectedId(null)}
        onReset={handleReset}
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
    backgroundColor: '#FF9500',
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
    marginBottom: Layout.spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  statDivider: {
    width: 1,
    height: 48,
  },
  statNumber: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    lineHeight: 34,
  },
  statLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
