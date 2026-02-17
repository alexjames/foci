import React from 'react';
import { StyleSheet, View, Text, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { BreathingPreset } from '@/src/types';

interface BreathingPresetPickerProps {
  presets: BreathingPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BreathingPresetPicker({ presets, selectedId, onSelect }: BreathingPresetPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      {presets.map((preset) => {
        const isSelected = preset.id === selectedId;
        return (
          <Pressable
            key={preset.id}
            style={[
              styles.presetCard,
              { backgroundColor: colors.cardBackground },
              isSelected && { borderColor: colors.tint, borderWidth: 2 },
            ]}
            onPress={() => onSelect(preset.id)}
          >
            <View style={styles.presetHeader}>
              <Text style={[styles.presetName, { color: colors.text }]}>{preset.name}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.tint} />}
            </View>
            <Text style={[styles.presetDesc, { color: colors.secondaryText }]}>
              {preset.description}
            </Text>
            <Text style={[styles.presetPhases, { color: colors.secondaryText }]}>
              {preset.phases.map((p) => `${p.label} ${p.durationSeconds}s`).join(' → ')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Layout.spacing.sm,
  },
  presetCard: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetName: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  presetDesc: {
    fontSize: Layout.fontSize.caption,
    marginTop: 4,
  },
  presetPhases: {
    fontSize: Layout.fontSize.caption,
    marginTop: 4,
    fontFamily: 'SpaceMono',
  },
});
