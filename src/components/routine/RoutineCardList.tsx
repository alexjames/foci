import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RoutinesConfig, Routine } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { getPresetById } from '@/src/constants/routineCards';

const DEFAULT_DURATION = 180; // 3 minutes

interface RoutineCardListProps {
  routineId: string;
  onPlay: () => void;
}

interface ResolvedCard {
  id: string;
  title: string;
  description: string;
}

function resolveCard(cardId: string, routine: Routine): ResolvedCard | null {
  const preset = getPresetById(cardId);
  if (preset) return { id: preset.id, title: preset.title, description: preset.description };
  const custom = routine.customCards.find((c) => c.id === cardId);
  if (custom) return { id: custom.id, title: custom.title, description: custom.description };
  return null;
}

function getCardDuration(cardId: string, routine: Routine): number {
  return routine.cardDurations?.[cardId] ?? DEFAULT_DURATION;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RemoveAction() {
  return (
    <View style={styles.swipeAction}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Remove</Text>
      </View>
    </View>
  );
}

function DurationModal({
  visible,
  initialSeconds,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialSeconds: number;
  onClose: () => void;
  onSave: (seconds: number) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [value, setValue] = useState(initialSeconds);

  // Reset when modal opens
  const handleOpen = useCallback(() => {
    setValue(initialSeconds);
  }, [initialSeconds]);

  const adjust = (delta: number) => {
    setValue((prev) => Math.max(30, Math.min(3600, prev + delta)));
  };

  const mins = Math.floor(value / 60);
  const secs = value % 60;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.cardBackground }]}
          onPress={() => {}}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>Card Duration</Text>

          <View style={styles.stepperRow}>
            {/* Minutes */}
            <View style={styles.stepperGroup}>
              <Pressable onPress={() => adjust(-60)} style={styles.stepBtn} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={32} color={colors.tint} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.text }]}>{mins}</Text>
              <Pressable onPress={() => adjust(60)} style={styles.stepBtn} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={32} color={colors.tint} />
              </Pressable>
              <Text style={[styles.stepLabel, { color: colors.secondaryText }]}>min</Text>
            </View>

            <Text style={[styles.stepColon, { color: colors.secondaryText }]}>:</Text>

            {/* Seconds */}
            <View style={styles.stepperGroup}>
              <Pressable onPress={() => adjust(-10)} style={styles.stepBtn} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={32} color={colors.tint} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.text }]}>{secs.toString().padStart(2, '0')}</Text>
              <Pressable onPress={() => adjust(10)} style={styles.stepBtn} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={32} color={colors.tint} />
              </Pressable>
              <Text style={[styles.stepLabel, { color: colors.secondaryText }]}>sec</Text>
            </View>
          </View>

          <Pressable
            onPress={() => { onSave(value); onClose(); }}
            style={[styles.saveBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.saveBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SwipeableCard({
  card,
  index,
  drag,
  isActive,
  duration,
  showHandle,
  onRemove,
  onEditDuration,
}: {
  card: ResolvedCard;
  index: number;
  drag: () => void;
  isActive: boolean;
  duration: number;
  showHandle: boolean;
  onRemove: (id: string) => void;
  onEditDuration: (id: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        swipeableRef.current?.close();
        onRemove(card.id);
      }
    },
    [card.id, onRemove]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => <RemoveAction />}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <Pressable
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground },
          isActive && { opacity: 0.9, elevation: 8 },
        ]}
      >
        <View style={styles.cardNumber}>
          <Text style={[styles.cardNumberText, { color: colors.tint }]}>{index + 1}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={[styles.cardDescription, { color: colors.secondaryText }]} numberOfLines={1}>
            {card.description}
          </Text>
        </View>
        <Pressable
          onPress={() => onEditDuration(card.id)}
          hitSlop={8}
          style={[styles.durationBadge, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.durationText, { color: colors.secondaryText }]}>
            {formatDuration(duration)}
          </Text>
        </Pressable>
        {showHandle && (
          <Ionicons name="menu" size={20} color={colors.secondaryText} style={styles.dragHandle} />
        )}
      </Pressable>
    </Swipeable>
  );
}

