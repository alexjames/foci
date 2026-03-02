import React, { useCallback, useRef, useState } from 'react';
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
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Priority, PrioritiesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { useAppContext } from '@/src/context/AppContext';

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
}: {
  priority: Priority | null;
  rank: number;
  goalName: string | null;
  goalColor: string | undefined;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onComplete: (id: string, text: string) => void;
  onDelete: (id: string, text: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!priority) return null;

  const accent = goalColor ?? colors.tint;

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

        <View style={styles.sheetActions}>
          <Pressable
            style={[styles.sheetActionBtn, { backgroundColor: '#34C75922' }]}
            onPress={() => {
              onClose();
              onComplete(priority.id, priority.text);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={[styles.sheetActionText, { color: '#34C759' }]}>Mark Complete</Text>
          </Pressable>
          <Pressable
            style={[styles.sheetActionBtn, { backgroundColor: colors.destructive + '18' }]}
            onPress={() => {
              onClose();
              onDelete(priority.id, priority.text);
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

function EditPriorityModal({
  visible,
  initial,
  initialGoalId,
  goals,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string;
  initialGoalId: string;
  goals: { id: string; name: string; color?: string }[];
  onClose: () => void;
  onSave: (text: string, goalId: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState(initial);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || 'non-goal');

  React.useEffect(() => {
    if (visible) {
      setText(initial);
      setSelectedGoalId(initialGoalId || 'non-goal');
    }
  }, [visible, initial, initialGoalId]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed, selectedGoalId);
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

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
        <View style={[styles.editSheet, { backgroundColor: colors.cardBackground }]}>
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
            autoFocus
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PrioritiesView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<PrioritiesConfig>('priorities');
  const { state } = useAppContext();
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

  const handleSave = (text: string, goalId: string) => {
    const current = config ?? DEFAULT_CONFIG;
    if (editingPriority) {
      setConfig({
        ...current,
        priorities: current.priorities.map((p) =>
          p.id === editingPriority.id ? { ...p, text, goalId } : p
        ),
      });
    } else {
      const newPriority: Priority = {
        id: `pri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        goalId,
        createdAt: new Date().toISOString(),
      };
      setConfig({ ...current, priorities: [...current.priorities, newPriority] });
    }
  };

  const handleComplete = useCallback(
    (id: string, text: string) => {
      Alert.alert('Mark Complete', `Mark "${text.length > 60 ? text.slice(0, 60) + '…' : text}" as done?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, priorities: current.priorities.filter((p) => p.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
  );

  const handleDelete = useCallback(
    (id: string, text: string) => {
      Alert.alert('Delete Priority', `Delete "${text.length > 60 ? text.slice(0, 60) + '…' : text}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const current = config ?? DEFAULT_CONFIG;
            setConfig({ ...current, priorities: current.priorities.filter((p) => p.id !== id) });
          },
        },
      ]);
    },
    [config, setConfig]
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
        goals={goals}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      {(() => {
        const p = selectedPriority;
        const rank = p ? priorities.indexOf(p) + 1 : 0;
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
            onComplete={handleComplete}
            onDelete={handleDelete}
          />
        );
      })()}
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
});
