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
  useColorScheme,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RecurrenceType } from '@/src/types';
import { useChecklist } from '@/src/hooks/useChecklist';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'every-n-days', label: 'Every N Days' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'specific-days', label: 'Specific Days' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(d: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function EditChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, addItem, updateItem, deleteItem } = useChecklist();

  const existingItem = useMemo(
    () => (id !== 'new' ? items.find((i) => i.id === id) : null),
    [id, items]
  );

  // Determine if existing item repeats (anything other than 'once')
  const existingRepeats = existingItem ? existingItem.recurrence !== 'once' : false;

  const [title, setTitle] = useState(existingItem?.title ?? '');
  const [repeats, setRepeats] = useState(existingRepeats);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    existingItem && existingItem.recurrence !== 'once'
      ? existingItem.recurrence
      : 'daily'
  );
  const [specificDays, setSpecificDays] = useState<number[]>(
    existingItem?.specificDays ?? []
  );
  const [everyNDays, setEveryNDays] = useState(existingItem?.everyNDays ?? 2);

  // For one-time items: the date to do it
  const [onceDate, setOnceDate] = useState<Date>(() => {
    if (existingItem && existingItem.recurrence === 'once') {
      return new Date(existingItem.startDate);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (repeats) {
      const finalRecurrence = recurrence;
      if (existingItem) {
        updateItem({
          ...existingItem,
          title: trimmed,
          recurrence: finalRecurrence,
          specificDays: finalRecurrence === 'specific-days' ? specificDays : undefined,
          everyNDays: finalRecurrence === 'every-n-days' ? everyNDays : undefined,
        });
      } else {
        addItem({
          title: trimmed,
          recurrence: finalRecurrence,
          specificDays: finalRecurrence === 'specific-days' ? specificDays : undefined,
          everyNDays: finalRecurrence === 'every-n-days' ? everyNDays : undefined,
        });
      }
    } else {
      // One-time item
      if (existingItem) {
        updateItem({
          ...existingItem,
          title: trimmed,
          recurrence: 'once',
          startDate: formatDate(onceDate),
          specificDays: undefined,
          everyNDays: undefined,
        });
      } else {
        addItem({
          title: trimmed,
          recurrence: 'once',
          startDate: formatDate(onceDate),
        });
      }
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingItem) return;
    Alert.alert('Delete Item', `Delete "${existingItem.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteItem(existingItem.id);
          router.back();
        },
      },
    ]);
  };

  const toggleDay = (day: number) => {
    setSpecificDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {existingItem ? 'Edit Item' : 'New Item'}
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
          placeholder="What needs to be done?"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Repeats toggle */}
        <View style={[styles.optionRow, { backgroundColor: colors.cardBackground, marginTop: Layout.spacing.lg }]}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Repeats</Text>
          <Switch
            value={repeats}
            onValueChange={(val) => {
              setRepeats(val);
              if (val) setShowDatePicker(false);
              else setShowDatePicker(Platform.OS === 'ios');
            }}
            trackColor={{ true: colors.tint }}
          />
        </View>

        {/* One-time date picker (shown when not repeating) */}
        {!repeats && (
          <>
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
                  {formatDisplayDate(onceDate)}
                </Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={onceDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, selectedDate) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selectedDate) setOnceDate(selectedDate);
                }}
                themeVariant={colorScheme}
                style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
              />
            )}
          </>
        )}

        {/* Recurrence options — only when repeating */}
        {repeats && (
          <>
            <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
              Frequency
            </Text>
            {RECURRENCE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionRow,
                  { backgroundColor: colors.cardBackground },
                  recurrence === option.value && { borderColor: colors.tint, borderWidth: 2 },
                ]}
                onPress={() => setRecurrence(option.value)}
              >
                <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                {recurrence === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                )}
              </Pressable>
            ))}

            {/* Specific days picker */}
            {recurrence === 'specific-days' && (
              <View style={styles.daysRow}>
                {DAY_NAMES.map((name, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.dayChip,
                      { backgroundColor: colors.cardBackground },
                      specificDays.includes(index) && { backgroundColor: colors.tint },
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        { color: colors.text },
                        specificDays.includes(index) && { color: '#fff' },
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Every N days picker */}
            {recurrence === 'every-n-days' && (
              <View style={[styles.stepperContainer, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Every</Text>
                <View style={styles.stepperRow}>
                  <Pressable onPress={() => setEveryNDays(Math.max(2, everyNDays - 1))}>
                    <Ionicons name="remove-circle-outline" size={28} color={colors.tint} />
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: colors.text }]}>{everyNDays}</Text>
                  <Pressable onPress={() => setEveryNDays(Math.min(30, everyNDays + 1))}>
                    <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
                  </Pressable>
                </View>
                <Text style={[styles.optionLabel, { color: colors.text }]}>days</Text>
              </View>
            )}
          </>
        )}

        {/* Delete button for existing items */}
        {existingItem && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete Item</Text>
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionLabel: {
    fontSize: Layout.fontSize.body,
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
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  dayChip: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
  },
  dayChipText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  stepperValue: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
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
