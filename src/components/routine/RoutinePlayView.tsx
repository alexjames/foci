import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RoutinesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { getPresetById } from '@/src/constants/routineCards';

const DEFAULT_DURATION = 180; // 3 minutes

interface RoutinePlayViewProps {
  routineId: string;
  onComplete: () => void;
}

interface PlayCard {
  id: string;
  title: string;
  description: string;
}

export function RoutinePlayView({ routineId, onComplete }: RoutinePlayViewProps) {
  const colors = Colors['dark']; // always dark in play mode
  const { config } = useToolConfig<RoutinesConfig>('routines');

  const routine = config?.routines.find((r) => r.id === routineId);

  const playCards: PlayCard[] = useMemo(() => {
    if (!routine) return [];
    return routine.orderedCards
      .map((cardId) => {
        const preset = getPresetById(cardId);
        if (preset) return { id: preset.id, title: preset.title, description: preset.description };
        const custom = routine.customCards.find((c) => c.id === cardId);
        if (custom) return { id: custom.id, title: custom.title, description: custom.description };
        return null;
      })
      .filter((c): c is PlayCard => c !== null);
  }, [routine]);

  const totalCards = playCards.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  // Per-card state stored in arrays so navigating away and back preserves progress
  const [elapsedArr, setElapsedArr] = useState<number[]>(() => Array(totalCards).fill(0));
  const [markedDoneArr, setMarkedDoneArr] = useState<boolean[]>(() => Array(totalCards).fill(false));

  const elapsed = elapsedArr[currentIndex] ?? 0;
  const markedDone = markedDoneArr[currentIndex] ?? false;

  const setElapsed = useCallback((updater: number | ((prev: number) => number)) => {
    setElapsedArr((arr) => {
      const next = [...arr];
      next[currentIndex] = typeof updater === 'function' ? updater(next[currentIndex] ?? 0) : updater;
      return next;
    });
  }, [currentIndex]);

  const setMarkedDone = useCallback((val: boolean) => {
    setMarkedDoneArr((arr) => {
      const next = [...arr];
      next[currentIndex] = val;
      return next;
    });
  }, [currentIndex]);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentCard = playCards[currentIndex];
  const cardDuration = currentCard
    ? (routine?.cardDurations?.[currentCard.id] ?? DEFAULT_DURATION)
    : DEFAULT_DURATION;

  // Animate progress bar whenever elapsed/markedDone/card changes
  useEffect(() => {
    const toValue = markedDone ? 1 : Math.min(elapsed / cardDuration, 1);
    Animated.timing(progressAnim, {
      toValue,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [elapsed, markedDone, cardDuration, currentIndex]);

  // Keep a ref to cardDuration so the interval callback always sees the latest value
  const cardDurationRef = useRef(cardDuration);
  cardDurationRef.current = cardDuration;

  // Single timer effect: restarts whenever card index, running state, or markedDone changes
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isRunning && !markedDone && elapsed < cardDuration) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= cardDurationRef.current) {
            clearInterval(intervalRef.current);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return cardDurationRef.current;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, markedDone, currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const resetCard = useCallback(() => {
    clearInterval(intervalRef.current);
    setElapsed(0);
    setMarkedDone(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Timer effect restarts automatically when markedDone → false
  }, [setElapsed, setMarkedDone]);

  const handlePausePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning((prev) => !prev);
  }, []);

  const handleMarkDone = useCallback(() => {
    clearInterval(intervalRef.current);
    setMarkedDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [setMarkedDone]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      clearInterval(intervalRef.current);
      setIsComplete(true);
    }
  }, [currentIndex, totalCards]);

  const handleDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  }, [onComplete]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const remainingSeconds = Math.max(0, cardDuration - elapsed);
  const remMins = Math.floor(remainingSeconds / 60);
  const remSecs = remainingSeconds % 60;
  const timeStr = `${remMins}:${remSecs.toString().padStart(2, '0')}`;

  // Completed screen
  if (isComplete) {
    return (
      <View style={styles.fullScreenCentered}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        <Text style={styles.completeTitle}>Routine Complete</Text>
        <Text style={styles.completeSubtitle}>
          Great job finishing your {routine?.title ?? ''} routine.
        </Text>
        <Pressable onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.fullScreenCentered}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.completeTitle}>No cards in this routine.</Text>
        <Pressable onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" />

      {/* Header: dots + close, near top with safe-area padding */}
      <View style={styles.header}>
        <View style={styles.dotRow}>
          {playCards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                markedDoneArr[i] && styles.dotDone,
              ]}
            />
          ))}
        </View>
        <Pressable onPress={onComplete} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#999" />
        </Pressable>
      </View>

      {/* Card content centered in remaining space */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{currentCard.title}</Text>
        <Text style={styles.cardDescription}>{currentCard.description}</Text>
        <Text style={styles.timeRemaining}>{timeStr}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: barWidth }]} />
      </View>

      {/* Controls: Reset | Prev | Pause/Play | Next | Mark Done */}
      <View style={styles.controls}>
        <Pressable onPress={resetCard} style={styles.controlBtn}>
          <Ionicons name="refresh" size={28} color="#999" />
        </Pressable>

        <Pressable
          onPress={handlePrev}
          style={[styles.controlBtn, currentIndex === 0 && styles.controlBtnDisabled]}
          disabled={currentIndex === 0}
        >
          <Ionicons name="play-skip-back" size={28} color={currentIndex === 0 ? '#444' : '#999'} />
        </Pressable>

        <Pressable onPress={handlePausePlay} style={[styles.controlBtn, styles.mainControlBtn]}>
          <Ionicons name={isRunning ? 'pause' : 'play'} size={32} color="#fff" />
        </Pressable>

        <Pressable onPress={handleNext} style={styles.controlBtn}>
          <Ionicons name="play-skip-forward" size={28} color="#999" />
        </Pressable>

        {!markedDone ? (
          <Pressable onPress={handleMarkDone} style={styles.controlBtn}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#999" />
          </Pressable>
        ) : (
          <Pressable onPress={handleMarkDone} style={styles.controlBtn} disabled>
            <Ionicons name="checkmark-circle" size={28} color="#34C759" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  fullScreenCentered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: 56,
    paddingBottom: Layout.spacing.md,
  },
  dotRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    backgroundColor: '#555',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDone: {
    backgroundColor: '#34C759',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  cardTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },
  cardDescription: {
    fontSize: Layout.fontSize.body,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Layout.spacing.lg,
  },
  timeRemaining: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#222',
    marginBottom: Layout.spacing.xxl,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#0A84FF',
    borderRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.xxl,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  mainControlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
  },
  // Completed screen
  completeTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    color: '#fff',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: Layout.fontSize.body,
    color: '#999',
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: 22,
    paddingHorizontal: Layout.spacing.xl,
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
    color: '#fff',
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
});
