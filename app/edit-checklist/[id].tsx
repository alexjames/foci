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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const [title, setTitle] = useState(existingItem?.title ?? '');
  const [repeats, setRepeats] = useState(!!existingItem);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    existingItem?.recurrence ?? 'daily'
  );
  const [specificDays, setSpecificDays] = useState<number[]>(
    existingItem?.specificDays ?? []
  );
  const [everyNDays, setEveryNDays] = useState(existingItem?.everyNDays ?? 2);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // If repeats is false, use 'daily' but we won't show it
    const finalRecurrence = repeats ? recurrence : 'daily';

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
            onValueChange={setRepeats}
            trackColor={{ true: colors.tint }}
          />
        </View>

        {/* Recurrence options - only shown if repeats is true */}
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
