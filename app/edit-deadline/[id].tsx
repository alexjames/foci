import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { DeadlineTrackerConfig, Deadline, DeadlineReminderType } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS, DEADLINE_REMINDER_OPTIONS } from '@/src/constants/tools';

export default function EditDeadlineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');

  const deadlines = config?.deadlines ?? [];
  const existingDeadline = useMemo(
    () => (id !== 'new' ? deadlines.find((d) => d.id === id) : null),
    [id, deadlines]
  );

  const [title, setTitle] = useState(existingDeadline?.title ?? '');
  const [date, setDate] = useState<Date>(
    existingDeadline ? new Date(existingDeadline.date) : new Date()
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    existingDeadline?.color
  );
  const [reminders, setReminders] = useState<DeadlineReminderType[]>(
    existingDeadline?.reminders ?? []
  );
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const defaultConfig: DeadlineTrackerConfig = {
    toolId: 'deadline-tracker',
    deadlines: [],
    notificationEnabled: false,
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const currentConfig = config ?? defaultConfig;

    if (existingDeadline) {
      const updated: Deadline = {
        ...existingDeadline,
        title: trimmed,
        date: date.toISOString(),
        color: selectedColor,
        reminders,
      };
      setConfig({
        ...currentConfig,
        deadlines: currentConfig.deadlines.map((d) =>
          d.id === existingDeadline.id ? updated : d
        ),
      });
    } else {
      if (currentConfig.deadlines.length >= 10) return;
      const newDeadline: Deadline = {
        id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        date: date.toISOString(),
        color: selectedColor,
        reminders,
        createdAt: new Date().toISOString(),
      };
      setConfig({
        ...currentConfig,
        deadlines: [...currentConfig.deadlines, newDeadline],
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingDeadline || !config) return;
    Alert.alert('Delete Deadline', `Delete "${existingDeadline.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({
            ...config,
            deadlines: config.deadlines.filter((d) => d.id !== existingDeadline.id),
          });
          router.back();
        },
      },
    ]);
  };

  const toggleReminder = (type: DeadlineReminderType) => {
    setReminders((prev) =>
      prev.includes(type) ? prev.filter((r) => r !== type) : [...prev, type]
    );
  };

  const formatDisplayDate = (d: Date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {existingDeadline ? 'Edit Deadline' : 'New Deadline'}
        </Text>
        <Pressable onPress={handleSave} disabled={!title.trim()}>
          <Text
            style={[
              styles.headerButton,
              { color: colors.tint, opacity: title.trim() ? 1 : 0.4 },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.cardBackground },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Deadline name"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Date */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Date
        </Text>
        {Platform.OS === 'android' && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { backgroundColor: colors.cardBackground }]}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.tint} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {formatDisplayDate(date)}
            </Text>
          </Pressable>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, selectedDate) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
            themeVariant={colorScheme}
            style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
          />
        )}

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

        {/* Reminders */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Reminders (optional)
        </Text>
        {DEADLINE_REMINDER_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.reminderRow,
              { backgroundColor: colors.cardBackground },
              reminders.includes(option.value) && { borderColor: colors.tint, borderWidth: 2 },
            ]}
            onPress={() => toggleReminder(option.value)}
          >
            <Text style={[styles.reminderLabel, { color: colors.text }]}>{option.label}</Text>
            {reminders.includes(option.value) && (
              <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
            )}
          </Pressable>
        ))}

        {/* Delete button for existing */}
        {existingDeadline && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete Deadline
            </Text>
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
  headerTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
  },
  headerButton: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  content: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
  },
  label: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  input: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  dateButtonText: {
    fontSize: Layout.fontSize.body,
  },
  iosDatePicker: {
    alignSelf: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reminderLabel: {
    fontSize: Layout.fontSize.body,
  },
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
  deleteText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});
