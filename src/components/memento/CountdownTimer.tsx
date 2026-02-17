import React, { useState, useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { getTimeRemaining } from '@/src/utils/lifeData';

interface CountdownTimerProps {
  birthday: Date;
  lifeExpectancy: number;
}

export function CountdownTimer({ birthday, lifeExpectancy }: CountdownTimerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const deathDate = new Date(birthday);
  deathDate.setFullYear(deathDate.getFullYear() + lifeExpectancy);

  const [remaining, setRemaining] = useState(() => getTimeRemaining(deathDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(deathDate));
    }, 50);
    return () => clearInterval(interval);
  }, [deathDate.getTime()]);

  const units = [
    { value: String(remaining.days), label: 'days' },
    { value: String(remaining.hours).padStart(2, '0'), label: 'hrs' },
    { value: String(remaining.minutes).padStart(2, '0'), label: 'min' },
    { value: String(remaining.seconds).padStart(2, '0'), label: 'sec' },
    { value: String(Math.floor(remaining.milliseconds / 10)).padStart(2, '0'), label: 'ms' },
  ];

  const allZero = remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0 && remaining.milliseconds === 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
      {allZero ? (
        <Text style={[styles.bonusText, { color: colors.tint }]}>Every day is a bonus</Text>
      ) : (
        <View style={styles.row}>
          {units.map((unit) => (
            <View key={unit.label} style={styles.unit}>
              <Text style={[styles.value, { color: colors.text }]}>
                {unit.value}
              </Text>
              <Text style={[styles.label, { color: colors.secondaryText }]}>
                {unit.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    padding: Layout.spacing.md,
    marginHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  unit: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  value: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  bonusText: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});
