import React, { useState } from 'react';
import {
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  useColorScheme,
  ScrollView,
  Share,
  View,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TimePicker } from '@/src/components/TimePicker';
import { useSettings } from '@/src/hooks/useSettings';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { STORAGE_KEYS } from '@/src/types';
import { BREATHING_PRESETS } from '@/src/constants/tools';
import {
  MementoMoriConfig,
  BreathingConfig,
  FocusTimerConfig,
  FocusTimerAlarm,
} from '@/src/types';
import {
  scheduleDailyNotification,
  cancelAllNotifications,
  requestNotificationPermissions,
} from '@/src/utils/notifications';

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
      {label}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
      {children}
    </View>
  );
}

function Separator() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return <View style={[styles.separator, { backgroundColor: colors.separator }]} />;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function StepperRow({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Row>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onDecrement}>
          <Ionicons name="remove-circle-outline" size={28} color={colors.tint} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
        <Pressable onPress={onIncrement}>
          <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
        </Pressable>
      </View>
    </Row>
  );
}

// ─── Tool config sections ────────────────────────────────────────────────────

function MementoMoriSection() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<MementoMoriConfig>('memento-mori');
  const lifeExpectancy = config?.lifeExpectancy ?? 80;

  const update = (delta: number) =>
    setConfig({
      ...(config ?? { toolId: 'memento-mori', notificationEnabled: false }),
      lifeExpectancy: Math.min(120, Math.max(28, lifeExpectancy + delta)),
    });

  return (
    <>
      <SectionHeader label="MEMENTO MORI" />
      <Card>
        <StepperRow
          label="Life Expectancy (years)"
          value={lifeExpectancy}
          onDecrement={() => update(-1)}
          onIncrement={() => update(1)}
        />
        <Separator />
        <Row>
          <Text style={[styles.rowHint, { color: colors.secondaryText }]}>
            Birthday is set the first time you open the tool.
          </Text>
        </Row>
      </Card>
    </>
  );
}

const ALARM_OPTIONS: { value: FocusTimerAlarm; label: string }[] = [
  { value: 'both', label: 'Sound & Vibration' },
  { value: 'sound', label: 'Sound Only' },
  { value: 'vibration', label: 'Vibration Only' },
];

function FocusTimerSection() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<FocusTimerConfig>('focus-timer');
  const currentConfig: FocusTimerConfig = config ?? {
    toolId: 'focus-timer',
    lastDurationSeconds: 25 * 60,
    breakDurationSeconds: 5 * 60,
    alarmType: 'both',
    notificationEnabled: false,
  };

  const updateBreak = (delta: number) =>
    setConfig({
      ...currentConfig,
      breakDurationSeconds: Math.min(30 * 60, Math.max(60, currentConfig.breakDurationSeconds + delta)),
    });

  return (
    <>
      <SectionHeader label="FOCUS TIMER" />
      <Card>
        <StepperRow
          label="Break Duration (min)"
          value={Math.round(currentConfig.breakDurationSeconds / 60)}
          onDecrement={() => updateBreak(-60)}
          onIncrement={() => updateBreak(60)}
        />
        <Separator />
        {ALARM_OPTIONS.map((option, i) => (
          <React.Fragment key={option.value}>
            <Pressable
              style={styles.row}
              onPress={() => setConfig({ ...currentConfig, alarmType: option.value })}
            >
              <Text style={[styles.rowLabel, { color: colors.text }]}>{option.label}</Text>
              {currentConfig.alarmType === option.value && (
                <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
              )}
            </Pressable>
            {i < ALARM_OPTIONS.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </Card>
    </>
  );
}

function BreathingSection() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<BreathingConfig>('breathing');
  const currentConfig: BreathingConfig = config ?? {
    toolId: 'breathing',
    selectedPresetId: 'box',
    durationSeconds: 120,
    notificationEnabled: false,
  };

  const updateDuration = (delta: number) =>
    setConfig({
      ...currentConfig,
      durationSeconds: Math.min(600, Math.max(30, currentConfig.durationSeconds + delta)),
    });

  return (
    <>
      <SectionHeader label="BREATHING EXERCISE" />
      <Card>
        {BREATHING_PRESETS.map((preset, i) => (
          <React.Fragment key={preset.id}>
            <Pressable
              style={styles.row}
              onPress={() => setConfig({ ...currentConfig, selectedPresetId: preset.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{preset.name}</Text>
                <Text style={[styles.rowHint, { color: colors.secondaryText }]}>{preset.description}</Text>
              </View>
              {currentConfig.selectedPresetId === preset.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
              )}
            </Pressable>
            {i < BREATHING_PRESETS.length - 1 && <Separator />}
          </React.Fragment>
        ))}
        <Separator />
        <StepperRow
          label="Session Duration (sec)"
          value={currentConfig.durationSeconds}
          onDecrement={() => updateDuration(-30)}
          onIncrement={() => updateDuration(30)}
        />
      </Card>
    </>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { settings, updateSettings, resetApp } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permissions Required', 'Please enable notifications in your device settings.');
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
    } catch {
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
      {/* ── Tool Settings ── */}
      <MementoMoriSection />
      <FocusTimerSection />
      <BreathingSection />

      {/* ── Notifications ── */}
      <SectionHeader label="NOTIFICATIONS" />
      <Card>
        <Row>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Daily Reminders</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: colors.tint }}
          />
        </Row>
        <Separator />
        <Pressable
          onPress={() => setShowTimePicker(!showTimePicker)}
          style={styles.row}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>Reminder Time</Text>
          <Text style={[styles.rowValue, { color: colors.tint }]}>
            {formatTime(settings.notificationTime.hour, settings.notificationTime.minute)}
          </Text>
        </Pressable>
        {showTimePicker && (
          <TimePicker
            hour={settings.notificationTime.hour}
            minute={settings.notificationTime.minute}
            onChange={handleTimeChange}
          />
        )}
      </Card>

      {/* ── Data ── */}
      <SectionHeader label="DATA" />
      <Card>
        <Pressable onPress={handleExport} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.tint }]}>Export Data</Text>
        </Pressable>
        <Separator />
        <Pressable onPress={handleReset} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.destructive }]}>Reset App</Text>
        </Pressable>
      </Card>

      {/* ── About ── */}
      <SectionHeader label="ABOUT" />
      <Card>
        <Row>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: colors.secondaryText }]}>2.0.0</Text>
        </Row>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
    marginTop: Layout.spacing.lg,
    marginLeft: Layout.spacing.sm,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginLeft: Layout.spacing.md,
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
  rowHint: {
    fontSize: Layout.fontSize.caption,
    flex: 1,
    lineHeight: 18,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  stepperValue: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
});
