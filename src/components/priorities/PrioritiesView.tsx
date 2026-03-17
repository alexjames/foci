import React, { useCallback, useRef, useState } from 'react';
import Slider from '@react-native-community/slider';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Priority, PrioritiesConfig, PriorityUnit, MilestoneStep } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { useAppContext } from '@/src/context/AppContext';

// ─── Progress helpers ─────────────────────────────────────────────────────────

export function computeProgress(p: Priority): { fraction: number; label: string } | null {
  if (!p.unit) return null;
  if (p.unit === 'percentage') {
    const v = p.percentageValue ?? 0;
    return { fraction: v / 100, label: `${v}%` };
  }
  if (p.unit === 'number') {
    const v = p.numberValue ?? 0;
    const t = p.numberTarget ?? 1;
    return { fraction: Math.min(t > 0 ? v / t : 0, 1), label: `${v} / ${t}` };
  }
  if (p.unit === 'milestone') {
    const steps = p.milestoneSteps ?? [];
    const done = steps.filter((s) => s.completed).length;
    return { fraction: steps.length ? done / steps.length : 0, label: `${done} / ${steps.length}` };
  }
  return null;
}

function ProgressBar({ priority, tintColor }: { priority: Priority; tintColor: string }) {
  const progress = computeProgress(priority);
  if (!progress) return null;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress.fraction * 100)}%` as any, backgroundColor: tintColor }]} />
      </View>
      <Text style={[styles.progressLabel, { color: tintColor }]}>{progress.label}</Text>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'complete' | 'delete';

function Toast({ message, type, visible }: { message: string; type: ToastType; visible: boolean }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const bg = type === 'complete' ? '#34C759' : '#FF3B30';
  const icon = type === 'complete' ? 'checkmark-circle' : 'trash';

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bg, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={icon as any} size={16} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 1000);
  }, []);

  return { toast, show };
}

// ─────────────────────────────────────────────────────────────────────────────

const MAX_PRIORITIES = 3;
const MAX_CHARS = 140;
const DEFAULT_CONFIG: PrioritiesConfig = { toolId: 'priorities', priorities: [] };

function CompleteAction() {
  return (
    <View style={styles.swipeActionLeft}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Done</Text>
      </View>
    </View>
  );
}

function DeleteAction() {
  return (
    <View style={styles.swipeActionRight}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.swipeText}>Delete</Text>
      </View>
    </View>
  );
}

function SwipeablePriorityCard({
  priority,
  rank,
  goalName,
  goalColor,
  onComplete,
  onCardPress,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  priority: Priority;
  rank: number;
  goalName: string | null;
  goalColor: string | undefined;
  onComplete: (id: string, text: string) => void;
  onCardPress: (priority: Priority) => void;
  onDelete: (id: string, text: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<Swipeable>(null);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={() => <CompleteAction />}
          renderRightActions={() => <DeleteAction />}
          onSwipeableOpen={(direction) => {
            swipeableRef.current?.close();
            if (direction === 'left') {
              onComplete(priority.id, priority.text);
            } else if (direction === 'right') {
              onDelete(priority.id, priority.text);
            }
          }}
          overshootLeft={false}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onCardPress(priority)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.card, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[styles.rank, { color: colors.tint }]}>{rank}</Text>
            <View style={styles.cardBody}>
              <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={3}>
                {priority.text}
              </Text>
              {goalName !== null && (
                <View style={[styles.goalBadge, { backgroundColor: (goalColor ?? colors.tint) + '22' }]}>
                  <View style={[styles.goalDot, { backgroundColor: goalColor ?? colors.tint }]} />
                  <Text style={[styles.goalBadgeText, { color: goalColor ?? colors.tint }]} numberOfLines={1}>
                    {goalName}
                  </Text>
                </View>
              )}
              <ProgressBar priority={priority} tintColor={colors.tint} />
            </View>
            {showHandle && (
              <Ionicons
                name="reorder-three-outline"
                size={20}
                color={colors.secondaryText}
                style={{ opacity: 0.4 }}
              />
            )}
          </Pressable>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

function PriorityDetailSheet({
  priority,
  rank,
  goalName,
  goalColor,
  visible,
  onClose,
  onEdit,
  onComplete,
  onDelete,
  onUpdateProgress,
  showToast,
}: {
  priority: Priority | null;
  rank: number;
  goalName: string | null;
  goalColor: string | undefined;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, data: Partial<Priority>) => void;
  showToast: (message: string, type: ToastType) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [editingNumberValue, setEditingNumberValue] = useState(false);
  const [numberValueText, setNumberValueText] = useState('');
  const [sliderValue, setSliderValue] = useState<number | null>(null);

  React.useEffect(() => {
    if (visible && priority) {
      setEditingNumberValue(false);
      setNumberValueText(priority.numberValue ? String(priority.numberValue) : '');
      setSliderValue(null);
    }
  }, [visible, priority]);

  if (!priority) return null;

  const accent = goalColor ?? colors.tint;
  const progress = computeProgress(priority);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.cardBackground, borderTopColor: colors.tint }]}>
        <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.sheetTitleRow}>
          <View style={{ width: 38 }} />
          <View style={styles.sheetTitleCenter}>
            <Text style={[styles.sheetRank, { color: colors.tint }]}>{rank}</Text>
          </View>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
            <Ionicons name="pencil-outline" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>

        <Text style={[styles.sheetText, { color: colors.text }]}>{priority.text}</Text>

        {goalName !== null && (
          <View style={[styles.sheetGoalBadge, { backgroundColor: accent + '22' }]}>
            <View style={[styles.sheetGoalDot, { backgroundColor: accent }]} />
            <Text style={[styles.sheetGoalText, { color: accent }]}>{goalName}</Text>
          </View>
        )}

        {/* Progress update section */}
        {priority.unit === 'percentage' && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressSectionLabel, { color: colors.secondaryText }]}>PROGRESS</Text>
            <View style={styles.sheetSliderRow}>
              <Slider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={priority.percentageValue ?? 0}
                minimumTrackTintColor={colors.tint}
                maximumTrackTintColor={colors.separator}
                thumbTintColor={colors.tint}
                onValueChange={(v) => setSliderValue(Math.round(v))}
                onSlidingComplete={(v) => {
                  const rounded = Math.round(v);
                  onUpdateProgress(priority.id, { percentageValue: rounded });
                  setSliderValue(null);
                }}
              />
              <Text style={[styles.stepperValue, { color: colors.tint, minWidth: 44, textAlign: 'right' }]}>
                {(sliderValue !== null ? sliderValue : (priority.percentageValue ?? 0))}%
              </Text>
            </View>
          </View>
        )}

        {priority.unit === 'number' && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressSectionLabel, { color: colors.secondaryText }]}>PROGRESS</Text>
            <View style={styles.progressStepperRow}>
              {editingNumberValue ? (
                <TextInput
                  style={[styles.numberInput, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
                  value={numberValueText}
                  onChangeText={setNumberValueText}
                  keyboardType="numeric"
                  autoFocus
                  onBlur={() => {
                    const v = Math.max(0, parseInt(numberValueText) || 0);
                    onUpdateProgress(priority.id, { numberValue: v });
                    setEditingNumberValue(false);
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const v = Math.max(0, parseInt(numberValueText) || 0);
                    onUpdateProgress(priority.id, { numberValue: v });
                    setEditingNumberValue(false);
                  }}
                />
              ) : (
                <Pressable onPress={() => { setNumberValueText(String(priority.numberValue ?? 0)); setEditingNumberValue(true); }}>
                  <Text style={[styles.stepperValue, { color: colors.text }]}>{priority.numberValue ?? 0}</Text>
                </Pressable>
              )}
              <Text style={[styles.numberSeparator, { color: colors.secondaryText }]}>/ {priority.numberTarget ?? 1}</Text>
            </View>
            {progress && (
              <ProgressBar priority={priority} tintColor={colors.tint} />
            )}
          </View>
        )}

        {priority.unit === 'milestone' && (priority.milestoneSteps?.length ?? 0) > 0 && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressSectionLabel, { color: colors.secondaryText }]}>MILESTONES</Text>
            {(priority.milestoneSteps ?? []).map((step) => (
              <Pressable
                key={step.id}
                style={[styles.milestoneRow, { backgroundColor: colors.background, borderRadius: Layout.borderRadius.sm }]}
                onPress={() => {
                  const updated = (priority.milestoneSteps ?? []).map((s) =>
                    s.id === step.id ? { ...s, completed: !s.completed } : s
                  );
                  onUpdateProgress(priority.id, { milestoneSteps: updated });
                }}
              >
                <Ionicons
                  name={step.completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={step.completed ? colors.tint : colors.secondaryText}
                />
                <Text style={[styles.milestoneLabel, { color: step.completed ? colors.secondaryText : colors.text, textDecorationLine: step.completed ? 'line-through' : 'none' }]}>
                  {step.label}
                </Text>
              </Pressable>
            ))}
            {progress && (
              <ProgressBar priority={priority} tintColor={colors.tint} />
            )}
          </View>
        )}

        <View style={styles.sheetActions}>
          <Pressable
            style={[styles.sheetActionBtn, { backgroundColor: '#34C75922' }]}
            onPress={() => {
              onClose();
              onComplete(priority.id);
              showToast('Marked complete', 'complete');
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={[styles.sheetActionText, { color: '#34C759' }]}>Mark Complete</Text>
          </Pressable>
          <Pressable
            style={[styles.sheetActionBtn, { backgroundColor: colors.destructive + '18' }]}
            onPress={() => {
              onClose();
              onDelete(priority.id);
              showToast('Priority deleted', 'delete');
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            <Text style={[styles.sheetActionText, { color: colors.destructive }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const UNIT_OPTIONS: { value: PriorityUnit | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
];

function EditPriorityModal({
  visible,
  initial,
  initialGoalId,
  initialUnit,
  initialNumberValue,
  initialNumberTarget,
  initialPercentageValue,
  initialMilestoneSteps,
  goals,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string;
  initialGoalId: string;
  initialUnit?: PriorityUnit;
  initialNumberValue?: number;
  initialNumberTarget?: number;
  initialPercentageValue?: number;
  initialMilestoneSteps?: MilestoneStep[];
  goals: { id: string; name: string; color?: string }[];
  onClose: () => void;
  onSave: (text: string, goalId: string, unit: PriorityUnit | undefined, progressData: Partial<Priority>) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState(initial);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || 'non-goal');
  const [unit, setUnit] = useState<PriorityUnit | 'none'>(initialUnit ?? 'none');
  const [numberValue, setNumberValue] = useState(String(initialNumberValue ?? 0));
  const [numberTarget, setNumberTarget] = useState(String(initialNumberTarget ?? 10));
  const [percentageValue, setPercentageValue] = useState(String(initialPercentageValue ?? 0));
  const [milestoneSteps, setMilestoneSteps] = useState<MilestoneStep[]>(initialMilestoneSteps ?? []);
  const [newStepText, setNewStepText] = useState('');

  React.useEffect(() => {
    if (visible) {
      setText(initial);
      setSelectedGoalId(initialGoalId || 'non-goal');
      setUnit(initialUnit ?? 'none');
      setNumberValue(String(initialNumberValue ?? 0));
      setNumberTarget(String(initialNumberTarget ?? 10));
      setPercentageValue(String(initialPercentageValue ?? 0));
      setMilestoneSteps(initialMilestoneSteps ?? []);
      setNewStepText('');
    }
  }, [visible, initial, initialGoalId, initialUnit, initialNumberValue, initialNumberTarget, initialPercentageValue, initialMilestoneSteps]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const resolvedUnit: PriorityUnit | undefined = unit === 'none' ? undefined : unit;
    const progressData: Partial<Priority> = {};
    if (resolvedUnit === 'number') {
      progressData.numberValue = Math.max(0, parseInt(numberValue) || 0);
      progressData.numberTarget = Math.max(1, parseInt(numberTarget) || 1);
    } else if (resolvedUnit === 'percentage') {
      progressData.percentageValue = Math.min(100, Math.max(0, parseInt(percentageValue) || 0));
    } else if (resolvedUnit === 'milestone') {
      progressData.milestoneSteps = milestoneSteps;
    }
    onSave(trimmed, selectedGoalId, resolvedUnit, progressData);
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  const addStep = () => {
    const label = newStepText.trim();
    if (!label) return;
    setMilestoneSteps((prev) => [...prev, { id: `step-${Date.now()}`, label, completed: false }]);
    setNewStepText('');
  };

  const removeStep = (id: string) => setMilestoneSteps((prev) => prev.filter((s) => s.id !== id));

  const remaining = MAX_CHARS - text.length;
  const isEditing = !!initial;
  const canSave = !!text.trim() && !!selectedGoalId;

  const goalOptions = [
    { id: 'non-goal', name: 'Non-Goal', color: undefined },
    ...goals,
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <ScrollView
          style={[styles.editSheet, { backgroundColor: colors.cardBackground }]}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Priority' : 'New Priority'}
          </Text>

          {/* Goal picker */}
          <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Link to Goal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.goalPicker}
            contentContainerStyle={styles.goalPickerContent}
          >
            {goalOptions.map((goal) => {
              const selected = selectedGoalId === goal.id;
              const accent = goal.color ?? colors.tint;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => setSelectedGoalId(goal.id)}
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: selected ? accent + '22' : colors.background,
                      borderColor: selected ? accent : colors.separator,
                    },
                  ]}
                >
                  {goal.id !== 'non-goal' && (
                    <View style={[styles.chipDot, { backgroundColor: accent }]} />
                  )}
                  <Text
                    style={[
                      styles.goalChipText,
                      { color: selected ? accent : colors.secondaryText, fontWeight: selected ? '600' : '400' },
                    ]}
                    numberOfLines={1}
                  >
                    {goal.name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={14} color={accent} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Unit picker */}
          <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Progress Tracking</Text>
          <View style={styles.unitPickerRow}>
            {UNIT_OPTIONS.map((opt) => {
              const selected = unit === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setUnit(opt.value)}
                  style={[
                    styles.unitChip,
                    {
                      backgroundColor: selected ? colors.tint + '22' : colors.background,
                      borderColor: selected ? colors.tint : colors.separator,
                    },
                  ]}
                >
                  <Text style={[styles.unitChipText, { color: selected ? colors.tint : colors.secondaryText, fontWeight: selected ? '600' : '400' }]}>
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
                  <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Current</Text>
                  <TextInput
                    style={[styles.numberField, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
                    value={numberValue}
                    onChangeText={setNumberValue}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Target</Text>
                  <TextInput
                    style={[styles.numberField, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
                    value={numberTarget}
                    onChangeText={setNumberTarget}
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
              <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Current Progress (%)</Text>
              <TextInput
                style={[styles.numberField, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
                value={percentageValue}
                onChangeText={setPercentageValue}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.secondaryText}
              />
            </View>
          )}

          {/* Milestone steps */}
          {unit === 'milestone' && (
            <View style={styles.progressInputSection}>
              <Text style={[styles.pickerLabel, { color: colors.secondaryText }]}>Steps</Text>
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
                  style={[styles.addStepInput, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
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

          {/* Text input */}
          <TextInput
            style={[
              styles.sheetInput,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.separator,
              },
            ]}
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
            placeholder="Be specific. Define an outcome."
            placeholderTextColor={colors.secondaryText}
            multiline
            maxLength={MAX_CHARS}
          />
          <Text style={[styles.charCount, { color: remaining <= 20 ? colors.destructive : colors.secondaryText }]}>
            {remaining} characters remaining
          </Text>

          <View style={styles.sheetButtons}>
            <Pressable
              onPress={handleClose}
              style={[styles.sheetBtn, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.sheetBtnText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={[
                styles.sheetBtn,
                { backgroundColor: colors.tint, opacity: canSave ? 1 : 0.4 },
              ]}
            >
              <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PrioritiesView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<PrioritiesConfig>('priorities');
  const { state } = useAppContext();
  const { toast, show } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const priorities = config?.priorities ?? [];
  const canAdd = priorities.length < MAX_PRIORITIES;
  const goals = [...state.goals].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    setEditingPriority(null);
    setModalVisible(true);
  };

  const handleEdit = (priority: Priority) => {
    setSelectedPriority(null);
    setEditingPriority(priority);
    setModalVisible(true);
  };

  const handleSave = (text: string, goalId: string, unit: PriorityUnit | undefined, progressData: Partial<Priority>) => {
    const current = config ?? DEFAULT_CONFIG;
    if (editingPriority) {
      setConfig({
        ...current,
        priorities: current.priorities.map((p) =>
          p.id === editingPriority.id
            ? { ...p, text, goalId, unit, numberValue: undefined, numberTarget: undefined, percentageValue: undefined, milestoneSteps: undefined, ...progressData }
            : p
        ),
      });
    } else {
      const newPriority: Priority = {
        id: `pri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        goalId,
        createdAt: new Date().toISOString(),
        unit,
        ...progressData,
      };
      setConfig({ ...current, priorities: [...current.priorities, newPriority] });
    }
  };

  const updateProgress = useCallback(
    (id: string, data: Partial<Priority>) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, priorities: current.priorities.map((p) => p.id === id ? { ...p, ...data } : p) });
    },
    [config, setConfig]
  );

  const removePriority = useCallback(
    (id: string) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, priorities: current.priorities.filter((p) => p.id !== id) });
    },
    [config, setConfig]
  );

  // Swipe complete — shows confirmation Alert, then toast
  const handleComplete = useCallback(
    (id: string, text: string) => {
      Alert.alert('Mark Complete', `Mark "${text.length > 60 ? text.slice(0, 60) + '…' : text}" as done?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            removePriority(id);
            show('Marked complete', 'complete');
          },
        },
      ]);
    },
    [removePriority, show]
  );

  // Swipe delete — shows confirmation Alert, then toast
  const handleDelete = useCallback(
    (id: string, text: string) => {
      Alert.alert('Delete Priority', `Delete "${text.length > 60 ? text.slice(0, 60) + '…' : text}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removePriority(id);
            show('Priority deleted', 'delete');
          },
        },
      ]);
    },
    [removePriority, show]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Priority[] }) => {
      const current = config ?? DEFAULT_CONFIG;
      setConfig({ ...current, priorities: data });
      setIsDragging(false);
    },
    [config, setConfig]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Priority>) => {
      const rank = priorities.indexOf(item) + 1;
      const linkedGoal = item.goalId && item.goalId !== 'non-goal'
        ? goals.find((g) => g.id === item.goalId) ?? null
        : null;
      return (
        <SwipeablePriorityCard
          priority={item}
          rank={rank}
          goalName={linkedGoal ? linkedGoal.name : null}
          goalColor={linkedGoal?.color}
          onComplete={handleComplete}
          onCardPress={setSelectedPriority}
          onDelete={handleDelete}
          drag={() => { setIsDragging(true); drag(); }}
          isActive={isActive}
          showHandle={isDragging}
        />
      );
    },
    [priorities, handleComplete, handleDelete, isDragging, goals]
  );

  return (
    <View style={styles.container}>
      {priorities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No priorities set</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Add up to {MAX_PRIORITIES} priorities to keep your focus clear
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={priorities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}

      {canAdd && (
        <View style={styles.fabContainer}>
          <Pressable onPress={handleAdd} style={styles.fab}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      )}

      {!canAdd && priorities.length > 0 && (
        <View style={[styles.limitMessage, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
          <Text style={[styles.limitText, { color: colors.secondaryText }]}>
            Maximum of {MAX_PRIORITIES} priorities reached. Swipe to delete one to add another.
          </Text>
        </View>
      )}

      <EditPriorityModal
        visible={modalVisible}
        initial={editingPriority?.text ?? ''}
        initialGoalId={editingPriority?.goalId ?? ''}
        initialUnit={editingPriority?.unit}
        initialNumberValue={editingPriority?.numberValue}
        initialNumberTarget={editingPriority?.numberTarget}
        initialPercentageValue={editingPriority?.percentageValue}
        initialMilestoneSteps={editingPriority?.milestoneSteps}
        goals={goals}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      {(() => {
        const p = selectedPriority ? (priorities.find((x) => x.id === selectedPriority.id) ?? selectedPriority) : null;
        const rank = p ? priorities.findIndex((x) => x.id === p.id) + 1 : 0;
        const linkedGoal = p && p.goalId && p.goalId !== 'non-goal'
          ? goals.find((g) => g.id === p.goalId) ?? null
          : null;
        return (
          <PriorityDetailSheet
            priority={p}
            rank={rank}
            goalName={linkedGoal ? linkedGoal.name : null}
            goalColor={linkedGoal?.color}
            visible={selectedPriority !== null}
            onClose={() => setSelectedPriority(null)}
            onEdit={() => handleEdit(p!)}
            onComplete={removePriority}
            onDelete={removePriority}
            onUpdateProgress={updateProgress}
            showToast={show}
          />
        );
      })()}
      <Toast
        visible={toast !== null}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'complete'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
    paddingBottom: 100,
  },
  swipeableContainer: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Layout.spacing.sm,
  },
  swipeableActive: {
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  swipeActionLeft: {
    flex: 1,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionRight: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionContent: {
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  rank: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    gap: Layout.spacing.xs,
  },
  cardText: {
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    gap: 5,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  goalBadgeText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
    maxWidth: 180,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Layout.spacing.xl,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginTop: Layout.spacing.md,
  },
  emptyMessage: {
    fontSize: Layout.fontSize.body,
    marginTop: Layout.spacing.sm,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  limitMessage: {
    flexDirection: 'row',
    margin: Layout.spacing.md,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
    alignItems: 'flex-start',
  },
  limitText: {
    flex: 1,
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
  },
  // Modal
  modalOuter: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 4,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  sheetTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sheetRank: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  editButton: {
    width: 38,
    alignItems: 'flex-end',
  },
  sheetText: {
    fontSize: Layout.fontSize.title,
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Layout.spacing.md,
  },
  sheetGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    gap: 6,
    marginBottom: Layout.spacing.lg,
  },
  sheetGoalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sheetGoalText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  sheetSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  sheetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  sheetActionText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Layout.spacing.lg,
  },
  sheetTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginBottom: Layout.spacing.md,
  },
  pickerLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
    letterSpacing: 0.3,
  },
  goalPicker: {
    marginBottom: Layout.spacing.md,
  },
  goalPickerContent: {
    gap: Layout.spacing.sm,
    paddingRight: Layout.spacing.sm,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 99,
    borderWidth: 1.5,
    gap: 6,
    maxWidth: 180,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  goalChipText: {
    fontSize: Layout.fontSize.caption,
  },
  sheetInput: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCount: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'right',
    marginTop: Layout.spacing.xs,
    marginBottom: Layout.spacing.md,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  sheetBtn: {
    flex: 1,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  sheetBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  // Detail sheet progress section
  progressSection: {
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  progressSectionLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  progressStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.lg,
  },
  stepperBtn: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  stepperBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  stepperValue: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },
  numberInput: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    minWidth: 60,
  },
  numberSeparator: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  milestoneLabel: {
    flex: 1,
    fontSize: Layout.fontSize.body,
  },
  // Modal unit picker
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
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
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
  toast: {
    position: 'absolute',
    top: Layout.spacing.md,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 10,
    borderRadius: Layout.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 999,
  },
  toastText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    flex: 1,
  },
});
