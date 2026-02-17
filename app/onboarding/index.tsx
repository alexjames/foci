import React from 'react';
import { StyleSheet, Pressable, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useSettings } from '@/src/hooks/useSettings';

export default function OnboardingWelcome() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { completeOnboarding } = useSettings();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.tint }]}>Foci</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Focus on what matters
          </Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Build your personal toolkit for intentional living. Add tools like
            goal tracking, memento mori, affirmations, and breathing exercises
            to your home screen.
          </Text>
        </View>
        <View style={styles.footer}>
          <Pressable
            onPress={completeOnboarding}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Layout.spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '300',
    marginBottom: Layout.spacing.lg,
  },
  description: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
