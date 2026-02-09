import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface ProgressBarViewProps {
  lifeData: LifeData;
}

export function ProgressBarView({ lifeData }: ProgressBarViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillWidth, {
      toValue: lifeData.percentLived,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [lifeData.percentLived, fillWidth]);

  return (
    <View style={styles.container}>
      <Text style={[styles.percent, { color: colors.text }]}>
        {lifeData.percentLived.toFixed(1)}%
      </Text>
      <Text style={[styles.percentLabel, { color: colors.secondaryText }]}>
        of your life has passed
      </Text>

      <View style={[styles.barContainer, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: colors.tint,
              width: fillWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: colors.secondaryText }]}>Born</Text>
        <Text style={[styles.barLabel, { color: colors.secondaryText }]}>
          {lifeData.lifeExpectancy} years
        </Text>
      </View>

      <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
        <StatRow label="Days lived" value={lifeData.daysLived.toLocaleString()} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <StatRow label="Days remaining" value={lifeData.daysRemaining.toLocaleString()} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <StatRow label="Weeks lived" value={lifeData.weeksLived.toLocaleString()} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <StatRow label="Weeks remaining" value={lifeData.weeksRemaining.toLocaleString()} colors={colors} />
      </View>
    </View>
  );
}

function StatRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  percent: {
    fontSize: Layout.fontSize.hero,
    fontWeight: '700',
    textAlign: 'center',
  },
  percentLabel: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  barContainer: {
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.xs,
    marginBottom: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  barLabel: {
    fontSize: Layout.fontSize.caption,
  },
  statsCard: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    padding: Layout.spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
    backgroundColor: 'transparent',
  },
  statLabel: {
    fontSize: Layout.fontSize.body,
  },
  statValue: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 1,
  },
});
