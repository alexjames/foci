import React from 'react';
import { StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface MonthDotsViewProps {
  lifeData: LifeData;
}

const MONTHS_PER_ROW = 12;
const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Layout.spacing.md * 2;
const LABEL_WIDTH = 24;
const GAP = 3;
const DOT_SIZE = (SCREEN_WIDTH - GRID_PADDING - LABEL_WIDTH - GAP * (MONTHS_PER_ROW - 1)) / MONTHS_PER_ROW;
const CLAMPED_DOT = Math.min(DOT_SIZE, 20);

export function MonthDotsView({ lifeData }: MonthDotsViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const rows = lifeData.totalYears;

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Each dot = 1 month ({lifeData.totalMonths.toLocaleString()} total)
      </Text>

      {/* Month labels header */}
      <View style={styles.headerRow}>
        <View style={{ width: LABEL_WIDTH + 2 }} />
        {MONTH_LABELS.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.monthLabel,
              { color: colors.secondaryText, width: CLAMPED_DOT },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {rowIndex % 10 === 0 ? (
            <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>
              {rowIndex}
            </Text>
          ) : (
            <View style={{ width: LABEL_WIDTH + 2 }} />
          )}
          {Array.from({ length: MONTHS_PER_ROW }, (_, colIndex) => {
            const monthIndex = rowIndex * MONTHS_PER_ROW + colIndex;
            const isLived = monthIndex < lifeData.monthsLived;
            const isCurrent = monthIndex === lifeData.monthsLived;

            return (
              <View
                key={colIndex}
                style={[
                  styles.dot,
                  {
                    width: CLAMPED_DOT,
                    height: CLAMPED_DOT,
                    borderRadius: CLAMPED_DOT / 2,
                    backgroundColor: isCurrent
                      ? colors.tint
                      : isLived
                        ? colors.tint + '80'
                        : colorScheme === 'dark'
                          ? '#2C2C2E'
                          : '#E5E7EB',
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
  headerRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
    backgroundColor: 'transparent',
  },
  monthLabel: {
    fontSize: 8,
    textAlign: 'center',
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
  dot: {},
});
