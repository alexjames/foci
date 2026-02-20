import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  Platform,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { HabitTrackerConfig, Habit } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';
import {
  requestNotificationPermissions,
  scheduleHabitNotification,
  cancelHabitNotifications,
} from '@/src/utils/notifications';

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<HabitTrackerConfig>('streak-tracker');

  const habits = config?.habits ?? [];
  const existingHabit = useMemo(
    () => (id !== 'new' ? habits.find((h) => h.id === id) : null),
    [id, habits]
  );

  const [title, setTitle] = useState(existingHabit?.title ?? '');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(existingHabit?.color);

  // Notification state
  const [notifEnabled, setNotifEnabled] = useState(existingHabit?.notificationEnabled ?? false);
  const [notifTime, setNotifTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(existingHabit?.notificationTime?.hour ?? 9, existingHabit?.notificationTime?.minute ?? 0, 0, 0);
    return d;
  });
  // undefined = every day; array = specific days (0=Sun…6=Sat)
  const [notifDays, setNotifDays] = useState<number[] | undefined>(existingHabit?.notificationDays);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [specificDays, setSpecificDays] = useState(existingHabit?.notificationDays !== undefined);

  const toggleDay = (day: number) => {
    setNotifDays((prev) => {
      const current = prev ?? [];
      return current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    });
  };

  const defaultConfig: HabitTrackerConfig = {
    toolId: 'streak-tracker',
    habits: [],
    notificationEnabled: false,
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const currentConfig = config ?? defaultConfig;
    const currentHabits = currentConfig.habits ?? [];

    // Resolve notification settings
    let newNotifId: string | undefined = existingHabit?.notificationId;

    if (notifEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }
      // Cancel old notifications before rescheduling
      await cancelHabitNotifications(newNotifId);
      const days = specificDays ? (notifDays ?? []) : undefined;
      newNotifId = await scheduleHabitNotification(
        trimmed,
        notifTime.getHours(),
        notifTime.getMinutes(),
        days,
      );
    } else {
      // Notifications turned off — cancel any existing
      await cancelHabitNotifications(newNotifId);
      newNotifId = undefined;
    }

    if (existingHabit) {
      const updated: Habit = {
        ...existingHabit,
        title: trimmed,
        color: selectedColor,
        notificationEnabled: notifEnabled,
        notificationTime: notifEnabled ? { hour: notifTime.getHours(), minute: notifTime.getMinutes() } : undefined,
        notificationDays: notifEnabled && specificDays ? (notifDays ?? []) : undefined,
        notificationId: newNotifId,
      };
      setConfig({
        ...currentConfig,
        habits: currentHabits.map((h) => (h.id === existingHabit.id ? updated : h)),
      });
    } else {
      if (currentHabits.length >= 20) return;
      const newHabit: Habit = {
        id: `hb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        color: selectedColor,
        completions: [],
        createdAt: new Date().toISOString(),
        notificationEnabled: notifEnabled,
        notificationTime: notifEnabled ? { hour: notifTime.getHours(), minute: notifTime.getMinutes() } : undefined,
        notificationDays: notifEnabled && specificDays ? (notifDays ?? []) : undefined,
        notificationId: newNotifId,
      };
      setConfig({ ...currentConfig, habits: [...currentHabits, newHabit] });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingHabit || !config) return;
    Alert.alert('Delete Habit', `Delete "${existingHabit.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelHabitNotifications(existingHabit.notificationId);
          setConfig({ ...config, habits: config.habits.filter((h) => h.id !== existingHabit.id) });
          router.back();
        },
      },
    ]);
  };

  const formatTime = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {existingHabit ? 'Edit Habit' : 'New Habit'}
        </Text>
        <Pressable onPress={handleSave} disabled={!title.trim()}>
          <Text style={[styles.headerButton, { color: colors.tint, opacity: title.trim() ? 1 : 0.4 }]}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.cardBackground }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Habit name"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Color */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Color (optional)
        </Text>
        <View style={styles.colorRow}>
          <Pressable
            onPress={() => setSelectedColor(undefined)}
            style={[
              styles.colorChip,
              { backgroundColor: colors.cardBackground, borderColor: colors.separator },
              !selectedColor && { borderColor: colors.tint, borderWidth: 2 },
            ]}
          >
            <Ionicons name="ban-outline" size={16} color={colors.secondaryText} />
          </Pressable>
          {DEADLINE_COLORS.map((c) => {
            const chipColor = colorScheme === 'dark' ? c.dark : c.light;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedColor(c.id)}
                style={[
                  styles.colorChip,
                  { backgroundColor: chipColor },
                  selectedColor === c.id && { borderColor: colors.text, borderWidth: 2 },
                ]}
              />
            );
          })}
        </View>

        {/* Reminder */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Reminders
        </Text>
        <View style={[styles.notifCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.notifToggleRow}>
            <Text style={[styles.notifToggleLabel, { color: colors.text }]}>Enable reminder</Text>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ true: colors.tint }}
            />
          </View>

          {notifEnabled && (
            <>
              {/* Row 1: Time */}
              <View style={[styles.notifDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.notifRow}>
                <Text style={[styles.notifRowLabel, { color: colors.text }]}>Time</Text>
                <View style={styles.notifRowRight}>
                  {Platform.OS === 'android' && (
                    <Pressable onPress={() => setShowTimePicker(true)}>
                      <Text style={[styles.notifTimeText, { color: colors.tint }]}>
                        {formatTime(notifTime)}
                      </Text>
                    </Pressable>
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={notifTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onChange={(_, selected) => {
                        if (Platform.OS === 'android') setShowTimePicker(false);
                        if (selected) setNotifTime(selected);
                      }}
                      themeVariant={colorScheme}
                    />
                  )}
                </View>
              </View>

              {/* Row 2: Daily / Specific days toggle */}
              <View style={[styles.notifDivider, { backgroundColor: colors.separator }]} />
              <View style={styles.notifRow}>
                <Text style={[styles.notifRowLabel, { color: colors.text }]}>
                  {specificDays ? 'Specific days' : 'Daily'}
                </Text>
                <Switch
                  value={specificDays}
                  onValueChange={(v) => {
                    setSpecificDays(v);
                    if (!v) setNotifDays(undefined);
                    else setNotifDays([]);
                  }}
                  trackColor={{ true: colors.tint }}
                />
              </View>

              {specificDays && (
                <View style={styles.dowRow}>
                  {DOW_LABELS.map((label, day) => {
                    const selected = (notifDays ?? []).includes(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => toggleDay(day)}
                        style={[
                          styles.dowChip,
                          {
                            backgroundColor: selected ? colors.tint : colors.background,
                            borderColor: selected ? colors.tint : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.dowChipText, { color: selected ? '#fff' : colors.secondaryText }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* Delete button for existing */}
        {existingHabit && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete Habit</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: Layout.fontSize.title, fontWeight: '600' },
  headerButton: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  content: { padding: Layout.spacing.md, paddingBottom: 60 },
  label: { fontSize: Layout.fontSize.body, fontWeight: '600', marginBottom: Layout.spacing.sm },
  input: { fontSize: Layout.fontSize.body, padding: Layout.spacing.md, borderRadius: Layout.borderRadius.md },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  notifCard: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  notifToggleLabel: { fontSize: Layout.fontSize.body },
  notifDivider: { height: StyleSheet.hairlineWidth },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 44,
  },
  notifRowLabel: { fontSize: Layout.fontSize.body },
  notifRowRight: { alignItems: 'flex-end', justifyContent: 'center' },
  notifTimeText: { fontSize: Layout.fontSize.body },
  dowRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
    flexWrap: 'wrap',
  },
  dowChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dowChipText: { fontSize: Layout.fontSize.caption, fontWeight: '600' },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.xl,
    gap: Layout.spacing.sm,
  },
  deleteText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
});
