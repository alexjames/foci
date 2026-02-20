import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { AffirmationsConfig, Affirmation } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { AFFIRMATION_CATEGORIES } from '@/src/constants/affirmations';

const DEFAULT_CONFIG: AffirmationsConfig = {
  toolId: 'affirmations',
  affirmations: [],
  selectedCategories: [],
  notificationEnabled: false,
};

// ─── Add / Edit Modal ────────────────────────────────────────────────────────

function AffirmationModal({
  visible,
  initial,
  isEditing,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  initial: string;
  isEditing: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
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

  const handleDelete = () => {
    Alert.alert('Delete Affirmation', 'Are you sure you want to delete this affirmation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={styles.modalKAV}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Affirmation' : 'New Affirmation'}
          </Text>
          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
            value={text}
            onChangeText={setText}
            placeholder="I am..."
            placeholderTextColor={colors.secondaryText}
            multiline
            autoFocus
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={handleSave}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.modalBtn, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalBtnText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.5 }]}
              disabled={!text.trim()}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
          {isEditing && (
            <Pressable onPress={handleDelete} style={styles.modalDeleteBtn}>
              <Text style={[styles.modalDeleteText, { color: colors.destructive }]}>Delete Affirmation</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Swipeable Card ──────────────────────────────────────────────────────────

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

function SwipeableAffirmationCard({
  item,
  onPress,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  item: Affirmation;
  onPress: (item: Affirmation) => void;
  onDelete: (id: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = React.useRef<Swipeable>(null);

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <DeleteAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') {
              swipeableRef.current?.close();
              Alert.alert('Delete Affirmation', 'Are you sure you want to delete this affirmation?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
              ]);
            }
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onPress(item)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[styles.itemText, { color: colors.text }]}>{item.text}</Text>
            {showHandle && (
              <Ionicons name="reorder-three-outline" size={20} color={colors.secondaryText} style={styles.dragHandle} />
            )}
          </Pressable>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AffirmationsList({ onPlay }: { onPlay: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<AffirmationsConfig>('affirmations');
  const [isDragging, setIsDragging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Affirmation | null>(null);

  const current = config ?? DEFAULT_CONFIG;
  const affirmations = current.affirmations;
  const selectedCategories = current.selectedCategories ?? [];

  const toggleCategory = (id: string) => {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    setConfig({ ...current, selectedCategories: next });
  };

  const handleSave = useCallback((text: string) => {
    if (editingItem) {
      setConfig({
        ...current,
        affirmations: affirmations.map((a) =>
          a.id === editingItem.id ? { ...a, text } : a
        ),
      });
    } else {
      const newAffirmation: Affirmation = {
        id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        createdAt: new Date().toISOString(),
      };
      setConfig({ ...current, affirmations: [...affirmations, newAffirmation] });
    }
  }, [editingItem, current, affirmations, setConfig]);

  const handleDelete = useCallback((id: string) => {
    setConfig({ ...current, affirmations: affirmations.filter((a) => a.id !== id) });
  }, [current, affirmations, setConfig]);

  const handleDragEnd = useCallback(({ data }: { data: Affirmation[] }) => {
    setConfig({ ...current, affirmations: data });
    setIsDragging(false);
  }, [current, setConfig]);

  const openAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEdit = (item: Affirmation) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const categoryItems = AFFIRMATION_CATEGORIES
    .filter((cat) => selectedCategories.includes(cat.id))
    .flatMap((cat) => cat.items);
  const customItems = affirmations.map((a) => a.text);
  const allItems = [...categoryItems, ...customItems];
  const canPlay = allItems.length > 0;

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Affirmation>) => (
      <SwipeableAffirmationCard
        item={item}
        onPress={openEdit}
        onDelete={handleDelete}
        drag={() => { setIsDragging(true); drag(); }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [handleDelete, isDragging]
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* My Affirmations header */}
      <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
        MY AFFIRMATIONS
      </Text>
      {affirmations.length === 0 && (
        <Text style={[styles.emptyHint, { color: colors.secondaryText }]}>
          Tap + to add personal affirmations
        </Text>
      )}
    </View>
  );

  const ListFooter = (
    <View>
      <View style={styles.listFooter}>
        <Pressable onPress={openAdd} style={[styles.addButton, { borderColor: colors.cardBorder }]}>
          <Ionicons name="add" size={20} color={colors.secondaryText} />
        </Pressable>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Select Additional Affirmations</Text>
        <View style={styles.categoriesGrid}>
          {AFFIRMATION_CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? colors.tint : colors.cardBackground,
                    borderColor: selected ? colors.tint : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.categoryChipText, { color: selected ? '#fff' : colors.text }]}>
                  {cat.label}
                </Text>
                {selected && (
                  <Ionicons name="checkmark" size={14} color="#fff" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={affirmations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.list}
        activationDistance={1}
      />

      {/* Play FAB */}
      {canPlay && (
        <View style={styles.fabRow} pointerEvents="box-none">
          <Pressable onPress={onPlay} style={[styles.fab, { backgroundColor: colors.tint }]}>
            <Ionicons name="play" size={26} color="#fff" />
          </Pressable>
        </View>
      )}

      <AffirmationModal
        visible={modalVisible}
        initial={editingItem?.text ?? ''}
        isEditing={editingItem !== null}
        onSave={handleSave}
        onDelete={() => editingItem && handleDelete(editingItem.id)}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingBottom: 100,
  },
  listHeader: {
    padding: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
    gap: Layout.spacing.sm,
  },
  sectionLabel: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Layout.spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    paddingVertical: Layout.spacing.sm,
  },

  swipeableContainer: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
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
  swipeActionContent: { alignItems: 'center', gap: 4 },
  swipeText: { color: '#fff', fontSize: Layout.fontSize.caption, fontWeight: '600' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  itemText: {
    fontSize: Layout.fontSize.body,
    flex: 1,
    fontStyle: 'italic',
  },
  dragHandle: { opacity: 0.4 },

  listFooter: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  categoriesSection: {
    padding: Layout.spacing.md,
    paddingTop: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fabRow: {
    position: 'absolute',
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
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

  // Modal
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalKAV: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
    gap: Layout.spacing.md,
  },
  modalTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  modalInput: {
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  modalDeleteBtn: {
    alignItems: 'center',
    paddingTop: Layout.spacing.sm,
  },
  modalDeleteText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});
