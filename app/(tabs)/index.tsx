import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { HomeToolEntry } from '@/src/types';
import { useTools } from '@/src/hooks/useTools';
import { HomeToolCard } from '@/src/components/home/HomeToolCard';

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function DateHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const dateText = useMemo(() => formatDate(new Date()), []);

  return (
    <View style={styles.dateHeader}>
      <Text style={[styles.dateText, { color: colors.secondaryText }]}>{dateText}</Text>
    </View>
  );
}

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
        <DateHeader />
        <View style={styles.emptyContainer}>
          <Ionicons name="apps-outline" size={64} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Welcome to Foci
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Get started by configuring tools in the Toolbox tab
          </Text>
        </View>
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
        ListHeaderComponent={<DateHeader />}
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
    paddingBottom: 16,
  },
  dateHeader: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  dateText: {
    fontSize: Layout.fontSize.title,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: Layout.fontSize.body,
    marginTop: Layout.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
