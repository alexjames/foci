import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface SunsetsViewProps {
  lifeData: LifeData;
}

const GRADIENT_COLORS_LIGHT = ['#87CEEB', '#F0C27F', '#FF8C42', '#FF6B6B', '#C06C84'];
const GRADIENT_COLORS_DARK = ['#2C3E50', '#E67E22', '#E74C3C', '#8E44AD', '#2C3E50'];

export function SunsetsView({ lifeData }: SunsetsViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const gradientColors = colorScheme === 'dark' ? GRADIENT_COLORS_DARK : GRADIENT_COLORS_LIGHT;

  const sunsetsPerYear = 365;
  const remainingYears = Math.ceil(lifeData.sunsetsRemaining / sunsetsPerYear);

  return (
    <View style={styles.container}>
      {/* Sunset gradient */}
      <View style={styles.sunsetBox}>
        {gradientColors.map((color, i) => (
          <View key={i} style={[styles.gradientStripe, { backgroundColor: color }]} />
        ))}
        <View style={styles.sunsetOverlay}>
          <Ionicons name="sunny" size={48} color="#FFD700" />
          <Text style={styles.sunsetNumber}>
            {lifeData.sunsetsRemaining.toLocaleString()}
          </Text>
          <Text style={styles.sunsetLabel}>sunsets remaining</Text>
        </View>
      </View>

      <Text style={[styles.quote, { color: colors.secondaryText }]}>
        How many will you truly watch?
      </Text>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Sunsets witnessed</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {lifeData.sunsetsUsed.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Sunsets remaining</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {lifeData.sunsetsRemaining.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Years of sunsets left</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ~{remainingYears}
          </Text>
        </View>
      </View>

      {/* Next 52 weeks of sunsets */}
      <Text style={[styles.gridTitle, { color: colors.secondaryText }]}>
        Your next year of sunsets
      </Text>
      <View style={styles.miniGrid}>
        {Array.from({ length: Math.min(365, lifeData.sunsetsRemaining) }, (_, i) => (
          <View
            key={i}
            style={[
              styles.miniDot,
              {
                backgroundColor: i < 7
                  ? '#FFD700'
                  : i < 30
                    ? '#FF8C42'
                    : colors.cardBorder,
              },
            ]}
          />
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
  sunsetBox: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    height: 180,
    marginBottom: Layout.spacing.md,
  },
  gradientStripe: {
    flex: 1,
  },
  sunsetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunsetNumber: {
    fontSize: Layout.fontSize.hero,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: Layout.spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sunsetLabel: {
    fontSize: Layout.fontSize.body,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  quote: {
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  statsCard: {
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
  gridTitle: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
