import React, { useState } from 'react';
import {
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { TimePicker } from '@/src/components/TimePicker';
import { useSettings } from '@/src/hooks/useSettings';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import {
  scheduleDailyNotification,
  cancelAllNotifications,
  requestNotificationPermissions,
} from '@/src/utils/notifications';

export default function SettingsScreen() {
  const { settings, updateSettings, resetOnboarding } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in your device settings.'
        );
        return;
      }
      await scheduleDailyNotification(
        settings.notificationTime.hour,
        settings.notificationTime.minute
      );
    } else {
      await cancelAllNotifications();
    }
    updateSettings({ notificationsEnabled: value });
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    updateSettings({ notificationTime: { hour, minute } });
    if (settings.notificationsEnabled) {
      await scheduleDailyNotification(hour, minute);
    }
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This will clear all your goals and restart onboarding. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            resetOnboarding();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
        NOTIFICATIONS
      </Text>
      <View
        style={[
          styles.section,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.row, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Daily Reminders
          </Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: '#007AFF' }}
          />
        </View>
        <View
          style={[styles.separator, { backgroundColor: colors.separator }]}
        />
        <Pressable
          onPress={() => setShowTimePicker(!showTimePicker)}
          style={[styles.row, { backgroundColor: 'transparent' }]}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Reminder Time
          </Text>
          <Text style={[styles.rowValue, { color: colors.tint }]}>
            {formatTime(
              settings.notificationTime.hour,
              settings.notificationTime.minute
            )}
          </Text>
        </Pressable>
        {showTimePicker && (
          <TimePicker
            hour={settings.notificationTime.hour}
            minute={settings.notificationTime.minute}
            onChange={handleTimeChange}
          />
        )}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
        MEMENTO MORI
      </Text>
      <View
        style={[
          styles.section,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.row, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Life Expectancy
          </Text>
          <View style={styles.stepperContainer}>
            <Pressable
              onPress={() => {
                const current = settings.lifeExpectancy ?? 80;
                if (current > 1) updateSettings({ lifeExpectancy: current - 1 });
              }}
              style={({ pressed }) => [
                styles.stepperButton,
                { backgroundColor: colors.tint, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.stepperText}>-</Text>
            </Pressable>
            <Text style={[styles.stepperValue, { color: colors.text }]}>
              {settings.lifeExpectancy ?? 80}
            </Text>
            <Pressable
              onPress={() => {
                const current = settings.lifeExpectancy ?? 80;
                if (current < 150) updateSettings({ lifeExpectancy: current + 1 });
              }}
              style={({ pressed }) => [
                styles.stepperButton,
                { backgroundColor: colors.tint, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.stepperText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
        DATA
      </Text>
      <View
        style={[
          styles.section,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <Pressable
          onPress={handleReset}
          style={[styles.row, { backgroundColor: 'transparent' }]}
        >
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>
            Reset App
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
        ABOUT
      </Text>
      <View
        style={[
          styles.section,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.row, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Version
          </Text>
          <Text style={[styles.rowValue, { color: colors.secondaryText }]}>
            1.0.0
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Layout.spacing.md,
  },
  sectionHeader: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
    marginTop: Layout.spacing.lg,
    marginLeft: Layout.spacing.sm,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    minHeight: 44,
  },
  rowLabel: {
    fontSize: Layout.fontSize.body,
  },
  rowValue: {
    fontSize: Layout.fontSize.body,
  },
  separator: {
    height: 1,
    marginLeft: Layout.spacing.md,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    lineHeight: Layout.fontSize.title,
  },
  stepperValue: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'center',
  },
});
