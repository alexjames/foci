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
import { StreakTrackerConfig, Streak } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

export default function EditStreakScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<StreakTrackerConfig>('streak-tracker');

  const streaks = config?.streaks ?? [];
  const existingStreak = useMemo(
    () => (id !== 'new' ? streaks.find((s) => s.id === id) : null),
    [id, streaks]
  );

  const [title, setTitle] = useState(existingStreak?.title ?? '');
  const [date, setDate] = useState<Date>(
    existingStreak ? new Date(existingStreak.startDate) : new Date()
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    existingStreak?.color
  );
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const defaultConfig: StreakTrackerConfig = {
    toolId: 'streak-tracker',
    streaks: [],
    notificationEnabled: false,
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const currentConfig = config ?? defaultConfig;

    if (existingStreak) {
      const updated: Streak = {
        ...existingStreak,
        title: trimmed,
        startDate: date.toISOString(),
        color: selectedColor,
      };
      setConfig({
        ...currentConfig,
        streaks: currentConfig.streaks.map((s) =>
          s.id === existingStreak.id ? updated : s
        ),
      });
    } else {
      if (currentConfig.streaks.length >= 20) return;
      const newStreak: Streak = {
        id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        startDate: date.toISOString(),
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };
      setConfig({
        ...currentConfig,
        streaks: [...currentConfig.streaks, newStreak],
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingStreak || !config) return;
    Alert.alert('Delete Streak', `Delete "${existingStreak.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({
            ...config,
            streaks: config.streaks.filter((s) => s.id !== existingStreak.id),
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
          {existingStreak ? 'Edit Streak' : 'New Streak'}
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
          placeholder="Streak name"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Start Date */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Start Date
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
            maximumDate={new Date()}
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

        {/* Delete button for existing */}
        {existingStreak && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete Streak
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
