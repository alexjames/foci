import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
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
  const scrollRef = useRef<ScrollView>(null);
  const cardYPositions = useRef<number[]>([]);

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

  // Auto-scroll to current card
  useEffect(() => {
    const y = cardYPositions.current[currentIndex];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
  }, [currentIndex]);

  const handlePausePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning((prev) => !prev);
  }, []);

  const [completionToast, setCompletionToast] = useState(false);
  const toastTranslateY = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastShowing = useRef(false);

  useEffect(() => {
    if (completionToast && !toastShowing.current) {
      toastShowing.current = true;
      toastTranslateY.setValue(-80);
      toastOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(toastTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [completionToast, toastTranslateY, toastOpacity]);

  const handleMarkDone = useCallback(() => {
    clearInterval(intervalRef.current);
    setMarkedDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check if all steps will be done after marking this one
    setMarkedDoneArr((arr) => {
      const updated = [...arr];
      updated[currentIndex] = true;

      const allDone = updated.every((v) => v);
      if (allDone) {
        // Show toast and auto-exit after 3 seconds
        setCompletionToast(true);
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        // Move to next incomplete step
        const nextIncomplete = updated.findIndex((v, i) => !v && i > currentIndex);
        const target = nextIncomplete !== -1
          ? nextIncomplete
          : updated.findIndex((v) => !v);
        if (target !== -1) {
          setCurrentIndex(target);
        }
      }

      return updated;
    });
  }, [currentIndex, onComplete, setMarkedDone]);

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
      <View style={[styles.completedScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        <Text style={[styles.completeTitle, { color: colors.text }]}>Routine Complete</Text>
        <Text style={[styles.completeSubtitle, { color: colors.secondaryText }]}>
          Great job finishing your {routine?.title ?? ''} routine.
        </Text>
        <Pressable onPress={handleDone} style={[styles.doneButton, { backgroundColor: colors.tint }]}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={[styles.completedScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.completeTitle, { color: colors.text }]}>No cards in this routine.</Text>
        <Pressable onPress={handleDone} style={[styles.doneButton, { backgroundColor: colors.tint }]}>
          <Text style={styles.doneButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Timer header */}
      <View style={[styles.timerSection, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={onComplete} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.secondaryText} />
        </Pressable>
        <View style={styles.timerCenter}>
          <Text style={[styles.timerText, { color: colors.tint }]}>{timeStr}</Text>
          <Text style={[styles.stepCounter, { color: colors.secondaryText }]}>
            Step {currentIndex + 1} of {totalCards}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Card list */}
      <ScrollView
        ref={scrollRef}
        style={styles.cardList}
        contentContainerStyle={[styles.cardListContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {playCards.map((card, i) => {
          const isCurrent = i === currentIndex;
          const isDone = markedDoneArr[i];
          const isFaded = !isCurrent && !isDone;

          const cardDurationI = routine?.cardDurations?.[card.id] ?? DEFAULT_DURATION;
          const elapsedI = elapsedArr[i] ?? 0;

          return (
            <Pressable
              key={card.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentIndex(i);
              }}
              onLayout={(e) => {
                cardYPositions.current[i] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.stepCard,
                { backgroundColor: colors.cardBackground },
                isCurrent && { borderColor: colors.tint, borderWidth: 2 },
                isDone && !isCurrent && { opacity: 0.55 },
                isFaded && { opacity: 0.4 },
              ]}
            >
              {/* Left indicator: check or step number */}
              {isDone ? (
                <Ionicons name="checkmark-circle" size={26} color="#34C759" />
              ) : (
                <View style={[styles.stepNumberCircle, { backgroundColor: isCurrent ? colors.tint + '22' : colors.separator }]}>
                  <Text style={[styles.stepNumber, { color: isCurrent ? colors.tint : colors.secondaryText }]}>{i + 1}</Text>
                </View>
              )}

              {/* Card content */}
              <View style={styles.cardBody}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: isDone ? colors.secondaryText : colors.text },
                    isDone && { textDecorationLine: 'line-through' },
                  ]}
                  numberOfLines={isCurrent ? undefined : 1}
                >
                  {card.title}
                </Text>
                {isCurrent && (
                  <>
                    <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                      {card.description}
                    </Text>
                    {!isDone && (
                      <View style={[styles.cardProgressTrack, { backgroundColor: colors.separator }]}>
                        <Animated.View style={[styles.cardProgressFill, { width: barWidth, backgroundColor: colors.tint }]} />
                      </View>
                    )}
                  </>
                )}
                {!isCurrent && isDone && (
                  <Text style={[styles.cardTimeLabel, { color: colors.secondaryText }]}>
                    {formatDuration(elapsedI)} / {formatDuration(cardDurationI)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.controlsBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.separator, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Center group: prev, play/pause, next */}
        <View style={styles.controlsCenter}>
          <Pressable
            onPress={handlePrev}
            disabled={currentIndex === 0}
            style={[styles.controlBtn, currentIndex === 0 && styles.controlBtnDisabled]}
          >
            <Ionicons name="play-skip-back" size={26} color={colors.secondaryText} />
          </Pressable>

          <Pressable onPress={handlePausePlay} style={[styles.mainControlBtn, { backgroundColor: colors.tint }]}>
            <Ionicons name={isRunning ? 'pause' : 'play'} size={30} color="#fff" />
          </Pressable>

          <Pressable onPress={handleNext} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={26} color={colors.secondaryText} />
          </Pressable>
        </View>

        {/* Right: mark done */}
        <Pressable
          onPress={handleMarkDone}
          disabled={markedDone}
          style={[styles.controlBtn, styles.controlBtnRight, markedDone && styles.controlBtnDisabled]}
        >
          <Ionicons
            name={markedDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={28}
            color={markedDone ? '#34C759' : colors.tint}
          />
        </Pressable>
      </View>

      {/* Completion toast */}
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { transform: [{ translateY: toastTranslateY }], opacity: toastOpacity, backgroundColor: '#34C759' }]}
      >
        <Text style={styles.toastText}>{routine?.title ?? 'Routine'} completed!</Text>
      </Animated.View>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Timer header
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
  },
  timerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  stepCounter: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card list
  cardList: {
    flex: 1,
  },
  cardListContent: {
    paddingHorizontal: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.md,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumber: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  cardProgressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: Layout.spacing.sm,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardTimeLabel: {
    fontSize: Layout.fontSize.caption - 1,
    marginTop: 2,
  },
  // Controls bar
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  controlsCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.lg,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnRight: {
    position: 'absolute',
    right: Layout.spacing.md,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  mainControlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Completion screen
  completedScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  completeTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: 22,
    paddingHorizontal: Layout.spacing.xl,
  },
  doneButton: {
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
  toast: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
