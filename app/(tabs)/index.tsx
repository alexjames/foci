import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useTools } from '@/src/hooks/useTools';
import { ToolGrid } from '@/src/components/home/ToolGrid';
import { BriefingCard } from '@/src/components/home/BriefingCard';

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { orderedTools, reorderHomeTools } = useTools();
  // Measure the full area above the grid so ghost card Y offset is correct
  const [aboveGridHeight, setAboveGridHeight] = useState(0);
  const dateText = useMemo(() => formatDate(new Date()), []);

  const handlePress = useCallback(
    (toolId: string) => router.push(`/tool/${toolId}` as any),
    [router]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
      >
        {/* Everything above the grid — measured together for ghost Y offset */}
        <View onLayout={(e) => setAboveGridHeight(e.nativeEvent.layout.height)}>
          <View style={styles.dateHeader}>
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>{dateText}</Text>
          </View>
          <BriefingCard />
        </View>

        <ToolGrid
          tools={orderedTools}
          onReorder={reorderHomeTools}
          onPress={handlePress}
          headerHeight={aboveGridHeight}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Layout.spacing.sm,
    paddingBottom: 24,
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
});
