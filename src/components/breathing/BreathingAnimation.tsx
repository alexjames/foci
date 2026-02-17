import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { BreathingPhase } from '@/src/types';

interface BreathingAnimationProps {
  phases: BreathingPhase[];
  isRunning: boolean;
  currentPhaseIndex: number;
  currentPhaseLabel: string;
}

export function BreathingAnimation({
  phases,
  isRunning,
  currentPhaseIndex,
  currentPhaseLabel,
}: BreathingAnimationProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (!isRunning) {
      scale.value = withTiming(0.5, { duration: 500 });
      opacity.value = withTiming(0.6, { duration: 500 });
      return;
    }

    const phase = phases[currentPhaseIndex];
    if (!phase) return;

    const isInhale = phase.label === 'Inhale';
    const isExhale = phase.label === 'Exhale';
    const duration = phase.durationSeconds * 1000;

    if (isInhale) {
      scale.value = withTiming(1, { duration, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(1, { duration, easing: Easing.inOut(Easing.ease) });
    } else if (isExhale) {
      scale.value = withTiming(0.5, { duration, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0.6, { duration, easing: Easing.inOut(Easing.ease) });
    }
    // Hold phases: no animation, circle stays at current size
  }, [isRunning, currentPhaseIndex, phases]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: colors.tint + '40', borderColor: colors.tint },
          circleStyle,
        ]}
      >
        <Text style={[styles.phaseLabel, { color: colors.tint }]}>
          {isRunning ? currentPhaseLabel : 'Ready'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '600',
  },
});
