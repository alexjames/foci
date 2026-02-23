import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  useColorScheme,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ToolDefinition, HomeToolEntry } from '@/src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Layout.spacing.sm;   // 8
const CARD_MARGIN = Layout.spacing.xs;    // 4
const NUM_COLS = 2;
const CARD_WIDTH =
  (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_MARGIN * NUM_COLS * 2) / NUM_COLS;
const CARD_HEIGHT = 148; // 140 minHeight + 4 top margin + 4 bottom margin

// Shared state threaded down to each card via props (avoids re-renders on shared value changes)
interface DragState {
  activeIndex: Animated.SharedValue<number>;
  hoveredIndex: Animated.SharedValue<number>;
  ghostX: Animated.SharedValue<number>;
  ghostY: Animated.SharedValue<number>;
  ghostVisible: Animated.SharedValue<number>;
}

function indexFromPosition(x: number, y: number, total: number) {
  'worklet';
  const col = x < SCREEN_WIDTH / 2 ? 0 : 1;
  const row = Math.max(0, Math.floor(y / CARD_HEIGHT));
  return Math.min(Math.max(row * NUM_COLS + col, 0), total - 1);
}

// ─── Ghost card (floating copy that follows the finger) ───────────────────────

interface GhostProps {
  tool: ToolDefinition | null;
  drag: DragState;
}

function GhostCard({ tool, drag }: GhostProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT - CARD_MARGIN * 2,
    left: drag.ghostX.value,
    top: drag.ghostY.value,
    opacity: drag.ghostVisible.value,
    zIndex: 999,
    pointerEvents: 'none' as const,
    borderRadius: Layout.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
  }));

  if (!tool) return null;

  return (
    <Animated.View style={[style, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.ghostInner}>
        <Ionicons name={tool.icon as any} size={32} color={colors.tint} style={styles.icon} />
        <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
        <Text style={[styles.tagline, { color: colors.secondaryText }]}>{tool.tagline}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Individual draggable card ────────────────────────────────────────────────

interface CardProps {
  tool: ToolDefinition;
  index: number;
  totalTools: number;
  headerHeight: number;
  drag: DragState;
  onSwap: (from: number, to: number) => void;
  onPress: () => void;
  setGhostTool: (t: ToolDefinition) => void;
}

function DraggableCard({
  tool,
  index,
  totalTools,
  headerHeight,
  drag,
  onSwap,
  onPress,
  setGhostTool,
}: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const col = index % NUM_COLS;
  const row = Math.floor(index / NUM_COLS);
  const originX = GRID_PADDING + col * (CARD_WIDTH + CARD_MARGIN * 2) + CARD_MARGIN;
  const originY = row * CARD_HEIGHT + CARD_MARGIN;

  const notifyGhostTool = useCallback(() => setGhostTool(tool), [setGhostTool, tool]);
  const triggerHaptic = useCallback(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    []
  );
  const doPress = useCallback(() => {
    if (drag.activeIndex.value === -1) onPress();
  }, [drag.activeIndex, onPress]);
  const doSwap = useCallback(
    (from: number, to: number) => onSwap(from, to),
    [onSwap]
  );

  const gesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart(() => {
      'worklet';
      drag.activeIndex.value = index;
      drag.hoveredIndex.value = index;
      drag.ghostX.value = originX;
      drag.ghostY.value = headerHeight + originY;
      drag.ghostVisible.value = withTiming(1, { duration: 120 });
      runOnJS(triggerHaptic)();
      runOnJS(notifyGhostTool)();
    })
    .onUpdate((e) => {
      'worklet';
      if (drag.activeIndex.value !== index) return;
      drag.ghostX.value = originX + e.translationX;
      drag.ghostY.value = headerHeight + originY + e.translationY;
      // Ghost center relative to grid top-left
      const gx = drag.ghostX.value - GRID_PADDING + CARD_WIDTH / 2;
      const gy = drag.ghostY.value - headerHeight + CARD_HEIGHT / 2;
      drag.hoveredIndex.value = indexFromPosition(gx, gy, totalTools);
    })
    .onEnd(() => {
      'worklet';
      drag.ghostVisible.value = withTiming(0, { duration: 100 });
      const from = drag.activeIndex.value;
      const to = drag.hoveredIndex.value;
      drag.activeIndex.value = -1;
      drag.hoveredIndex.value = -1;
      if (from >= 0 && to >= 0 && from !== to) {
        runOnJS(doSwap)(from, to);
      }
    })
    .onFinalize(() => {
      'worklet';
      drag.ghostVisible.value = withTiming(0, { duration: 100 });
      drag.activeIndex.value = -1;
      drag.hoveredIndex.value = -1;
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      runOnJS(doPress)();
    });

  const composed = Gesture.Exclusive(gesture, tap);

  const animStyle = useAnimatedStyle(() => {
    const isActive = drag.activeIndex.value === index;
    const isHovered =
      drag.hoveredIndex.value === index && drag.activeIndex.value !== index;
    return {
      opacity: isActive ? 0.2 : 1,
      transform: [
        {
          scale: withSpring(isHovered ? 1.05 : 1, {
            damping: 14,
            stiffness: 200,
          }),
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.card, { backgroundColor: colors.cardBackground }, animStyle]}
      >
        <Ionicons name={tool.icon as any} size={32} color={colors.tint} style={styles.icon} />
        <Text style={[styles.name, { color: colors.text }]}>{tool.name}</Text>
        <Text style={[styles.tagline, { color: colors.secondaryText }]}>{tool.tagline}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── ToolGrid ─────────────────────────────────────────────────────────────────

interface ToolGridProps {
  tools: ToolDefinition[];
  onReorder: (entries: HomeToolEntry[]) => void;
  onPress: (toolId: string) => void;
  headerHeight: number;
}

export function ToolGrid({ tools, onReorder, onPress, headerHeight }: ToolGridProps) {
  const activeIndex = useSharedValue(-1);
  const hoveredIndex = useSharedValue(-1);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostVisible = useSharedValue(0);
  const drag: DragState = { activeIndex, hoveredIndex, ghostX, ghostY, ghostVisible };

  const [ghostTool, setGhostTool] = useState<ToolDefinition | null>(null);

  const handleSwap = useCallback(
    (from: number, to: number) => {
      const next = [...tools];
      [next[from], next[to]] = [next[to], next[from]];
      onReorder(next.map((t, i) => ({ toolId: t.id, order: i })));
    },
    [tools, onReorder]
  );

  const rows: ToolDefinition[][] = [];
  for (let i = 0; i < tools.length; i += NUM_COLS) {
    rows.push(tools.slice(i, i + NUM_COLS));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((tool, colIdx) => {
            const idx = rowIdx * NUM_COLS + colIdx;
            return (
              <View key={tool.id} style={styles.cellWrapper}>
                <DraggableCard
                  tool={tool}
                  index={idx}
                  totalTools={tools.length}
                  headerHeight={headerHeight}
                  drag={drag}
                  onSwap={handleSwap}
                  onPress={() => onPress(tool.id)}
                  setGhostTool={setGhostTool}
                />
              </View>
            );
          })}
          {row.length < NUM_COLS && <View style={styles.cellWrapper} />}
        </View>
      ))}
      <GhostCard tool={ghostTool} drag={drag} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {},
  row: {
    flexDirection: 'row',
  },
  cellWrapper: {
    flex: 1,
    margin: CARD_MARGIN,
  },
  card: {
    flex: 1,
    minHeight: 140,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
  },
  icon: {
    marginBottom: Layout.spacing.sm,
  },
  name: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'center',
  },
  ghostInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
  },
});
