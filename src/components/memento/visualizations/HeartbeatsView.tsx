import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface HeartbeatsViewProps {
  lifeData: LifeData;
}

function formatBillions(n: number): string {
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(2) + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1) + 'M';
  }
  return n.toLocaleString();
}

export function HeartbeatsView({ lifeData }: HeartbeatsViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const heartColor = '#FF3B30';
  const percentUsed = (lifeData.heartbeatsUsed / lifeData.totalHeartbeats) * 100;

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Ionicons name="heart" size={80} color={heartColor} />
      </Animated.View>

      <Text style={[styles.mainStat, { color: colors.text }]}>
        {formatBillions(lifeData.heartbeatsRemaining)}
      </Text>
      <Text style={[styles.mainLabel, { color: colors.secondaryText }]}>
        heartbeats remaining
      </Text>

      <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total heartbeats</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatBillions(lifeData.totalHeartbeats)}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Beats used</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatBillions(lifeData.heartbeatsUsed)}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Used</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {percentUsed.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Pulse line visualization */}
      <View style={styles.pulseContainer}>
        {Array.from({ length: 30 }, (_, i) => {
          const baseHeight = 4;
          const isPeak = i === 8 || i === 12 || i === 22 || i === 26;
          const isTrough = i === 10 || i === 24;
          const height = isPeak ? 28 : isTrough ? 20 : baseHeight;

          return (
            <View
              key={i}
              style={[
                styles.pulseLine,
                {
                  height,
                  backgroundColor: heartColor + (i < 15 ? 'FF' : '60'),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  mainStat: {
    fontSize: Layout.fontSize.hero,
    fontWeight: '700',
    marginTop: Layout.spacing.lg,
  },
  mainLabel: {
    fontSize: Layout.fontSize.body,
    marginBottom: Layout.spacing.lg,
  },
  statsCard: {
    width: '100%',
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
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
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 32,
    backgroundColor: 'transparent',
  },
  pulseLine: {
    width: 3,
    borderRadius: 1.5,
  },
});
