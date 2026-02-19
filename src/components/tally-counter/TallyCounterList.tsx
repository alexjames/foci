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
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { TallyCounterConfig, TallyCounter } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

function getTallyColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
}

function LeftAction() {
  return (
    <View style={styles.swipeActionLeft}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="remove" size={22} color="#fff" />
        <Text style={styles.swipeText}>−1</Text>
      </View>
    </View>
  );
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

function SwipeableTallyCard({
  counter,
  scheme,
  onIncrement,
  onDecrement,
  onDelete,
}: {
  counter: TallyCounter;
  scheme: 'light' | 'dark';
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const colors = Colors[scheme];
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);
  const accentColor = getTallyColor(counter.color, scheme);

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        swipeableRef.current?.close();
        onDecrement(counter.id);
      } else {
        swipeableRef.current?.close();
        onDelete(counter.id, counter.title);
      }
    },
    [counter.id, counter.title, onDecrement, onDelete]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={() => <LeftAction />}
      renderRightActions={() => <RightAction />}
      onSwipeableOpen={handleSwipeOpen}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderLeftColor: accentColor }]}>
        <Pressable
          onLongPress={() => router.push(`/edit-tally/${counter.id}` as any)}
          style={styles.cardContent}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {counter.title}
          </Text>
          <Text style={[styles.cardHint, { color: colors.secondaryText }]}>
            long-press to edit
          </Text>
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
        <Pressable
          onPress={() => {
            onIncrement(counter.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.cardRight}
          hitSlop={8}
        >
          <Text style={[styles.countNumber, { color: accentColor }]}>
            {counter.count}
          </Text>
          <Ionicons name="add" size={18} color={accentColor} />
        </Pressable>
      </View>
    </Swipeable>
  );
}

const DEFAULT_CONFIG: TallyCounterConfig = {
  toolId: 'tally-counter',
  counters: [],
};

export function TallyCounterList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<TallyCounterConfig>('tally-counter');

  const counters = config?.counters ?? [];
  const canAdd = counters.length < 20;

  const updateCounter = useCallback(
    (id: string, delta: number) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        counters: current.counters.map((c) =>
          c.id === id ? { ...c, count: Math.max(0, c.count + delta) } : c
        ),
      });
    },
    [config, setConfig]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Counter', `Delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, counters: current.counters.filter((c) => c.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {counters.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="add-circle-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No counters yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
              Tap + to add your first counter
            </Text>
          </View>
        ) : (
          counters.map((counter) => (
            <SwipeableTallyCard
              key={counter.id}
              counter={counter}
              scheme={colorScheme}
              onIncrement={(id) => updateCounter(id, 1)}
              onDecrement={(id) => updateCounter(id, -1)}
              onDelete={handleDelete}
            />
          ))
        )}
        {!canAdd && counters.length > 0 && (
          <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
            <Text style={[styles.limitText, { color: colors.secondaryText }]}>
              Maximum of 20 counters reached.
            </Text>
          </View>
        )}
      </ScrollView>
      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push('/edit-tally/new' as any)}
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
  swipeActionLeft: {
    flex: 1,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
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
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  cardHint: {
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
    minWidth: 48,
  },
  countNumber: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    lineHeight: 24,
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
