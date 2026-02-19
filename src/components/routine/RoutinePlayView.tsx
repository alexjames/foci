import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  useColorScheme,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RoutinesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { getPresetById } from '@/src/constants/routineCards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RoutinePlayViewProps {
  routineId: string;
  onComplete: () => void;
}

interface PlayCard {
  id: string;
  title: string;
  description: string;
  type: 'card' | 'done';
}

export function RoutinePlayView({ routineId, onComplete }: RoutinePlayViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config } = useToolConfig<RoutinesConfig>('routines');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<PlayCard>>(null);

  const routine = config?.routines.find((r) => r.id === routineId);

  const playCards: PlayCard[] = useMemo(() => {
    if (!routine) return [{ id: 'done', title: '', description: '', type: 'done' }];

    const resolved: PlayCard[] = routine.orderedCards
      .map((cardId) => {
        const preset = getPresetById(cardId);
        if (preset) return { id: preset.id, title: preset.title, description: preset.description, type: 'card' as const };
        const custom = routine.customCards.find((c) => c.id === cardId);
        if (custom) return { id: custom.id, title: custom.title, description: custom.description, type: 'card' as const };
        return null;
      })
      .filter((c): c is PlayCard => c !== null);

    resolved.push({ id: 'done', title: '', description: '', type: 'done' });
    return resolved;
  }, [routine]);

  const totalCards = playCards.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<PlayCard>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleDone = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  }, [onComplete]);

  const renderItem = useCallback(
    ({ item, index }: { item: PlayCard; index: number }) => {
      if (item.type === 'done') {
        return (
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Ionicons name="checkmark-circle" size={80} color={colors.tint} />
            <Text style={[styles.doneTitle, { color: colors.text }]}>Routine Complete</Text>
            <Text style={[styles.doneMessage, { color: colors.secondaryText }]}>
              Great job finishing your {routine?.title ?? ''} routine.
            </Text>
            <Pressable
              onPress={handleDone}
              style={({ pressed }) => [styles.doneButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <View style={styles.cardNumberCircle}>
            <Text style={[styles.cardNumber, { color: colors.tint }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
            {item.description}
          </Text>
        </View>
      );
    },
    [colors, routine, handleDone]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onComplete} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.progress, { color: colors.secondaryText }]}>
          {currentIndex < totalCards ? `${currentIndex + 1} of ${totalCards}` : ''}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        ref={flatListRef}
        data={playCards}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
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
  },
  progress: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  cardNumberCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  cardNumber: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },
  cardDescription: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  doneTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  doneMessage: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Layout.spacing.xxl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginTop: Layout.spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
});