export function RoutineCardList({ routineId, onPlay }: RoutineCardListProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<RoutinesConfig>('routines');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const routine = config?.routines.find((r) => r.id === routineId);

  const cards = useMemo(() => {
    if (!routine) return [];
    return routine.orderedCards
      .map((id) => resolveCard(id, routine))
      .filter((c): c is ResolvedCard => c !== null);
  }, [routine]);

  const handleRemove = useCallback(
    (cardId: string) => {
      if (!routine || !config) return;
      setConfig({
        ...config,
        routines: config.routines.map((r) =>
          r.id === routineId
            ? {
                ...r,
                orderedCards: r.orderedCards.filter((id) => id !== cardId),
                customCards: r.customCards.filter((c) => c.id !== cardId),
              }
            : r
        ),
      });
    },
    [routine, config, routineId, setConfig]
  );

  const handleReorder = useCallback(
    (data: ResolvedCard[]) => {
      if (!routine || !config) return;
      setConfig({
        ...config,
        routines: config.routines.map((r) =>
          r.id === routineId ? { ...r, orderedCards: data.map((c) => c.id) } : r
        ),
      });
      setIsDragging(false);
    },
    [routine, config, routineId, setConfig]
  );

  const handleSaveDuration = useCallback(
    (cardId: string, seconds: number) => {
      if (!routine || !config) return;
      setConfig({
        ...config,
        routines: config.routines.map((r) =>
          r.id === routineId
            ? { ...r, cardDurations: { ...r.cardDurations, [cardId]: seconds } }
            : r
        ),
      });
    },
    [routine, config, routineId, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ResolvedCard>) => (
      <ScaleDecorator>
        <SwipeableCard
          card={item}
          index={getIndex() ?? 0}
          drag={() => { setIsDragging(true); drag(); }}
          isActive={isActive}
          duration={getCardDuration(item.id, routine!)}
          showHandle={isDragging}
          onRemove={handleRemove}
          onEditDuration={setEditingCardId}
        />
      </ScaleDecorator>
    ),
    [handleRemove, routine, isDragging]
  );

  const editingCard = editingCardId ? cards.find((c) => c.id === editingCardId) : null;

  if (cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons
            name={(routine?.icon ?? 'repeat-outline') as any}
            size={64}
            color={colors.secondaryText}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No steps yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to add cards to your routine
          </Text>
        </View>
        <View style={styles.fabContainer}>
          <Pressable
            onPress={() => router.push(`/routine-cards/${routineId}` as any)}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFlatList
        data={cards}
        onDragEnd={({ data }) => handleReorder(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <View style={styles.fabContainer}>
        <Pressable
          onPress={() => router.push(`/routine-cards/${routineId}` as any)}
          style={[styles.fabSecondary, { borderColor: colors.tint }]}
        >
          <Ionicons name="add" size={24} color={colors.tint} />
        </Pressable>
        <Pressable onPress={onPlay} style={styles.fab}>
          <Ionicons name="play" size={28} color="#fff" />
        </Pressable>
      </View>

      {editingCard && routine && (
        <DurationModal
          visible={!!editingCardId}
          initialSeconds={getCardDuration(editingCard.id, routine)}
          onClose={() => setEditingCardId(null)}
          onSave={(seconds) => handleSaveDuration(editingCard.id, seconds)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Layout.spacing.md,
    paddingBottom: 140,
  },
  swipeableContainer: {
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  swipeAction: {
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
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  cardNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  dragHandle: {
    opacity: 0.4,
  },
  durationBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  durationText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl,
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
    flexDirection: 'row',
    justifyContent: 'center',
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
  fabSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Layout.spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginBottom: Layout.spacing.xl,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
  },
  stepperGroup: {
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  stepBtn: {},
  stepValue: {
    fontSize: 40,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'center',
  },
  stepLabel: {
    fontSize: Layout.fontSize.caption,
  },
  stepColon: {
    fontSize: 40,
    fontWeight: '200',
    marginTop: 48,
  },
  saveBtn: {
    paddingHorizontal: Layout.spacing.xxl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
