import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/Themed';
import * as Haptics from 'expo-haptics';
import { Layout } from '@/src/constants/Layout';

interface CommitButtonProps {
  onPress: () => void;
  visible: boolean;
}

export function CommitButton({ onPress, visible }: CommitButtonProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ scale }] }]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.text}>Commit</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: Layout.spacing.xxl,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Layout.spacing.xxl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
});
