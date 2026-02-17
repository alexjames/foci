import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Colors } from '@/src/constants/Colors';
import { HomeToolEntry } from '@/src/types';
import { useTools } from '@/src/hooks/useTools';
import { HomeToolCard } from '@/src/components/home/HomeToolCard';
import { HomeEmptyState } from '@/src/components/home/HomeEmptyState';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { homeTools, reorderHomeTools } = useTools();

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<HomeToolEntry>) => (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          onPress={() => router.push(`/tool/${item.toolId}` as any)}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <HomeToolCard toolId={item.toolId} drag={drag} isActive={isActive} />
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [router]
  );

  if (homeTools.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HomeEmptyState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFlatList
        data={homeTools}
        onDragEnd={({ data }) => reorderHomeTools(data)}
        keyExtractor={(item) => item.toolId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 16,
  },
});
