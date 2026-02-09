import React from 'react';
import { StyleSheet, ScrollView, Pressable, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import * as Haptics from 'expo-haptics';

export type VisualizationType =
  | 'hourglass'
  | 'yearGrid'
  | 'weekGrid'
  | 'monthDots'
  | 'progressBar'
  | 'seasons'
  | 'heartbeats'
  | 'sunsets';

const VIEW_OPTIONS: { key: VisualizationType; label: string }[] = [
  { key: 'hourglass', label: 'Hourglass' },
  { key: 'yearGrid', label: 'Years' },
  { key: 'weekGrid', label: 'Weeks' },
  { key: 'monthDots', label: 'Months' },
  { key: 'progressBar', label: 'Progress' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'heartbeats', label: 'Heartbeats' },
  { key: 'sunsets', label: 'Sunsets' },
];

interface ViewSwitcherProps {
  active: VisualizationType;
  onChange: (view: VisualizationType) => void;
}

export function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handlePress = async (key: VisualizationType) => {
    if (key === active) return;
    await Haptics.selectionAsync();
    onChange(key);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {VIEW_OPTIONS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => handlePress(key)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.tint : colors.cardBackground,
                borderColor: isActive ? colors.tint : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: isActive ? '#FFFFFF' : colors.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: Layout.spacing.md,
  },
  container: {
    paddingHorizontal: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  pill: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
});
