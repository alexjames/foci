import React, { useState } from 'react';
import {
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  useColorScheme,
  ScrollView,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from '@/components/Themed';
import { TimePicker } from '@/src/components/TimePicker';
import { useSettings } from '@/src/hooks/useSettings';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { STORAGE_KEYS } from '@/src/types';
import {
  scheduleDailyNotification,
  cancelAllNotifications,
  requestNotificationPermissions,
} from '@/src/utils/notifications';

export default function SettingsScreen() {
  const { settings, updateSettings, resetApp } = useSettings();
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

  const handleExport = async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const pairs = await AsyncStorage.multiGet(keys);
      const data: Record<string, unknown> = {};
      for (const [key, value] of pairs) {
        if (value) data[key] = JSON.parse(value);
      }
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: 'Foci Data Export' });
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to export data.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This will clear all your data and restart the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await resetApp();
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
        DATA
      </Text>
      <View
        style={[
          styles.section,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <Pressable
          onPress={handleExport}
          style={[styles.row, { backgroundColor: 'transparent' }]}
        >
          <Text style={[styles.rowLabel, { color: colors.tint }]}>
            Export Data
          </Text>
        </Pressable>
        <View
          style={[styles.separator, { backgroundColor: colors.separator }]}
        />
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
            2.0.0
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
});
