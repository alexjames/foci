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
import { EventsConfig, Event, EventRecurrence } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS, EVENT_ICONS } from '@/src/constants/tools';

type RecurrenceType = EventRecurrence['type'];

const RECURRENCE_OPTIONS: { type: RecurrenceType; label: string }[] = [
  { type: 'none',          label: 'Does not repeat' },
  { type: 'annually',      label: 'Annually' },
  { type: 'monthly',       label: 'Same day every month' },
  { type: 'every-x-months', label: 'Every X months' },
  { type: 'every-x-days',  label: 'Every X days' },
];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<EventsConfig>('events');

  const events = config?.events ?? [];
  const existingEvent = useMemo(
    () => (id !== 'new' ? events.find((e) => e.id === id) : null),
    [id, events]
  );

  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [date, setDate] = useState<Date>(() => {
    if (!existingEvent) return new Date();
    const parsed = new Date(existingEvent.date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [selectedIcon, setSelectedIcon] = useState<string>(
    existingEvent?.icon ?? 'calendar-outline'
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    existingEvent?.color
  );
  const existingRecurrence: EventRecurrence = existingEvent?.recurrence ?? { type: 'none' };
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(existingRecurrence.type);
  const [everyXMonths, setEveryXMonths] = useState<string>(
    existingRecurrence.type === 'every-x-months' ? String(existingRecurrence.months) : '3'
  );
  const [everyXDays, setEveryXDays] = useState<string>(
    existingRecurrence.type === 'every-x-days' ? String(existingRecurrence.days) : '30'
  );
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const defaultConfig: EventsConfig = {
    toolId: 'events',
    events: [],
  };

  function buildRecurrence(): EventRecurrence {
    switch (recurrenceType) {
      case 'annually': return { type: 'annually' };
      case 'monthly': return { type: 'monthly' };
      case 'every-x-months': return { type: 'every-x-months', months: Math.max(1, parseInt(everyXMonths) || 1) };
      case 'every-x-days':   return { type: 'every-x-days', days: Math.max(1, parseInt(everyXDays) || 1) };
      default: return { type: 'none' };
    }
  }

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const currentConfig = config ?? defaultConfig;
    const recurrence = buildRecurrence();

    if (existingEvent) {
      const updated: Event = {
        ...existingEvent,
        title: trimmed,
        date: date.toISOString(),
        icon: selectedIcon,
        color: selectedColor,
        recurrence,
      };
      setConfig({
        ...currentConfig,
        events: currentConfig.events.map((e) =>
          e.id === existingEvent.id ? updated : e
        ),
      });
    } else {
      const newEvent: Event = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        date: date.toISOString(),
        icon: selectedIcon,
        color: selectedColor,
        recurrence,
        createdAt: new Date().toISOString(),
      };
      setConfig({
        ...currentConfig,
        events: [...currentConfig.events, newEvent],
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingEvent || !config) return;
    Alert.alert('Delete Event', `Delete "${existingEvent.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({
            ...config,
            events: config.events.filter((e) => e.id !== existingEvent.id),
          });
          router.back();
        },
      },
    ]);
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
          {existingEvent ? 'Edit Event' : 'New Event'}
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
          placeholder="Event name"
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
              if (selectedDate && !isNaN(selectedDate.getTime())) setDate(selectedDate);
            }}
            themeVariant={colorScheme}
            style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
          />
        )}

        {/* Icon */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Icon
        </Text>
        <View style={styles.iconGrid}>
          {EVENT_ICONS.map((item) => {
            const isSelected = selectedIcon === item.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedIcon(item.icon)}
                style={[
                  styles.iconChip,
                  { backgroundColor: colors.cardBackground },
                  isSelected && { borderColor: colors.tint, borderWidth: 2 },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={isSelected ? colors.tint : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.iconLabel,
                    { color: isSelected ? colors.tint : colors.secondaryText },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Recurrence */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Repeats
        </Text>
        {RECURRENCE_OPTIONS.map((option) => {
          const isSelected = recurrenceType === option.type;
          return (
            <Pressable
              key={option.type}
              onPress={() => setRecurrenceType(option.type)}
              style={[
                styles.recurrenceRow,
                { backgroundColor: colors.cardBackground },
                isSelected && { borderColor: colors.tint, borderWidth: 2 },
              ]}
            >
              <Text style={[styles.recurrenceLabel, { color: colors.text }]}>
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
              )}
            </Pressable>
          );
        })}

        {/* Every X months input */}
        {recurrenceType === 'every-x-months' && (
          <View style={styles.xInputRow}>
            <Text style={[styles.xInputLabel, { color: colors.secondaryText }]}>
              Every
            </Text>
            <TextInput
              style={[styles.xInput, { color: colors.text, backgroundColor: colors.cardBackground }]}
              value={everyXMonths}
              onChangeText={(v) => setEveryXMonths(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.xInputLabel, { color: colors.secondaryText }]}>
              months
            </Text>
          </View>
        )}

        {/* Every X days input */}
        {recurrenceType === 'every-x-days' && (
          <View style={styles.xInputRow}>
            <Text style={[styles.xInputLabel, { color: colors.secondaryText }]}>
              Every
            </Text>
            <TextInput
              style={[styles.xInput, { color: colors.text, backgroundColor: colors.cardBackground }]}
              value={everyXDays}
              onChangeText={(v) => setEveryXDays(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={[styles.xInputLabel, { color: colors.secondaryText }]}>
              days
            </Text>
          </View>
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

        {/* Delete button for existing */}
        {existingEvent && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete Event
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  iconChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 64,
    gap: 4,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  recurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recurrenceLabel: {
    fontSize: Layout.fontSize.body,
  },
  xInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.xs,
  },
  xInputLabel: {
    fontSize: Layout.fontSize.body,
  },
  xInput: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    minWidth: 60,
    textAlign: 'center',
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
