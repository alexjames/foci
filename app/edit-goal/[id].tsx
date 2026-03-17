import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  View as RNView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useGoals } from '@/src/hooks/useGoals';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { DEADLINE_COLORS } from '@/src/constants/tools';
import { PriorityUnit, MilestoneStep } from '@/src/types';

const MAX_CHARS = 160;

const UNIT_OPTIONS: { value: PriorityUnit; label: string }[] = [
  { value: 'milestone', label: 'Milestones' },
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
];

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, updateGoal, deleteGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const existingGoal = goals.find((g) => g.id === id);

  const [name, setName] = useState(existingGoal?.name ?? '');
  const [dueDate, setDueDate] = useState<Date>(
    existingGoal?.dueDate ? new Date(existingGoal.dueDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );
  const [color, setColor] = useState<string | undefined>(existingGoal?.color);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  // Progress tracking state
  const [unit, setUnit] = useState<PriorityUnit>(existingGoal?.unit ?? 'milestone');
  const [numberValue, setNumberValue] = useState(String(existingGoal?.numberValue ?? 0));
  const [numberTarget, setNumberTarget] = useState(String(existingGoal?.numberTarget ?? 10));
  const [percentageValue, setPercentageValue] = useState(String(existingGoal?.percentageValue ?? 0));
  const [milestoneSteps, setMilestoneSteps] = useState<MilestoneStep[]>(existingGoal?.milestoneSteps ?? []);
  const [newStepText, setNewStepText] = useState('');

  const remaining = MAX_CHARS - name.length;

  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const handleSave = () => {
    if (!name.trim() || !existingGoal) return;

    const updates: Parameters<typeof updateGoal>[1] = {
      name: name.trim(),
      color,
      dueDate: dueDate.toISOString(),
      unit,
    };

    if (unit === 'number') {
      updates.numberValue = Math.max(0, parseInt(numberValue) || 0);
      updates.numberTarget = Math.max(1, parseInt(numberTarget) || 1);
      updates.percentageValue = undefined;
      updates.milestoneSteps = undefined;
    } else if (unit === 'percentage') {
      updates.percentageValue = Math.min(100, Math.max(0, parseInt(percentageValue) || 0));
      updates.numberValue = undefined;
      updates.numberTarget = undefined;
      updates.milestoneSteps = undefined;
    } else if (unit === 'milestone') {
      updates.milestoneSteps = milestoneSteps;
      updates.numberValue = undefined;
      updates.numberTarget = undefined;
      updates.percentageValue = undefined;
    }

    updateGoal(existingGoal.id, updates);
    router.back();
  };

  const handleDelete = () => {
    if (!existingGoal) return;
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${existingGoal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGoal(existingGoal.id);
            router.back();
          },
        },
      ]
    );
  };

  const addStep = () => {
    const label = newStepText.trim();
    if (!label) return;
    setMilestoneSteps((prev) => [...prev, { id: `step-${Date.now()}`, label, completed: false }]);
    setNewStepText('');
  };

  const removeStep = (stepId: string) => {
    setMilestoneSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const toggleStep = (stepId: string) => {
    setMilestoneSteps((prev) =>
      prev.map((s) => s.id === stepId ? { ...s, completed: !s.completed } : s)
    );
  };

  const inputStyle = (extra?: object) => [
    styles.input,
    {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      color: colors.text,
    },
    extra,
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Goal</Text>
        <Pressable onPress={handleSave} disabled={!name.trim()}>
          <Text
            style={[
              styles.headerButton,
              styles.headerButtonBold,
              { color: colors.tint, opacity: name.trim() ? 1 : 0.4 },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Goal Text */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              I will... <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <TextInput
              style={inputStyle()}
              value={name}
              onChangeText={(t) => setName(t.slice(0, MAX_CHARS))}
              placeholder="e.g., run a marathon in under 5 hours"
              placeholderTextColor={colors.placeholder}
              maxLength={MAX_CHARS}
            />
            <Text style={[styles.charCount, { color: remaining <= 20 ? colors.destructive : colors.secondaryText }]}>
              {remaining} characters remaining
            </Text>
          </View>

          {/* Color */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <RNView style={styles.colorRow}>
              {DEADLINE_COLORS.map((c) => {
                const chipColor = colorScheme === 'dark' ? c.dark : c.light;
                const selected = color === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setColor(c.id)}
                    style={[
                      styles.colorChip,
                      { backgroundColor: chipColor },
                      selected && { borderColor: colors.text, borderWidth: 2 },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={colors.text} />
                    )}
                  </Pressable>
                );
              })}
            </RNView>
          </View>

          {/* Target Date */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Target Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              >
                <Text style={[styles.dateButtonText, { color: colors.tint }]}>{formatDate(dueDate)}</Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setDueDate(selected);
                }}
                themeVariant={colorScheme}
              />
            )}
            {Platform.OS === 'ios' && (
              <Text style={[styles.dateLabel, { color: colors.secondaryText }]}>{formatDate(dueDate)}</Text>
            )}
          </View>

          {/* Progress Tracking */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Progress Tracking</Text>
            <RNView style={styles.unitPickerRow}>
              {UNIT_OPTIONS.map((opt) => {
                const selected = unit === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setUnit(opt.value)}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor: selected ? colors.tint + '22' : colors.inputBackground,
                        borderColor: selected ? colors.tint : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        { color: selected ? colors.tint : colors.secondaryText, fontWeight: selected ? '600' : '400' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </RNView>

            {/* Number fields */}
            {unit === 'number' && (
              <RNView style={styles.progressInputSection}>
                <RNView style={styles.numberFieldRow}>
                  <RNView style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Current</Text>
                    <TextInput
                      style={[styles.numberField, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                      value={numberValue}
                      onChangeText={setNumberValue}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.secondaryText}
                    />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Target</Text>
                    <TextInput
                      style={[styles.numberField, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                      value={numberTarget}
                      onChangeText={setNumberTarget}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.secondaryText}
                    />
                  </RNView>
                </RNView>
              </RNView>
            )}

            {/* Percentage field */}
            {unit === 'percentage' && (
              <RNView style={styles.progressInputSection}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Current Progress (%)</Text>
                <TextInput
                  style={[styles.numberField, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                  value={percentageValue}
                  onChangeText={setPercentageValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.secondaryText}
                />
              </RNView>
            )}

            {/* Milestone steps */}
            {unit === 'milestone' && (
              <RNView style={styles.progressInputSection}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Steps</Text>
                {milestoneSteps.map((step, i) => (
                  <RNView key={step.id} style={styles.stepRow}>
                    <Pressable onPress={() => toggleStep(step.id)} hitSlop={4}>
                      <Ionicons
                        name={step.completed ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={step.completed ? colors.tint : colors.secondaryText}
                      />
                    </Pressable>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: colors.text },
                        step.completed && styles.stepCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                    <Pressable onPress={() => removeStep(step.id)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={18} color={colors.secondaryText} />
                    </Pressable>
                  </RNView>
                ))}
                <RNView style={styles.addStepRow}>
                  <TextInput
                    style={[styles.addStepInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                    value={newStepText}
                    onChangeText={setNewStepText}
                    placeholder="Add a step..."
                    placeholderTextColor={colors.secondaryText}
                    onSubmitEditing={addStep}
                    returnKeyType="done"
                  />
                  <Pressable onPress={addStep} style={[styles.addStepBtn, { backgroundColor: colors.tint }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </RNView>
              </RNView>
            )}
          </View>

          {existingGoal && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.deleteButtonText, { color: colors.destructive }]}>
                Delete Goal
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  headerButton: { fontSize: Layout.fontSize.body },
  headerButtonBold: { fontWeight: '600' },
  headerTitle: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  scrollContent: { padding: Layout.spacing.md },
  fieldContainer: { marginBottom: Layout.spacing.lg, backgroundColor: 'transparent' },
  label: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.body,
  },
  charCount: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'right',
    marginTop: Layout.spacing.xs,
  },
  dateButton: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  dateLabel: { fontSize: Layout.fontSize.caption, marginTop: Layout.spacing.xs },
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
  },
  // Progress tracking
  unitPickerRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
    flexWrap: 'wrap',
  },
  unitChip: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  unitChipText: {
    fontSize: Layout.fontSize.caption,
  },
  progressInputSection: {
    gap: Layout.spacing.sm,
  },
  fieldLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginBottom: Layout.spacing.xs,
    letterSpacing: 0.3,
  },
  numberFieldRow: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  numberField: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  stepLabel: {
    flex: 1,
    fontSize: Layout.fontSize.body,
  },
  stepCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  addStepRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    alignItems: 'center',
    marginTop: Layout.spacing.xs,
  },
  addStepInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  deleteButtonText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
});
