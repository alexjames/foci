import React, { useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
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
import { RoutineConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { getPresetById } from '@/src/constants/routineCards';

interface RoutineCardListProps {
  toolId: 'morning-routine' | 'evening-routine';
  onPlay: () => void;
}

interface ResolvedCard {
  id: string;
  title: string;
  description: string;
}

function resolveCard(cardId: string, config: RoutineConfig): ResolvedCard | null {
  const preset = getPresetById(cardId);
  if (preset) return { id: preset.id, title: preset.title, description: preset.description };
  const custom = config.customCards.find((c) => c.id === cardId);
  if (custom) return { id: custom.id, title: custom.title, description: custom.description };
  return null;
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

function SwipeableCard({
  card,
  index,
  drag,
  isActive,
  onRemove,
}: {
  card: ResolvedCard;
  index: number;
  drag: () => void;
  isActive: boolean;
  onRemove: (id: string) => void;
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
        <Ionicons name="menu" size={20} color={colors.secondaryText} />
      </Pressable>
    </Swipeable>
  );
}

export function RoutineCardList({ toolId, onPlay }: RoutineCardListProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<RoutineConfig>(toolId);

  const defaultConfig: RoutineConfig = {
    toolId,
    orderedCards: [],
    customCards: [],
    notificationEnabled: false,
  };
  const currentConfig = config ?? defaultConfig;

  const cards = useMemo(() => {
    return currentConfig.orderedCards
      .map((id) => resolveCard(id, currentConfig))
      .filter((c): c is ResolvedCard => c !== null);
  }, [currentConfig]);

  const handleRemove = useCallback(
    (cardId: string) => {
      setConfig({
        ...currentConfig,
        orderedCards: currentConfig.orderedCards.filter((id) => id !== cardId),
        customCards: currentConfig.customCards.filter((c) => c.id !== cardId),
      });
    },
    [currentConfig, setConfig]
  );

  const handleReorder = useCallback(
    (data: ResolvedCard[]) => {
      setConfig({
        ...currentConfig,
        orderedCards: data.map((c) => c.id),
      });
    },
    [currentConfig, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ResolvedCard>) => (
      <ScaleDecorator>
        <SwipeableCard
          card={item}
          index={getIndex() ?? 0}
          drag={drag}
          isActive={isActive}
          onRemove={handleRemove}
        />
      </ScaleDecorator>
    ),
    [handleRemove]
  );

  if (cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons
            name={toolId === 'morning-routine' ? 'sunny-outline' : 'moon-outline'}
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
            onPress={() => router.push(`/routine-cards/${toolId}` as any)}
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
          onPress={() => router.push(`/routine-cards/${toolId}` as any)}
          style={[styles.fabSecondary, { borderColor: colors.tint }]}
        >
          <Ionicons name="add" size={24} color={colors.tint} />
        </Pressable>
        <Pressable onPress={onPlay} style={styles.fab}>
          <Ionicons name="play" size={28} color="#fff" />
        </Pressable>
      </View>
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
});
