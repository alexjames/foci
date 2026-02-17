import React from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { TOOL_REGISTRY } from '@/src/constants/tools';
import { useTools } from '@/src/hooks/useTools';
import { ToolCard } from '@/src/components/toolbox/ToolCard';
import { ToolDefinition } from '@/src/types';

export default function ToolboxScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { isToolOnHome } = useTools();

  const renderItem = ({ item }: { item: ToolDefinition }) => (
    <ToolCard
      tool={item}
      isAdded={isToolOnHome(item.id)}
      onPress={() => router.push(`/tool-config/${item.id}` as any)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={TOOL_REGISTRY}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
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
    padding: Layout.spacing.sm,
  },
});
