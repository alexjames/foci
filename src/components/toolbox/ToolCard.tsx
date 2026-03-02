import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ToolDefinition } from '@/src/types';

interface ToolCardProps {
  tool: ToolDefinition;
  onPress: () => void;
  onLongPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ToolCard({ tool, onPress, onLongPress, isFirst, isLast }: ToolCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const rowStyle = [
    styles.row,
    { backgroundColor: colors.cardBackground },
    isFirst && styles.rowFirst,
    isLast && styles.rowLast,
    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  ];

  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.tint + '18' }]}>
        <Ionicons name={tool.icon as any} size={20} color={colors.tint} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
        <Text style={[styles.tagline, { color: colors.secondaryText }]} numberOfLines={1}>
          {tool.tagline}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} style={{ opacity: 0.4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  rowFirst: {
    borderTopLeftRadius: Layout.borderRadius.md,
    borderTopRightRadius: Layout.borderRadius.md,
  },
  rowLast: {
    borderBottomLeftRadius: Layout.borderRadius.md,
    borderBottomRightRadius: Layout.borderRadius.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  tagline: {
    fontSize: Layout.fontSize.caption,
  },
});
