import React from 'react';
import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Goal } from '@/src/types';

interface GoalCardProps {
  goal: Goal;
  onPress: (id: string) => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={() => onPress(goal.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.name, { color: colors.text }]}>{goal.name}</Text>
      {goal.outcome ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>
            Outcome
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {goal.outcome}
          </Text>
        </View>
      ) : null}
      {goal.why ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>
            Why
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {goal.why}
          </Text>
        </View>
      ) : null}
      {goal.consequences ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>
            Consequences
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {goal.consequences}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  name: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  field: {
    marginTop: Layout.spacing.xs,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Layout.fontSize.body,
    marginTop: 2,
  },
});
