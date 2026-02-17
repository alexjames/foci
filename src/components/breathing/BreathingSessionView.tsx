import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, useColorScheme } from 'react-native';
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

  const handleStart = () => {
    setIsRunning(true);
    setElapsed(0);
    setCurrentPhaseIndex(0);
    startNextPhase(0, preset);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= durationSeconds) {
          handleStop();
          return durationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  const handleSelectPreset = (id: string) => {
    if (isRunning) return;
    setConfig({
      ...(config ?? { toolId: 'breathing', selectedPresetId: id, durationSeconds: 120, notificationEnabled: false }),
      selectedPresetId: id,
    });
  };

  const remainingSeconds = Math.max(0, durationSeconds - elapsed);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BreathingAnimation
        phases={preset.phases}
        isRunning={isRunning}
        currentPhaseIndex={currentPhaseIndex}
        currentPhaseLabel={preset.phases[currentPhaseIndex]?.label ?? ''}
      />

      <Text style={[styles.timer, { color: colors.text }]}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>

      <Pressable
        onPress={isRunning ? handleStop : handleStart}
        style={[styles.actionButton, { backgroundColor: isRunning ? colors.destructive : colors.tint }]}
      >
        <Ionicons name={isRunning ? 'stop' : 'play'} size={24} color="#fff" />
        <Text style={styles.actionText}>{isRunning ? 'Stop' : 'Start'}</Text>
      </Pressable>

      {!isRunning && (
        <View style={styles.presetSection}>
          <BreathingPresetPicker
            presets={BREATHING_PRESETS}
            selectedId={selectedPresetId}
            onSelect={handleSelectPreset}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    marginVertical: Layout.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
  },
  actionText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  presetSection: {
    marginTop: Layout.spacing.sm,
  },
});
