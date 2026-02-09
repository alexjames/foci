import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

export function EmptyState({
  icon = 'flag-outline',
  title,
  message,
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={colors.secondaryText}
        style={styles.icon}
      />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.secondaryText }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl,
    backgroundColor: 'transparent',
  },
  icon: {
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
