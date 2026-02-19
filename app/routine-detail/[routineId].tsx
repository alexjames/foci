import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RoutinesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { RoutineCardList } from '@/src/components/routine/RoutineCardList';
import { RoutinePlayView } from '@/src/components/routine/RoutinePlayView';

export default function RoutineDetailScreen() {
  const { routineId, play } = useLocalSearchParams<{ routineId: string; play?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config } = useToolConfig<RoutinesConfig>('routines');
  const [isPlaying, setIsPlaying] = useState(play === 'true');

  const routine = config?.routines.find((r) => r.id === routineId);

  if (isPlaying) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <RoutinePlayView routineId={routineId} onComplete={() => setIsPlaying(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {routine?.title ?? 'Routine'}
        </Text>
        <Pressable onPress={() => router.push(`/edit-routine/${routineId}` as any)} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={colors.tint} />
        </Pressable>
      </View>
      <RoutineCardList routineId={routineId} onPlay={() => setIsPlaying(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Layout.spacing.sm,
  },
});
