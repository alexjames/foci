import React, { useState, useMemo, useRef, useCallback } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { ChecklistItemKind, RecurrenceType, Subtask } from '@/src/types';
import { useChecklist } from '@/src/hooks/useChecklist';
import * as Haptics from 'expo-haptics';

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
  const { id, kind: kindParam, templateId } = useLocalSearchParams<{
    id: string;
    kind?: string;
    templateId?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, addItem, updateItem, deleteItem, moveToTrash } = useChecklist();

  const isTemplate = kindParam === 'template';

  const existingItem = useMemo(
    () => (id !== 'new' ? items.find((i) => i.id === id) : null),
    [id, items]
  );

  // If templateId is provided, pre-fill from that template
  const templateItem = useMemo(
    () => (templateId ? items.find((i) => i.id === templateId) : null),
    [templateId, items]
  );

  const isEditingTemplate = existingItem?.kind === 'template' || isTemplate;

  // If this item is an instance of a recurring rule, find the parent rule
  const parentRule = useMemo(
    () => (existingItem?.recurringRuleId ? items.find((i) => i.id === existingItem.recurringRuleId) : null),
    [existingItem, items]
  );

  // Compute the allowed reschedule date range for recurring instances
  const recurringDateRange = useMemo<{ min: Date; max: Date } | null>(() => {
    if (!parentRule || !existingItem) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function parseLocalDate(s: string): Date {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    function addDaysLocal(d: Date, n: number): Date {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    }

    // Use periodDate (canonical period anchor) for range computation; fall back to startDate
    const periodDateStr = existingItem.periodDate ?? existingItem.startDate;
    const periodDate = parseLocalDate(periodDateStr);
    // Minimum allowed = today
    const minDate = new Date(today);

    switch (parentRule.recurrence) {
      case 'daily':
        // Daily tasks cannot be rescheduled
        return null;
      case 'every-n-days': {
        const n = parentRule.everyNDays ?? 1;
        const start = parseLocalDate(parentRule.startDate);
        const diffMs = periodDate.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const periodIndex = Math.max(0, Math.floor(diffDays / n));
        // max = start of next period - 1 day
        const nextPeriodStart = addDaysLocal(start, (periodIndex + 1) * n);
        const maxDate = addDaysLocal(nextPeriodStart, -1);
        // If there's no room to reschedule (min >= max), treat as fixed
        if (minDate >= maxDate) return null;
        return { min: minDate, max: maxDate };
      }
      case 'weekdays': {
        // Period = one weekday; max = same day (no future weekday within "period")
        // Allow moving to any weekday on/after today before the next weekday occurrence
        // Actually for weekdays/weekends/specific-days: each occurrence is a "period" of 1 day
        // But the rule says "current period" — for weekdays each day is a period.
        // So the instance can only stay on the same day. Disallow reschedule.
        return null;
      }
      case 'weekends': {
        return null; // same reasoning — each occurrence is its own day
      }
      case 'specific-days': {
        return null; // same reasoning
      }
      default:
        return null;
    }
  }, [parentRule, existingItem]);

  // Determine if existing item repeats (anything other than 'once')
  const existingRepeats = existingItem ? existingItem.recurrence !== 'once' : false;

  const [title, setTitle] = useState(
    templateItem?.title ?? existingItem?.title ?? ''
  );
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
      const [y, m, d] = existingItem.startDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Subtasks for templates
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    existingItem?.subtasks ?? []
  );
  const [subtaskInput, setSubtaskInput] = useState('');
  const subtaskInputRef = useRef<TextInput>(null);

  const addSubtask = useCallback(() => {
    const title = subtaskInput.trim();
    if (!title) return;
    const newSubtask: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      completedDates: [],
    };
    setSubtasks((prev) => [...prev, newSubtask]);
    setSubtaskInput('');
  }, [subtaskInput]);

  const renderSubtaskItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Subtask>) => (
      <ScaleDecorator>
        <Swipeable
          renderRightActions={() => (
            <View style={styles.subtaskDeleteAction}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </View>
          )}
          onSwipeableOpen={(direction: 'left' | 'right') => {
            if (direction === 'left') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSubtasks((prev) => prev.filter((s) => s.id !== item.id));
            }
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            style={[styles.subtaskRow, { backgroundColor: colors.cardBackground }]}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            delayLongPress={300}
          >
            <Ionicons name="reorder-three-outline" size={20} color={colors.secondaryText} style={{ opacity: 0.5 }} />
            <Text style={[styles.subtaskTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        </Swipeable>
      </ScaleDecorator>
    ),
    [colors]
  );

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (isEditingTemplate) {
      // Save as template — no date or recurrence, but with subtasks from local state
      if (existingItem) {
        updateItem({
          ...existingItem,
          title: trimmed,
          kind: 'template',
          recurrence: 'once',
          startDate: formatDate(new Date()),
          subtasks,
        });
      } else {
        addItem({
          title: trimmed,
          recurrence: 'once',
          startDate: formatDate(new Date()),
          kind: 'template' as ChecklistItemKind,
          subtasks,
        });
      }
    } else if (templateId) {
      // Creating a task from a template: use once + chosen date, clone subtasks
      addItem({
        title: trimmed,
        recurrence: 'once',
        startDate: formatDate(onceDate),
        subtasks: templateItem?.subtasks?.map((s) => ({ ...s, completedDates: [] })),
      });
    } else if (repeats) {
      const finalRecurrence = recurrence;
      if (existingItem) {
        updateItem({
          ...existingItem,
          title: trimmed,
          recurrence: finalRecurrence,
          specificDays: finalRecurrence === 'specific-days' ? specificDays : undefined,
          everyNDays: finalRecurrence === 'every-n-days' ? everyNDays : undefined,
          kind: undefined,
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
      // One-time task (or recurring instance)
      if (existingItem) {
        // Validate date range for recurring instances
        if (existingItem.recurringRuleId && recurringDateRange) {
          const chosen = new Date(onceDate.getFullYear(), onceDate.getMonth(), onceDate.getDate());
          if (chosen < recurringDateRange.min || chosen > recurringDateRange.max) {
            const maxStr = recurringDateRange.max.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            Alert.alert(
              'Date Out of Range',
              `This task can only be moved up to ${maxStr} (the day before its next recurrence).`
            );
            return;
          }
        }
        updateItem({
          ...existingItem,
          title: trimmed,
          recurrence: 'once',
          startDate: formatDate(onceDate),
          specificDays: undefined,
          everyNDays: undefined,
          kind: undefined,
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
    if (existingItem.recurringRuleId) {
      Alert.alert(
        'Cannot Delete',
        'Instances of recurring tasks cannot be deleted. Please delete the corresponding recurring task in the Recurring menu.'
      );
      return;
    }
    Alert.alert('Delete Item', `Delete "${existingItem.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (isEditingTemplate) {
            deleteItem(existingItem.id);
          } else {
            moveToTrash(existingItem.id, formatDate(new Date()));
          }
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

  const screenTitle = isEditingTemplate
    ? existingItem ? 'Edit Template' : 'New Template'
    : templateId
    ? 'New Task from Template'
    : existingItem ? 'Edit Item' : 'New Item';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{screenTitle}</Text>
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        {/* Subtasks — only for templates */}
        {isEditingTemplate && (
          <>
            <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
              Subtasks
            </Text>

            {subtasks.length > 0 && (
              <DraggableFlatList
                data={subtasks}
                keyExtractor={(s) => s.id}
                renderItem={renderSubtaskItem}
                onDragEnd={({ data }) => setSubtasks(data)}
                activationDistance={8}
                scrollEnabled={false}
                containerStyle={styles.subtaskList}
              />
            )}

            {/* Add subtask input */}
            <View style={[styles.addSubtaskRow, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="add" size={18} color={colors.tint} />
              <TextInput
                ref={subtaskInputRef}
                style={[styles.addSubtaskInput, { color: colors.text }]}
                placeholder="Add subtask…"
                placeholderTextColor={colors.secondaryText}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                onSubmitEditing={() => {
                  addSubtask();
                  setTimeout(() => subtaskInputRef.current?.focus(), 50);
                }}
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </View>
          </>
        )}

        {/* Templates have no date or recurrence */}
        {!isEditingTemplate && (
          <>
            {/* Date row — only when not repeating */}
            {!repeats && (
              <>
                {/* Recurring instance with no reschedule allowed */}
                {existingItem?.recurringRuleId && !recurringDateRange ? (
                  <View style={[styles.optionRow, { backgroundColor: colors.cardBackground, marginTop: Layout.spacing.lg }]}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Date</Text>
                    <View style={styles.dateRowRight}>
                      <Text style={[styles.dateButtonText, { color: colors.secondaryText }]}>
                        {formatDisplayDate(onceDate)}
                      </Text>
                      <Text style={[styles.dateButtonText, { color: colors.secondaryText, fontSize: 11, marginLeft: 4 }]}>
                        (fixed)
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <Pressable
                      style={[styles.optionRow, { backgroundColor: colors.cardBackground, marginTop: Layout.spacing.lg }]}
                      onPress={() => setShowDatePicker((v) => !v)}
                    >
                      <Text style={[styles.optionLabel, { color: colors.text }]}>Date</Text>
                      <View style={styles.dateRowRight}>
                        <Text style={[styles.dateButtonText, { color: colors.secondaryText }]}>
                          {formatDisplayDate(onceDate)}
                        </Text>
                        <Ionicons
                          name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.secondaryText}
                        />
                      </View>
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={
                          recurringDateRange
                            ? new Date(
                                Math.min(
                                  Math.max(onceDate.getTime(), recurringDateRange.min.getTime()),
                                  recurringDateRange.max.getTime()
                                )
                              )
                            : onceDate
                        }
                        mode="date"
                        display="inline"
                        minimumDate={recurringDateRange?.min}
                        maximumDate={recurringDateRange?.max}
                        onChange={(_, selectedDate) => {
                          if (selectedDate) setOnceDate(selectedDate);
                        }}
                        themeVariant={colorScheme}
                        style={styles.iosDatePicker}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* Repeats toggle — hide when creating from template or editing recurring instance */}
            {!templateId && !existingItem?.recurringRuleId && (
              <View style={[styles.optionRow, { backgroundColor: colors.cardBackground, marginTop: Layout.spacing.sm }]}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>Repeats</Text>
                <Switch
                  value={repeats}
                  onValueChange={(val) => {
                    setRepeats(val);
                    setShowDatePicker(false);
                  }}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            )}

            {/* Recurrence options — only when repeating and not a recurring instance */}
            {repeats && !templateId && !existingItem?.recurringRuleId && (
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
  subtaskList: {
    marginBottom: Layout.spacing.sm,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  subtaskTitle: {
    fontSize: Layout.fontSize.body,
    flex: 1,
  },
  subtaskDeleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
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
  dateRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
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
