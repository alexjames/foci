import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { TOOL_REGISTRY } from '@/src/constants/tools';
import { useTools } from '@/src/hooks/useTools';
import { ToolCard } from '@/src/components/toolbox/ToolCard';

export default function ToolboxScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { isToolOnHome } = useTools();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.group}>
          {TOOL_REGISTRY.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isAdded={isToolOnHome(tool.id)}
              onPress={() => router.push(`/tool/${tool.id}` as any)}
              isFirst={index === 0}
              isLast={index === TOOL_REGISTRY.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Layout.spacing.md,
    paddingBottom: Layout.spacing.xxl,
  },
  group: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
});
