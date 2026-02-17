import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useChecklist } from '@/src/hooks/useChecklist';
import * as Haptics from 'expo-haptics';

function getWeekDays(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ChecklistScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { getItemsForDate, isCompleted, toggleCompletion, items } = useChecklist();
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const weekDays = useMemo(() => getWeekDays(today), [today]);
  const dayItems = useMemo(
    () => getItemsForDate(selectedDate),
    [selectedDate, getItemsForDate, items]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Day timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeline}
        style={styles.timelineContainer}
      >
        {weekDays.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayPill,
                { backgroundColor: colors.cardBackground },
                isSelected && { backgroundColor: colors.tint },
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: colors.secondaryText },
                  isSelected && { color: '#fff' },
                ]}
              >
                {DAY_LABELS[index]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: colors.text },
                  isSelected && { color: '#fff' },
                  isToday && !isSelected && { color: colors.tint },
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Checklist items */}
      <ScrollView style={styles.itemsList} contentContainerStyle={styles.itemsContent}>
        {dayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No items for this day
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
              Tap + to add a checklist item
            </Text>
          </View>
        ) : (
          dayItems.map((item) => {
            const completed = isCompleted(item.id, selectedDate);
            return (
              <Pressable
                key={item.id}
                style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  toggleCompletion(item.id, selectedDate);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onLongPress={() => router.push(`/edit-checklist/${item.id}` as any)}
              >
                <Ionicons
                  name={completed ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={completed ? colors.tint : colors.secondaryText}
                />
                <Text
                  style={[
                    styles.itemTitle,
                    { color: colors.text },
                    completed && {
                      textDecorationLine: 'line-through',
                      color: colors.secondaryText,
                    },
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/edit-checklist/new' as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timelineContainer: {
    flexGrow: 0,
    paddingVertical: Layout.spacing.md,
  },
  timeline: {
    paddingHorizontal: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  dayPill: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    minWidth: 52,
  },
  dayLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  itemTitle: {
    fontSize: Layout.fontSize.body,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginTop: Layout.spacing.md,
  },
  emptyMessage: {
    fontSize: Layout.fontSize.body,
    marginTop: Layout.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    right: Layout.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
