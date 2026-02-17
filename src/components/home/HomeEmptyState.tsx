import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

export function HomeEmptyState() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Ionicons name="apps-outline" size={64} color={colors.secondaryText} />
      <Text style={[styles.title, { color: colors.text }]}>Welcome to Foci</Text>
      <Text style={[styles.message, { color: colors.secondaryText }]}>
        Get started by configuring tools in the Toolbox tab
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xl,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  message: {
    fontSize: Layout.fontSize.body,
    marginTop: Layout.spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
