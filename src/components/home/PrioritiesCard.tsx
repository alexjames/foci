import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { PrioritiesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';

export function PrioritiesCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config } = useToolConfig<PrioritiesConfig>('priorities');

  const priorities = config?.priorities ?? [];
  if (priorities.length === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/tool/priorities' as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="flag-outline" size={16} color={colors.tint} />
        <Text style={[styles.title, { color: colors.tint }]}>Priorities</Text>
      </View>
      <View style={styles.list}>
        {priorities.map((priority, index) => (
          <View key={priority.id} style={styles.row}>
            <Text style={[styles.rank, { color: colors.tint }]}>{index + 1}</Text>
            <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
              {priority.text}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.sm,
  },
  title: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    gap: Layout.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.md,
  },
  rank: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    lineHeight: 24,
    width: 20,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
    paddingTop: 1,
  },
});
