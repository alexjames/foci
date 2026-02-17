import React from 'react';
import { StyleSheet, ScrollView, View, Text, useColorScheme } from 'react-native';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Affirmation } from '@/src/types';

interface AffirmationCarouselProps {
  affirmations: Affirmation[];
}

export function AffirmationCarousel({ affirmations }: AffirmationCarouselProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (affirmations.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {affirmations.map((item) => (
        <View
          key={item.id}
          style={[styles.card, { backgroundColor: colors.tint + '15' }]}
        >
          <Text style={[styles.text, { color: colors.text }]}>{item.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  card: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    minWidth: 200,
    maxWidth: 280,
  },
  text: {
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
