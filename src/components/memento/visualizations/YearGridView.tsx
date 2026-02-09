import React, { useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, Animated, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface YearGridViewProps {
  lifeData: LifeData;
}

const COLUMNS = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Layout.spacing.md * 2;
const LABEL_WIDTH = 24;
const GAP = 4;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING - LABEL_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

function PulsingCell({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.cell,
        { backgroundColor: color, opacity, width: CELL_SIZE, height: CELL_SIZE },
      ]}
    />
  );
}

export function YearGridView({ lifeData }: YearGridViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const rows = Math.ceil(lifeData.totalYears / COLUMNS);

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Each square = 1 year
      </Text>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>
            {rowIndex * COLUMNS}
          </Text>
          {Array.from({ length: COLUMNS }, (_, colIndex) => {
            const yearIndex = rowIndex * COLUMNS + colIndex;
            if (yearIndex >= lifeData.totalYears) return <View key={colIndex} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
            const isLived = yearIndex < lifeData.yearsLived;
            const isCurrent = yearIndex === lifeData.yearsLived;

            if (isCurrent) {
              return <PulsingCell key={colIndex} color={colors.tint} />;
            }

            return (
              <View
                key={colIndex}
                style={[
                  styles.cell,
                  {
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: isLived ? colors.tint : 'transparent',
                    borderColor: isLived ? colors.tint : colors.cardBorder,
                    borderWidth: isLived ? 0 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    marginBottom: GAP,
    backgroundColor: 'transparent',
  },
  rowLabel: {
    width: LABEL_WIDTH,
    fontSize: 10,
    textAlign: 'right',
    marginRight: 2,
  },
  cell: {
    borderRadius: 3,
  },
});
