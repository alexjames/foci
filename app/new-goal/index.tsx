import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useGoals } from '@/src/hooks/useGoals';
import { PriorityUnit, MilestoneStep } from '@/src/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHARS = 160;
const TOTAL_STEPS = 2;

const UNIT_OPTIONS: { value: PriorityUnit; label: string }[] = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Shared Sub-components ───────────────────────────────────────────────────

function WizardProgressBar({
  currentStep,
  colors,
}: {
  currentStep: number;
  colors: typeof Colors.light;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fraction = (currentStep + 1) / TOTAL_STEPS;
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, widthAnim]);

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.tint,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

function NavButtons({
  onBack,
  onNext,
  canProceed,
  nextLabel = 'Continue',
  colors,
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  nextLabel?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.navRow}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={28} color={colors.secondaryText} />
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={!canProceed}
        style={[
          styles.nextBtn,
          { backgroundColor: colors.tint, opacity: canProceed ? 1 : 0.35 },
        ]}
      >
        <Text style={styles.nextBtnText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

// ─── Screen 1: Goal Statement ────────────────────────────────────────────────

function GoalStatementStep({
  text,
  onChangeText,
  dueDate,
  onDateChange,
  onNext,
  onCancel,
  colors,
  colorScheme,
}: {
  text: string;
  onChangeText: (v: string) => void;
  dueDate: Date;
  onDateChange: (d: Date) => void;
  onNext: () => void;
  onCancel: () => void;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}) {
  const [showPicker, setShowPicker] = useState(false);
  const remaining = MAX_CHARS - text.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepOuter}
    >
      <ScrollView
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sentenceRow}>
          <Text style={[styles.sentenceText, { color: colors.text }]}>By </Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.dateTap, { borderBottomColor: colors.tint }]}
          >
            <Text style={[styles.dateText, { color: colors.tint }]}>
              {formatDate(dueDate)}
            </Text>
          </Pressable>
          <Text style={[styles.sentenceText, { color: colors.text }]}>, I will</Text>
        </View>

        <TextInput
          style={[
            styles.goalInput,
            { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
          ]}
          value={text}
          onChangeText={(t) => onChangeText(t.slice(0, MAX_CHARS))}
          placeholder="e.g., run a marathon in under 5 hours"
          placeholderTextColor={colors.secondaryText}
          multiline
          autoFocus
          textAlignVertical="top"
          maxLength={MAX_CHARS}
        />
        <Text style={[styles.charCount, { color: remaining <= 20 ? colors.destructive : colors.secondaryText }]}>
          {remaining} characters remaining
        </Text>

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_, selected) => {
              setShowPicker(false);
              if (selected) onDateChange(selected);
            }}
            themeVariant={colorScheme}
          />
        )}
        {showPicker && Platform.OS === 'ios' && (
          <View style={styles.iosPickerContainer}>
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              onChange={(_, selected) => {
                if (selected) onDateChange(selected);
              }}
              themeVariant={colorScheme}
              style={styles.datePicker}
            />
            <Pressable
              onPress={() => setShowPicker(false)}
              style={[styles.doneBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <NavButtons
        onBack={onCancel}
        onNext={onNext}
        canProceed={text.trim().length > 0}
        colors={colors}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Screen 2: Progress Measurement ──────────────────────────────────────────

function ProgressMeasurementStep({
  unit,
  onUnitChange,
  numberValue,
  onNumberValueChange,
  numberTarget,
  onNumberTargetChange,
  percentageValue,
  onPercentageValueChange,
  milestoneSteps,
  onMilestoneStepsChange,
  onBack,
  onSubmit,
  colors,
}: {
  unit: PriorityUnit;
  onUnitChange: (u: PriorityUnit) => void;
  numberValue: string;
  onNumberValueChange: (v: string) => void;
  numberTarget: string;
  onNumberTargetChange: (v: string) => void;
  percentageValue: string;
  onPercentageValueChange: (v: string) => void;
  milestoneSteps: MilestoneStep[];
  onMilestoneStepsChange: (steps: MilestoneStep[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  colors: typeof Colors.light;
}) {
  const [newStepText, setNewStepText] = useState('');

  const addStep = () => {
    const label = newStepText.trim();
    if (!label) return;
    onMilestoneStepsChange([
      ...milestoneSteps,
      { id: `step-${Date.now()}`, label, completed: false },
    ]);
    setNewStepText('');
  };

  const removeStep = (id: string) => {
    onMilestoneStepsChange(milestoneSteps.filter((s) => s.id !== id));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepOuter}
    >
      <ScrollView
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.stepQuestion, { color: colors.text }]}>
          How will you measure progress?
        </Text>

        {/* Unit picker */}
        <View style={styles.unitPickerRow}>
          {UNIT_OPTIONS.map((opt) => {
            const selected = unit === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onUnitChange(opt.value)}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor: selected ? colors.tint + '22' : colors.cardBackground,
                    borderColor: selected ? colors.tint : colors.cardBorder,
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
        </View>

        {/* Number fields */}
        {unit === 'number' && (
          <View style={styles.progressInputSection}>
            <View style={styles.numberFieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Current</Text>
                <TextInput
                  style={[styles.numberField, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                  value={numberValue}
                  onChangeText={onNumberValueChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.secondaryText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Target</Text>
                <TextInput
                  style={[styles.numberField, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                  value={numberTarget}
                  onChangeText={onNumberTargetChange}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={colors.secondaryText}
                />
              </View>
            </View>
          </View>
        )}

        {/* Percentage field */}
        {unit === 'percentage' && (
          <View style={styles.progressInputSection}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Current Progress (%)</Text>
            <TextInput
              style={[styles.numberField, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
              value={percentageValue}
              onChangeText={onPercentageValueChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.secondaryText}
            />
          </View>
        )}

        {/* Milestone steps */}
        {unit === 'milestone' && (
          <View style={styles.progressInputSection}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Steps</Text>
            {milestoneSteps.map((step, i) => (
              <View key={step.id} style={styles.stepRow}>
                <Text style={[styles.stepIndex, { color: colors.secondaryText }]}>{i + 1}.</Text>
                <Text style={[styles.stepLabel, { color: colors.text }]} numberOfLines={1}>{step.label}</Text>
                <Pressable onPress={() => removeStep(step.id)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.secondaryText} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addStepRow}>
              <TextInput
                style={[styles.addStepInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
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
            </View>
          </View>
        )}
      </ScrollView>
      <NavButtons
        onBack={onBack}
        onNext={onSubmit}
        canProceed
        nextLabel="Create Goal"
        colors={colors}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function NewGoalWizard() {
  const router = useRouter();
  const { addGoal, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const SCREEN_WIDTH = Dimensions.get('window').width;

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [unit, setUnit] = useState<PriorityUnit>('milestone');
  const [numberValue, setNumberValue] = useState('0');
  const [numberTarget, setNumberTarget] = useState('10');
  const [percentageValue, setPercentageValue] = useState('0');
  const [milestoneSteps, setMilestoneSteps] = useState<MilestoneStep[]>([]);

  // Navigation
  const goToStep = useCallback(
    (nextIndex: number, direction: 'forward' | 'backward') => {
      const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
      Animated.timing(slideAnim, {
        toValue,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(-toValue);
        setCurrentStep(nextIndex);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim, SCREEN_WIDTH]
  );

  const goForward = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1, 'forward');
    }
  }, [currentStep, goToStep]);

  const goBackward = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1, 'backward');
    } else {
      router.back();
    }
  }, [currentStep, goToStep, router]);

  // Submit
  const handleSubmit = useCallback(() => {
    if (!canAddGoal) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const goalData: Parameters<typeof addGoal>[0] = {
      name: trimmed,
      dueDate: dueDate.toISOString(),
      unit,
    };

    if (unit === 'number') {
      goalData.numberValue = Math.max(0, parseInt(numberValue) || 0);
      goalData.numberTarget = Math.max(1, parseInt(numberTarget) || 1);
    } else if (unit === 'percentage') {
      goalData.percentageValue = Math.min(100, Math.max(0, parseInt(percentageValue) || 0));
    } else if (unit === 'milestone') {
      goalData.milestoneSteps = milestoneSteps;
    }

    addGoal(goalData);
    router.back();
  }, [canAddGoal, text, dueDate, unit, numberValue, numberTarget, percentageValue, milestoneSteps, addGoal, router]);

  // Render
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <GoalStatementStep
            text={text}
            onChangeText={setText}
            dueDate={dueDate}
            onDateChange={setDueDate}
            onNext={goForward}
            onCancel={() => router.back()}
            colors={colors}
            colorScheme={colorScheme}
          />
        );
      case 1:
        return (
          <ProgressMeasurementStep
            unit={unit}
            onUnitChange={setUnit}
            numberValue={numberValue}
            onNumberValueChange={setNumberValue}
            numberTarget={numberTarget}
            onNumberTargetChange={setNumberTarget}
            percentageValue={percentageValue}
            onPercentageValueChange={setPercentageValue}
            milestoneSteps={milestoneSteps}
            onMilestoneStepsChange={setMilestoneSteps}
            onBack={goBackward}
            onSubmit={handleSubmit}
            colors={colors}
          />
        );
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <WizardProgressBar currentStep={currentStep} colors={colors} />
      <Animated.View
        style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}
      >
        {renderStep()}
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  slideContainer: { flex: 1 },
  stepOuter: { flex: 1 },
  stepContent: {
    padding: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    flexGrow: 1,
  },

  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
  },
  backBtn: { padding: 4 },
  nextBtn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    minWidth: 120,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },

  // Screen 1 - Goal Statement
  sentenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginBottom: Layout.spacing.lg,
  },
  sentenceText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
  },
  dateTap: {
    borderBottomWidth: 2,
    paddingBottom: 2,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
  },
  goalInput: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    minHeight: 100,
  },
  charCount: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'right',
    marginTop: Layout.spacing.xs,
  },
  iosPickerContainer: {
    marginTop: Layout.spacing.md,
    alignItems: 'center',
  },
  datePicker: {
    marginTop: Layout.spacing.md,
  },
  doneBtn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.sm,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },

  // Screen 2 - Progress Measurement
  stepQuestion: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
    marginBottom: Layout.spacing.lg,
  },
  unitPickerRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
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
    marginBottom: Layout.spacing.md,
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
  stepIndex: {
    fontSize: Layout.fontSize.caption,
    width: 18,
  },
  stepLabel: {
    flex: 1,
    fontSize: Layout.fontSize.body,
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
});
