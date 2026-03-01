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
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Priority, PrioritiesConfig } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';

const MAX_PRIORITIES = 3;
const MAX_CHARS = 140;
const DEFAULT_CONFIG: PrioritiesConfig = { toolId: 'priorities', priorities: [] };

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
  onEdit,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  priority: Priority;
  rank: number;
  onEdit: (priority: Priority) => void;
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
          renderRightActions={() => <DeleteAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') {
              swipeableRef.current?.close();
              onDelete(priority.id, priority.text);
            }
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onEdit(priority)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.card, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[styles.rank, { color: colors.tint }]}>{rank}</Text>
            <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={3}>
              {priority.text}
            </Text>
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

function EditPriorityModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState(initial);

  React.useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  const remaining = MAX_CHARS - text.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {initial ? 'Edit Priority' : 'New Priority'}
          </Text>
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
            placeholder="What's your top priority?"
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
              disabled={!text.trim()}
              style={[
                styles.sheetBtn,
                { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.4 },
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const priorities = config?.priorities ?? [];
  const canAdd = priorities.length < MAX_PRIORITIES;

  const handleAdd = () => {
    setEditingPriority(null);
    setModalVisible(true);
  };

  const handleEdit = (priority: Priority) => {
    setEditingPriority(priority);
    setModalVisible(true);
  };

  const handleSave = (text: string) => {
    const current = config ?? DEFAULT_CONFIG;
    if (editingPriority) {
      setConfig({
        ...current,
        priorities: current.priorities.map((p) =>
          p.id === editingPriority.id ? { ...p, text } : p
        ),
      });
    } else {
      const newPriority: Priority = {
        id: `pri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        createdAt: new Date().toISOString(),
      };
      setConfig({ ...current, priorities: [...current.priorities, newPriority] });
    }
  };

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
    ({ item, index, drag, isActive }: RenderItemParams<Priority>) => (
      <SwipeablePriorityCard
        priority={item}
        rank={(index ?? 0) + 1}
        onEdit={handleEdit}
        onDelete={handleDelete}
        drag={() => { setIsDragging(true); drag(); }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [handleEdit, handleDelete, isDragging]
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
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
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
  cardText: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
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
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
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
