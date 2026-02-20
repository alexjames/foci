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
import { TallyCounterConfig, TallyCounter } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

function getTallyColor(colorId: string | undefined, scheme: 'light' | 'dark'): string {
  const found = DEADLINE_COLORS.find((c) => c.id === colorId);
  if (found) return scheme === 'dark' ? found.dark : found.light;
  return scheme === 'dark' ? '#94A3B8' : '#64748B';
}

function LeftActions({
  count,
  accentColor,
  onIncrement,
  onDecrement,
}: {
  count: number;
  accentColor: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.leftActionsRow}>
      <Pressable
        style={[styles.swipeActionButton, { backgroundColor: '#FF9500' }]}
        onPress={() => {
          onDecrement();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="remove" size={22} color="#fff" />
      </Pressable>
      <View style={[styles.swipeCountDisplay, { backgroundColor: accentColor }]}>
        <Text style={styles.swipeCountNumber}>{count}</Text>
      </View>
      <Pressable
        style={[styles.swipeActionButton, { backgroundColor: '#34C759' }]}
        onPress={() => {
          onIncrement();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
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
  showHandle,
  onCardPress,
  onIncrement,
  onDecrement,
  onDelete,
  drag,
  isActive,
}: {
  counter: TallyCounter;
  scheme: 'light' | 'dark';
  showHandle: boolean;
  onCardPress: (id: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
}) {
  const colors = Colors[scheme];
  const swipeableRef = React.useRef<Swipeable>(null);
  const accentColor = getTallyColor(counter.color, scheme);

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        swipeableRef.current?.close();
        onDelete(counter.id, counter.title);
      }
    },
    [counter.id, counter.title, onDelete]
  );

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={() => (
            <LeftActions
              count={counter.count}
              accentColor={accentColor}
              onIncrement={() => onIncrement(counter.id)}
              onDecrement={() => onDecrement(counter.id)}
            />
          )}
          renderRightActions={() => <RightAction />}
          onSwipeableOpen={handleSwipeOpen}
          overshootLeft={false}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onCardPress(counter.id)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.card, { backgroundColor: colors.cardBackground, borderLeftColor: accentColor }]}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {counter.title}
              </Text>
            </View>
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
            </Pressable>
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

function TallyDetailSheet({
  counter,
  visible,
  onClose,
  onIncrement,
  onDecrement,
  onReset,
  onDelete,
}: {
  counter: TallyCounter | null;
  visible: boolean;
  onClose: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  if (!counter) return null;

  const accentColor = getTallyColor(counter.color, colorScheme);

  const handleConfigure = () => {
    onClose();
    router.push(`/edit-tally/${counter.id}` as any);
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
            {counter.title}
          </Text>
          <Pressable onPress={handleConfigure} hitSlop={8} style={styles.configureButton}>
            <Ionicons name="settings-outline" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        {/* Count display */}
        <View style={styles.countArea}>
          <Text style={[styles.countDisplay, { color: accentColor }]}>
            {counter.count}
          </Text>
          <Text style={[styles.countLabel, { color: colors.secondaryText }]}>
            {counter.count === 1 ? 'count' : 'counts'}
          </Text>
        </View>

        {/* Increment / Decrement buttons */}
        <View style={styles.counterControls}>
          <Pressable
            onPress={() => {
              onDecrement(counter.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.controlButton,
              { backgroundColor: '#FF9500', opacity: pressed ? 0.8 : 1 },
              counter.count === 0 && styles.controlButtonDisabled,
            ]}
            disabled={counter.count === 0}
          >
            <Ionicons name="remove" size={28} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => {
              onIncrement(counter.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [
              styles.controlButton,
              { backgroundColor: '#34C759', opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>

        {/* Reset / Delete row */}
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => {
              Alert.alert('Reset Counter', `Reset "${counter.title}" to zero?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => onReset(counter.id) },
              ]);
            }}
            style={({ pressed }) => [
              styles.sheetActionButton,
              { borderColor: colors.cardBorder, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.secondaryText} />
            <Text style={[styles.sheetActionText, { color: colors.secondaryText }]}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(counter.id, counter.title)}
            style={({ pressed }) => [
              styles.sheetActionButton,
              { borderColor: colors.cardBorder, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={[styles.sheetActionText, { color: colors.destructive }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const counters = config?.counters ?? [];
  const canAdd = counters.length < 20;

  const selectedCounter = selectedId ? counters.find((c) => c.id === selectedId) ?? null : null;

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
            setSelectedId(null);
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, counters: current.counters.filter((c) => c.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
  );

  const handleReset = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({
        ...current,
        counters: current.counters.map((c) => (c.id === id ? { ...c, count: 0 } : c)),
      });
    },
    [config, setConfig]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: TallyCounter[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, counters: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<TallyCounter>) => (
      <SwipeableTallyCard
        counter={item}
        scheme={colorScheme}
        showHandle={isDragging}
        onCardPress={setSelectedId}
        onIncrement={(id) => updateCounter(id, 1)}
        onDecrement={(id) => updateCounter(id, -1)}
        onDelete={handleDelete}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
      />
    ),
    [colorScheme, isDragging, updateCounter, handleDelete]
  );

  return (
    <View style={styles.container}>
      {counters.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="add-circle-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No counters yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add your first counter
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={counters}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}
      {!canAdd && counters.length > 0 && (
        <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
          <Text style={[styles.limitText, { color: colors.secondaryText }]}>
            Maximum of 20 counters reached.
          </Text>
        </View>
      )}
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
      <TallyDetailSheet
        counter={selectedCounter}
        visible={selectedId !== null}
        onClose={() => setSelectedId(null)}
        onIncrement={(id) => updateCounter(id, 1)}
        onDecrement={(id) => updateCounter(id, -1)}
        onReset={handleReset}
        onDelete={handleDelete}
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
  leftActionsRow: {
    flexDirection: 'row',
  },
  swipeActionButton: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeCountDisplay: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeCountNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
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
  countArea: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
  },
  countDisplay: {
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80,
  },
  countLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
    marginTop: 4,
  },
  counterControls: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  sheetActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    gap: Layout.spacing.sm,
  },
  sheetActionText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});
