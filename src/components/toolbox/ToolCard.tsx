import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ToolDefinition } from '@/src/types';

interface ToolCardProps {
  tool: ToolDefinition;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ToolCard({ tool, onPress, onLongPress }: ToolCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={tool.icon as any}
        size={32}
        color={colors.tint}
        style={styles.icon}
      />
      <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
      <Text style={[styles.tagline, { color: colors.secondaryText }]}>
        {tool.tagline}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: Layout.spacing.xs,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  icon: {
    marginBottom: Layout.spacing.sm,
  },
  name: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'center',
  },
});
