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
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { BreathingConfig, BreathingPreset } from '@/src/types';
import { BREATHING_PRESETS } from '@/src/constants/tools';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { BreathingAnimation } from './BreathingAnimation';
import { BreathingPresetPicker } from './BreathingPresetPicker';

export function BreathingSessionView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<BreathingConfig>('breathing');

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionActive, setSessionActive] = useState(false); // controls full-screen modal
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPresetId = config?.selectedPresetId ?? 'box';
  const durationSeconds = config?.durationSeconds ?? 120;
  const preset = BREATHING_PRESETS.find((p) => p.id === selectedPresetId) ?? BREATHING_PRESETS[0];

  const startNextPhase = useCallback(
    (phaseIdx: number, preset: BreathingPreset) => {
      const phase = preset.phases[phaseIdx % preset.phases.length];
      setCurrentPhaseIndex(phaseIdx % preset.phases.length);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      phaseTimerRef.current = setTimeout(() => {
        startNextPhase(phaseIdx + 1, preset);
      }, phase.durationSeconds * 1000);
    },
    []
  );

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
  }, []);

  const startElapsedTimer = useCallback((startElapsed: number) => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= durationSeconds) {
          clearTimers();
          setIsRunning(false);
          setIsPaused(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return durationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
  }, [durationSeconds, clearTimers]);

  const handleStart = () => {
    clearTimers();
    setElapsed(0);
    setCurrentPhaseIndex(0);
    setIsRunning(true);
    setIsPaused(false);
    setSessionActive(true);
    startNextPhase(0, preset);
    startElapsedTimer(0);
  };

  const handlePause = useCallback(() => {
    clearTimers();
    setIsRunning(false);
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [clearTimers]);

  const handleResume = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    startNextPhase(currentPhaseIndex, preset);
    startElapsedTimer(elapsed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentPhaseIndex, preset, elapsed, startNextPhase, startElapsedTimer]);

  const handleStop = useCallback(() => {
    clearTimers();
    setIsRunning(false);
    setIsPaused(false);
    setSessionActive(false);
    setElapsed(0);
    setCurrentPhaseIndex(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [clearTimers]);

  const handleSelectPreset = (id: string) => {
    setConfig({
      ...(config ?? { toolId: 'breathing', selectedPresetId: id, durationSeconds: 120, notificationEnabled: false }),
      selectedPresetId: id,
    });
  };

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const remainingSeconds = Math.max(0, durationSeconds - elapsed);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Resting screen: preset picker + start button */}
      <BreathingPresetPicker
        presets={BREATHING_PRESETS}
        selectedId={selectedPresetId}
        onSelect={handleSelectPreset}
      />

      <Pressable
        onPress={handleStart}
        style={[styles.startButton, { backgroundColor: colors.tint }]}
      >
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.startButtonText}>Start</Text>
      </Pressable>

      {/* Full-screen session modal */}
      <Modal
        visible={sessionActive}
        animationType="fade"
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.fullScreen}>
          {/* Breathing circle */}
          <BreathingAnimation
            phases={preset.phases}
            isRunning={isRunning}
            currentPhaseIndex={currentPhaseIndex}
          />

          {/* Phase label */}
          <Text style={styles.phaseLabel}>
            {isRunning ? (preset.phases[currentPhaseIndex]?.label ?? '') : isPaused ? 'Paused' : 'Ready'}
          </Text>

          {/* Timer */}
          <Text style={styles.fullScreenTime}>{timerStr}</Text>

          {/* Controls: restart | pause/resume | stop */}
          <View style={styles.fullScreenControls}>
            <Pressable onPress={handleStart} style={styles.controlBtn}>
              <Ionicons name="refresh" size={28} color="#999" />
            </Pressable>
            <Pressable
              onPress={isPaused ? handleResume : handlePause}
              style={[styles.controlBtn, styles.mainControlBtn]}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={32} color="#fff" />
            </Pressable>
            <Pressable onPress={handleStop} style={styles.controlBtn}>
              <Ionicons name="stop" size={28} color="#999" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
  },
  startButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },

  // Session (full-screen modal) — matches FocusTimerSession style
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: Layout.fontSize.body,
    color: '#999',
    marginTop: Layout.spacing.md,
  },
  fullScreenTime: {
    fontSize: 56,
    fontWeight: '200',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    marginTop: Layout.spacing.sm,
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
});
