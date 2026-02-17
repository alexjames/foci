import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface SeasonsViewProps {
  lifeData: LifeData;
}

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface SeasonConfig {
  key: Season;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  percentRange: [number, number];
  color: { light: string; dark: string };
}

const SEASONS: SeasonConfig[] = [
  {
    key: 'spring',
    label: 'Spring',
    icon: 'leaf',
    percentRange: [0, 25],
    color: { light: '#34C759', dark: '#30D158' },
  },
  {
    key: 'summer',
    label: 'Summer',
    icon: 'sunny',
    percentRange: [25, 50],
    color: { light: '#FF9500', dark: '#FF9F0A' },
  },
  {
    key: 'autumn',
    label: 'Autumn',
    icon: 'cloudy',
    percentRange: [50, 75],
    color: { light: '#FF6B35', dark: '#FF6F61' },
  },
  {
    key: 'winter',
    label: 'Winter',
    icon: 'snow',
    percentRange: [75, 100],
    color: { light: '#8E8E93', dark: '#98989D' },
  },
];

export function SeasonsView({ lifeData }: SeasonsViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const percent = lifeData.percentLived;

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        You are in the {lifeData.currentSeason} of your life
      </Text>

      <View style={styles.grid}>
        {SEASONS.map((season) => {
          const isCurrent = season.key === lifeData.currentSeason;
          const isPast = percent >= season.percentRange[1];
          const isFuture = percent < season.percentRange[0];
          const seasonColor = season.color[colorScheme];
          const ageStart = Math.ceil(lifeData.lifeExpectancy * season.percentRange[0] / 100);
          const ageEnd = Math.ceil(lifeData.lifeExpectancy * season.percentRange[1] / 100);
          const ageRange = `${ageStart}–${ageEnd} years`;

          let seasonProgress = 0;
          if (isPast) {
            seasonProgress = 100;
          } else if (isCurrent) {
            const rangeSize = season.percentRange[1] - season.percentRange[0];
            seasonProgress = ((percent - season.percentRange[0]) / rangeSize) * 100;
          }

          return (
            <View
              key={season.key}
              style={[
                styles.card,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: isCurrent ? seasonColor : colors.cardBorder,
                  borderWidth: isCurrent ? 2 : 1,
                  opacity: isFuture ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name={season.icon}
                size={32}
                color={isFuture ? colors.secondaryText : seasonColor}
              />
              <Text style={[styles.seasonLabel, { color: colors.text }]}>
                {season.label}
              </Text>
              <Text style={[styles.ageRange, { color: colors.secondaryText }]}>
                {ageRange}
              </Text>

              {(isCurrent || isPast) && (
                <View style={[styles.progressBarOuter, { backgroundColor: colors.cardBorder }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${seasonProgress}%`,
                        backgroundColor: seasonColor,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })}
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
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    backgroundColor: 'transparent',
  },
  card: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  seasonLabel: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
  ageRange: {
    fontSize: Layout.fontSize.caption,
  },
  progressBarOuter: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: Layout.spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
