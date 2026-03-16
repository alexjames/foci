import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  StatusBar,
  AppState,
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
import { DurationPicker } from './DurationPicker';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 280;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MAX_SECONDS = 8 * 60 * 60;

export function formatTime(totalSeconds: number): string {
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
}

async function scheduleTimerNotification(title: string, body: string, seconds: number): Promise<string | null> {
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      } as any,
    });
    return id;
  } catch {
    return null;
  }
}

async function cancelTimerNotification(id: string | null) {
  if (!id) return;
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export type TimerPhase = 'idle' | 'running' | 'paused' | 'break-prompt' | 'break-running' | 'break-paused' | 'done';

interface FocusTimerSessionProps {
  /** When set, the timer launches directly into full-screen countdown mode for a task */
  taskTitle?: string;
  /** Seconds to use when launching for a task (falls back to saved config) */
  taskDurationSeconds?: number;
  /** Called when the session ends (focus complete or break complete); receives elapsed seconds */
  onTaskComplete?: (elapsedSeconds: number) => void;
  /** Called when user dismisses/stops in task mode */
  onTaskDismiss?: () => void;
}

export function FocusTimerSession({
  taskTitle,
  taskDurationSeconds,
  onTaskComplete,
  onTaskDismiss,
}: FocusTimerSessionProps = {}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<FocusTimerConfig>('focus-timer');

  const savedDuration = config?.lastDurationSeconds ?? 25 * 60;
  const breakDuration = config?.breakDurationSeconds ?? 5 * 60;
  const alarmType = config?.alarmType ?? 'both';

  const taskMode = !!taskTitle;
  const initialDuration = taskMode ? (taskDurationSeconds ?? savedDuration) : savedDuration;

  const [phase, setPhase] = useState<TimerPhase>(() => taskMode ? 'running' : 'idle');
  const [remaining, setRemaining] = useState(initialDuration);
  const [totalDuration, setTotalDuration] = useState(initialDuration);
  const [showFullScreen, setShowFullScreen] = useState(taskMode);

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const notifIdRef = useRef<string | null>(null);
  const startWallTimeRef = useRef<number>(0);
  const startRemainingRef = useRef<number>(initialDuration);
  const progress = useSharedValue(taskMode ? 0 : 0);

  // Sync remaining when config changes while idle (standalone mode only)
  useEffect(() => {
    if (!taskMode && phase === 'idle') {
      setRemaining(savedDuration);
      setTotalDuration(savedDuration);
    }
  }, [savedDuration, phase, taskMode]);

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
      if (taskMode && phase === 'running') {
        // In task mode, spin continuously (one rotation per minute)
        const pct = ((totalDuration - remaining) % 60) / 60;
        progress.value = withTiming(pct, { duration: 900, easing: Easing.linear });
      } else {
        const pct = 1 - remaining / totalDuration;
        progress.value = withTiming(pct, { duration: 900, easing: Easing.linear });
      }
    }
  }, [remaining, totalDuration, taskMode, phase]);

  // Detect timer completion
  useEffect(() => {
    if (remaining === 0 && (phase === 'running' || phase === 'break-running')) {
      fireAlarm(alarmType);
      cancelTimerNotification(notifIdRef.current);
      notifIdRef.current = null;
      if (phase === 'running') {
        if (taskMode) {
          setPhase('done');
        } else {
          setPhase('break-prompt');
        }
      } else {
        setPhase('done');
      }
      deactivateKeepAwake();
    }
  }, [remaining, phase, alarmType, taskMode]);

  // Correct remaining time when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (phase === 'running' || phase === 'break-running') {
          const elapsed = Math.floor((Date.now() - startWallTimeRef.current) / 1000);
          const corrected = Math.max(0, startRemainingRef.current - elapsed);
          clearInterval(timerRef.current);
          setRemaining(corrected);
          if (corrected > 0) {
            startWallTimeRef.current = Date.now();
            startRemainingRef.current = corrected;
            timerRef.current = setInterval(tick, 1000);
          }
        }
      }
    });
    return () => sub.remove();
  }, [phase, tick]);

  const startCountdown = useCallback((seconds: number) => {
    clearInterval(timerRef.current);
    setRemaining(seconds);
    setTotalDuration(seconds);
    setPhase('running');
    setShowFullScreen(true);
    progress.value = 0;
    activateKeepAwakeAsync();
    startWallTimeRef.current = Date.now();
    startRemainingRef.current = seconds;
    timerRef.current = setInterval(tick, 1000);
    // Schedule background notification
    const label = taskTitle ?? 'Focus session';
    scheduleTimerNotification('Foci', `${label} complete!`, seconds).then((id) => {
      notifIdRef.current = id;
    });
  }, [tick, taskTitle]);

  // In task mode, start immediately on mount
  useEffect(() => {
    if (taskMode) {
      activateKeepAwakeAsync();
      startWallTimeRef.current = Date.now();
      startRemainingRef.current = initialDuration;
      timerRef.current = setInterval(tick, 1000);
      const label = taskTitle ?? 'Focus session';
      scheduleTimerNotification('Foci', `${label} complete!`, initialDuration).then((id) => {
        notifIdRef.current = id;
      });
    }
    return () => {
      clearInterval(timerRef.current);
      deactivateKeepAwake();
      cancelTimerNotification(notifIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    setConfig({
      ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: savedDuration, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
      lastDurationSeconds: savedDuration,
    });
    startCountdown(savedDuration);
  };

  const handlePause = () => {
    clearInterval(timerRef.current);
    cancelTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    setPhase(phase === 'break-running' ? 'break-paused' : 'paused');
    deactivateKeepAwake();
  };

  const handleResume = () => {
    const newPhase = phase === 'break-paused' ? 'break-running' : 'running';
    setPhase(newPhase);
    activateKeepAwakeAsync();
    startWallTimeRef.current = Date.now();
    startRemainingRef.current = remaining;
    timerRef.current = setInterval(tick, 1000);
    const label = taskTitle ?? 'Focus session';
    scheduleTimerNotification('Foci', `${label} complete!`, remaining).then((id) => {
      notifIdRef.current = id;
    });
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    cancelTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    deactivateKeepAwake();
    if (taskMode) {
      onTaskDismiss?.();
    } else {
      setPhase('idle');
      setRemaining(savedDuration);
      setTotalDuration(savedDuration);
      setShowFullScreen(false);
      progress.value = 0;
    }
  };

  const handleStartBreak = () => {
    startCountdown(breakDuration);
    setPhase('break-running');
  };

  const handleSkipBreak = () => handleReset();

  const handleDone = () => {
    if (taskMode) {
      const elapsed = totalDuration; // countdown reached 0
      onTaskComplete?.(elapsed);
    } else {
      handleReset();
    }
  };

  const handlePreset = (seconds: number) => {
    if (phase !== 'idle') return;
    setConfig({
      ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: savedDuration, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
      lastDurationSeconds: seconds,
    });
  };

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const isRunning = phase === 'running' || phase === 'break-running';
  const isPaused = phase === 'paused' || phase === 'break-paused';

  // Label inside ring
  const ringLabel = taskMode
    ? phase === 'running' || phase === 'paused'
      ? formatTime(remaining)
      : formatTime(remaining)
    : formatTime(remaining);

  const fullScreenModal = (
    <Modal visible={showFullScreen} animationType="fade" statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.fullScreen}>
        {/* Task title (task mode only) */}
        {taskTitle && (
          <Text style={styles.taskTitle} numberOfLines={2}>{taskTitle}</Text>
        )}

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
            <Text style={styles.fullScreenTime}>{ringLabel}</Text>
            {phase.startsWith('break') && (
              <Text style={styles.phaseLabel}>Break</Text>
            )}
            {taskMode && (phase === 'running' || phase === 'paused') && (
              <Text style={styles.elapsedLabel}>remaining</Text>
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
            <Text style={styles.breakTitle}>{taskMode ? 'Focus session complete!' : 'Break complete!'}</Text>
            <Pressable onPress={handleDone} style={[styles.breakBtn, { backgroundColor: '#0A84FF' }]}>
              <Text style={styles.breakBtnText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* Controls */}
        {(isRunning || isPaused) && (
          <View style={styles.fullScreenControls}>
            <Pressable onPress={handleReset} style={styles.controlBtn}>
              <Ionicons name="stop" size={28} color="#999" />
            </Pressable>
            <Pressable
              onPress={isPaused ? handleResume : handlePause}
              style={[styles.controlBtn, styles.mainControlBtn]}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={32} color="#fff" />
            </Pressable>
            <View style={{ width: 56 }} />
          </View>
        )}
      </View>
    </Modal>
  );

  // Task mode: just render the modal (no setup screen)
  if (taskMode) {
    return fullScreenModal;
  }

  // Standalone mode: setup screen + modal
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {fullScreenModal}

      <DurationPicker
        durationSeconds={savedDuration}
        onChangeDuration={(seconds) => {
          if (phase !== 'idle') return;
          setConfig({
            ...(config ?? { toolId: 'focus-timer', lastDurationSeconds: savedDuration, breakDurationSeconds: breakDuration, alarmType, notificationEnabled: false }),
            lastDurationSeconds: seconds,
          });
        }}
        colors={colors}
      />

      <View style={styles.presets}>
        {FOCUS_TIMER_PRESETS.map((preset) => (
          <Pressable
            key={preset.seconds}
            style={[
              styles.presetChip,
              { backgroundColor: colors.cardBackground },
              savedDuration === preset.seconds && { backgroundColor: colors.tint },
            ]}
            onPress={() => handlePreset(preset.seconds)}
          >
            <Text
              style={[
                styles.presetText,
                { color: colors.text },
                savedDuration === preset.seconds && { color: '#fff' },
              ]}
            >
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </View>

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
  taskTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.xl,
    marginBottom: 48,
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
  elapsedLabel: {
    fontSize: Layout.fontSize.caption,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
