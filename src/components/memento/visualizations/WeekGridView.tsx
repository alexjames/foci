import React, { useMemo } from 'react';
import { StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface WeekGridViewProps {
  lifeData: LifeData;
}

const WEEKS_PER_ROW = 52;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Layout.spacing.md * 2;
const LABEL_WIDTH = 20;
const DOT_SIZE = 4;
const DOT_GAP = 1;

const WeekRow = React.memo(function WeekRow({
  rowIndex,
  weeksLived,
  totalYears,
  livedColor,
  currentColor,
  emptyColor,
}: {
  rowIndex: number;
  weeksLived: number;
  totalYears: number;
  livedColor: string;
  currentColor: string;
  emptyColor: string;
}) {
  const startWeek = rowIndex * WEEKS_PER_ROW;
  const weeks = rowIndex < totalYears ? WEEKS_PER_ROW : 0;

  return (
    <View style={styles.row}>
      {Array.from({ length: weeks }, (_, i) => {
        const weekIndex = startWeek + i;
        const isLived = weekIndex < weeksLived;
        const isCurrent = weekIndex === weeksLived;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isCurrent
                  ? currentColor
                  : isLived
                    ? livedColor
                    : emptyColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

export function WeekGridView({ lifeData }: WeekGridViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const rows = useMemo(() => lifeData.totalYears, [lifeData.totalYears]);
  const livedColor = colors.tint + '99';
  const emptyColor = colorScheme === 'dark' ? '#2C2C2E' : '#E5E7EB';

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Each dot = 1 week ({lifeData.totalWeeks.toLocaleString()} total)
      </Text>
      <View style={styles.grid}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.rowContainer}>
            {i % 10 === 0 ? (
              <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>{i}</Text>
            ) : (
              <View style={styles.rowLabelSpacer} />
            )}
            <WeekRow
              rowIndex={i}
              weeksLived={lifeData.weeksLived}
              totalYears={lifeData.totalYears}
              livedColor={livedColor}
              currentColor={colors.tint}
              emptyColor={emptyColor}
            />
          </View>
        ))}
      </View>
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
  grid: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DOT_GAP,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: DOT_GAP,
    backgroundColor: 'transparent',
  },
  rowLabel: {
    width: LABEL_WIDTH,
    fontSize: 8,
    textAlign: 'right',
    marginRight: 2,
  },
  rowLabelSpacer: {
    width: LABEL_WIDTH + 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 1,
  },
});
