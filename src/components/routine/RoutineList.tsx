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
import { RoutinesConfig, Routine } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';

const MAX_ROUTINES = 5;

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

function SwipeableRoutineCard({
  routine,
  onDelete,
}: {
  routine: Routine;
  onDelete: (id: string, title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);

  const stepCount = routine.orderedCards.length;

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        swipeableRef.current?.close();
        onDelete(routine.id, routine.title);
      }
    },
    [routine.id, routine.title, onDelete]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => <DeleteAction />}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <Pressable
        onPress={() => router.push(`/routine-detail/${routine.id}` as any)}
        style={[styles.card, { backgroundColor: colors.cardBackground }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
          <Ionicons name={routine.icon as any} size={24} color={colors.tint} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {routine.title}
          </Text>
          <Text style={[styles.cardSteps, { color: colors.secondaryText }]}>
            {stepCount === 0 ? 'No steps yet' : `${stepCount} step${stepCount !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/routine-detail/${routine.id}?play=true` as any)}
          style={styles.playButton}
          hitSlop={8}
        >
          <Ionicons name="play-circle" size={36} color={colors.tint} />
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const DEFAULT_CONFIG: RoutinesConfig = { toolId: 'routines', routines: [] };

export function RoutineList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<RoutinesConfig>('routines');

  const routines = config?.routines ?? [];
  const canAdd = routines.length < MAX_ROUTINES;

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Routine', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, routines: current.routines.filter((r) => r.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No routines yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
              Tap + to create your first routine
            </Text>
          </View>
        ) : (
          routines.map((routine) => (
            <SwipeableRoutineCard
              key={routine.id}
              routine={routine}
              onDelete={handleDelete}
            />
          ))
        )}
        {!canAdd && routines.length > 0 && (
          <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
            <Text style={[styles.limitText, { color: colors.secondaryText }]}>
              Maximum of {MAX_ROUTINES} routines reached.
            </Text>
          </View>
        )}
      </ScrollView>
      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push('/edit-routine/new' as any)}
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
    gap: Layout.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  cardSteps: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
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
