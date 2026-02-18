import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { FocusTimerConfig, FocusTimerAlarm } from '@/src/types';
import { FOCUS_TIMER_PRESETS } from '@/src/constants/tools';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 280;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MAX_SECONDS = 8 * 60 * 60;

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fireAlarm(alarmType: FocusTimerAlarm) {
  if (alarmType === 'vibration' || alarmType === 'both') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  // Sound would require expo-av; for now vibration is immediate feedback
  // A full implementation would play an alarm sound here
}

type TimerPhase = 'idle' | 'running' | 'paused' | 'break-prompt' | 'break-running' | 'break-paused' | 'done';

export function FocusTimerSession() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<FocusTimerConfig>('focus-timer');

  const durationSeconds = config?.lastDurationSeconds ?? 25 * 60;
  const breakDuration = config?.breakDurationSeconds ?? 5 * 60;
  const alarmType = config?.alarmType ?? 'both';

  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [remaining, setRemaining] = useState(durationSeconds);
  const [totalDuration, setTotalDuration] = useState(durationSeconds);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const progress = useSharedValue(0);

  // Sync remaining when config changes while idle
  useEffect(() => {
    if (phase === 'idle') {
      setRemaining(durationSeconds);
      setTotalDuration(durationSeconds);
    }
  }, [durationSeconds, phase]);

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(timerRef.current);
        return 0;
      }
      return prev - 1;
    });
  }, []);

  // Update progress ring
  useEffect(() => {
    if (totalDuration > 0) {
      const pct = 1 - remaining / totalDuration;
      progress.value = withTiming(pct, { duration: 900, easing: Easing.linear });
    }
  }, [remaining, totalDuration]);

  // Detect timer completion
  useEffect(() => {
    if (remaining === 0 && (phase === 'running' || phase === 'break-running')) {
      fireAlarm(alarmType);
      if (phase === 'running') {
        setPhase('break-prompt');
      } else {
        setPhase('done');
      }
      deactivateKeepAwake();
    }
  }, [remaining, phase, alarmType]);

  const startTimer = (seconds: number) => {
    setRemaining(seconds);
    setTotalDuration(seconds);
    setPhase('running');
    setShowFullScreen(true);
    progress.value = 0;
    activateKeepAwakeAsync();
    timerRef.current = setInterval(tick, 1000);
  };

  const handleStart = () => {
    // Save last duration
    setConfig({
      ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: durationSeconds, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
      lastDurationSeconds: durationSeconds,
    });
    startTimer(durationSeconds);
  };

  const handlePause = () => {
    clearInterval(timerRef.current);
    setPhase(phase === 'break-running' ? 'break-paused' : 'paused');
  };

  const handleResume = () => {
    setPhase(phase === 'break-paused' ? 'break-running' : 'running');
    timerRef.current = setInterval(tick, 1000);
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    deactivateKeepAwake();
    setPhase('idle');
    setRemaining(durationSeconds);
    setTotalDuration(durationSeconds);
    setShowFullScreen(false);
    progress.value = 0;
  };

  const handleStartBreak = () => {
    startTimer(breakDuration);
    setPhase('break-running');
  };

  const handleSkipBreak = () => {
    handleReset();
  };

  const handleDone = () => {
    handleReset();
  };

  const handleAdjustDuration = (delta: number) => {
    if (phase !== 'idle') return;
    const newDuration = Math.max(60, Math.min(MAX_SECONDS, durationSeconds + delta));
    setConfig({
      ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: durationSeconds, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
      lastDurationSeconds: newDuration,
    });
  };

  const handlePreset = (seconds: number) => {
    if (phase !== 'idle') return;
    setConfig({
      ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: durationSeconds, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
      lastDurationSeconds: seconds,
    });
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      deactivateKeepAwake();
    };
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const isRunning = phase === 'running' || phase === 'break-running';
  const isPaused = phase === 'paused' || phase === 'break-paused';

  // Full-screen countdown modal
  const fullScreenModal = (
    <Modal visible={showFullScreen} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.fullScreen}>
        {/* Progress ring */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="#222"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={phase.startsWith('break') ? '#34C759' : '#0A84FF'}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.timeOverlay}>
            <Text style={styles.fullScreenTime}>{formatTime(remaining)}</Text>
            {phase.startsWith('break') && (
              <Text style={styles.phaseLabel}>Break</Text>
            )}
          </View>
        </View>

        {/* Break prompt */}
        {phase === 'break-prompt' && (
          <View style={styles.breakPrompt}>
            <Text style={styles.breakTitle}>Focus session complete!</Text>
            <Text style={styles.breakSubtitle}>Take a {Math.round(breakDuration / 60)} minute break?</Text>
            <View style={styles.breakButtons}>
              <Pressable onPress={handleStartBreak} style={[styles.breakBtn, { backgroundColor: '#34C759' }]}>
                <Text style={styles.breakBtnText}>Start Break</Text>
              </Pressable>
              <Pressable onPress={handleSkipBreak} style={[styles.breakBtn, { backgroundColor: '#555' }]}>
                <Text style={styles.breakBtnText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Done state */}
        {phase === 'done' && (
          <View style={styles.breakPrompt}>
            <Text style={styles.breakTitle}>Break complete!</Text>
            <Pressable onPress={handleDone} style={[styles.breakBtn, { backgroundColor: '#0A84FF' }]}>
              <Text style={styles.breakBtnText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* Controls */}
        {(isRunning || isPaused) && (
          <View style={styles.fullScreenControls}>
            <Pressable onPress={handleReset} style={styles.controlBtn}>
              <Ionicons name="refresh" size={28} color="#999" />
            </Pressable>
            <Pressable
              onPress={isPaused ? handleResume : handlePause}
              style={[styles.controlBtn, styles.mainControlBtn]}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={32} color="#fff" />
            </Pressable>
            <Pressable onPress={handleReset} style={styles.controlBtn}>
              <Ionicons name="stop" size={28} color="#999" />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );

  // Setup screen
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {fullScreenModal}

      {/* Duration display with steppers */}
      <View style={styles.durationSection}>
        <Pressable onPress={() => handleAdjustDuration(-60)}>
          <Ionicons name="remove-circle-outline" size={36} color={colors.tint} />
        </Pressable>
        <Text style={[styles.durationText, { color: colors.text }]}>
          {formatTime(durationSeconds)}
        </Text>
        <Pressable onPress={() => handleAdjustDuration(60)}>
          <Ionicons name="add-circle-outline" size={36} color={colors.tint} />
        </Pressable>
      </View>

      {/* Presets */}
      <View style={styles.presets}>
        {FOCUS_TIMER_PRESETS.map((preset) => (
          <Pressable
            key={preset.seconds}
            style={[
              styles.presetChip,
              { backgroundColor: colors.cardBackground },
              durationSeconds === preset.seconds && { backgroundColor: colors.tint },
            ]}
            onPress={() => handlePreset(preset.seconds)}
          >
            <Text
              style={[
                styles.presetText,
                { color: colors.text },
                durationSeconds === preset.seconds && { color: '#fff' },
              ]}
            >
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Start button */}
      <Pressable
        onPress={handleStart}
        style={[styles.startButton, { backgroundColor: colors.tint }]}
      >
        <Ionicons name="play" size={24} color="#fff" />
        <Text style={styles.startButtonText}>Start Focus</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.md,
    justifyContent: 'center',
  },
  durationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
  },
  durationText: {
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    minWidth: 200,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xl,
  },
  presetChip: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
  },
  presetText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  startButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },

  // Full-screen modal
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  fullScreenTime: {
    fontSize: 56,
    fontWeight: '200',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  phaseLabel: {
    fontSize: Layout.fontSize.body,
    color: '#34C759',
    marginTop: Layout.spacing.xs,
  },
  fullScreenControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    gap: Layout.spacing.xl,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainControlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
  },
  breakPrompt: {
    alignItems: 'center',
    marginTop: 48,
  },
  breakTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '600',
    color: '#fff',
    marginBottom: Layout.spacing.sm,
  },
  breakSubtitle: {
    fontSize: Layout.fontSize.body,
    color: '#999',
    marginBottom: Layout.spacing.lg,
  },
  breakButtons: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  breakBtn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  breakBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
