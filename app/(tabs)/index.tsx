import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { HomeToolEntry, ToolId } from '@/src/types';
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

function RemoveAction() {
  return (
    <View style={styles.swipeAction}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Remove</Text>
      </View>
    </View>
  );
}

function SwipeableToolCard({
  item,
  drag,
  isActive,
  showHandle,
  onRemove,
  onPress,
}: {
  item: HomeToolEntry;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
  onRemove: (toolId: ToolId) => void;
  onPress: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        swipeableRef.current?.close();
        Alert.alert(
          'Remove Tool',
          'Remove this tool from your home screen?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
            { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.toolId) },
          ]
        );
      }
    },
    [item.toolId, onRemove]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => <RemoveAction />}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        onLongPress={drag}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={isActive}
      >
        <HomeToolCard toolId={item.toolId} drag={drag} isActive={isActive} showHandle={showHandle} />
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { homeTools, reorderHomeTools, removeToolFromHome } = useTools();
  const [isDragging, setIsDragging] = useState(false);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<HomeToolEntry>) => (
      <ScaleDecorator>
        <SwipeableToolCard
          item={item}
          drag={() => {
            setIsDragging(true);
            drag();
          }}
          isActive={isActive}
          showHandle={isDragging}
          onRemove={removeToolFromHome}
          onPress={() => router.push(`/tool/${item.toolId}` as any)}
        />
      </ScaleDecorator>
    ),
    [router, removeToolFromHome, isDragging]
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
        onDragEnd={({ data }) => { reorderHomeTools(data); setIsDragging(false); }}
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
  swipeableContainer: {
    marginBottom: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  swipeAction: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionContent: {
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
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
