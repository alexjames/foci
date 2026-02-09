import React, { useState } from 'react';
import { StyleSheet, Pressable, useColorScheme, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { TimePicker } from '@/src/components/TimePicker';
import { useGoals } from '@/src/hooks/useGoals';
import { useSettings } from '@/src/hooks/useSettings';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import {
  requestNotificationPermissions,
  scheduleDailyNotification,
} from '@/src/utils/notifications';

export default function OnboardingNotification() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goals: string }>();
  const { setGoals } = useGoals();
  const { updateSettings, completeOnboarding } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  const handleTimeChange = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
  };

  const handleStart = async () => {
    // Request notification permissions
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        'Notifications',
        'You can enable notifications later in Settings.',
        [{ text: 'OK' }]
      );
    }

    // Save goals
    const goalsData = params.goals ? JSON.parse(params.goals) : [];
    const now = new Date().toISOString();
    const goalsWithIds = goalsData.map(
      (
        g: { name: string; outcome: string; why: string; consequences: string },
        index: number
      ) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 9) + index,
        name: g.name.trim(),
        outcome: g.outcome?.trim() || undefined,
        why: g.why?.trim() || undefined,
        consequences: g.consequences?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        order: index,
      })
    );
    setGoals(goalsWithIds);

    // Save settings and schedule notification
    updateSettings({
      notificationTime: { hour, minute },
      notificationsEnabled: granted,
    });

    if (granted) {
      await scheduleDailyNotification(hour, minute);
    }

    // Complete onboarding
    completeOnboarding();
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            When should we remind you?
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Choose a time for your daily goal review.
          </Text>

          <View style={styles.pickerContainer}>
            <TimePicker
              hour={hour}
              minute={minute}
              onChange={handleTimeChange}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Start</Text>
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
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
    lineHeight: 22,
  },
  pickerContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
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
