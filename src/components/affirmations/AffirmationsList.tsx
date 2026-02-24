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
  ScrollView,
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

// ─── Write-my-own Modal ───────────────────────────────────────────────────────

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

// ─── Add Choice Sheet ─────────────────────────────────────────────────────────

function AddChoiceSheet({
  visible,
  onWriteOwn,
  onBrowseCategories,
  onClose,
}: {
  visible: boolean;
  onWriteOwn: () => void;
  onBrowseCategories: () => void;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalCard, styles.choiceSheet, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Affirmation</Text>
        <Pressable
          onPress={() => { onClose(); setTimeout(onWriteOwn, 50); }}
          style={[styles.choiceRow, { borderColor: colors.cardBorder }]}
        >
          <View style={[styles.choiceIcon, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="create-outline" size={22} color={colors.tint} />
          </View>
          <View style={styles.choiceTextCol}>
            <Text style={[styles.choiceLabel, { color: colors.text }]}>Write my own</Text>
            <Text style={[styles.choiceDesc, { color: colors.secondaryText }]}>Add a personal affirmation</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
        </Pressable>
        <Pressable
          onPress={() => { onClose(); setTimeout(onBrowseCategories, 50); }}
          style={[styles.choiceRow, { borderColor: colors.cardBorder }]}
        >
          <View style={[styles.choiceIcon, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="list-outline" size={22} color={colors.tint} />
          </View>
          <View style={styles.choiceTextCol}>
            <Text style={[styles.choiceLabel, { color: colors.text }]}>Browse categories</Text>
            <Text style={[styles.choiceDesc, { color: colors.secondaryText }]}>Pick from curated quotes</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
        </Pressable>
        <Pressable onPress={onClose} style={styles.choiceCancelBtn}>
          <Text style={[styles.choiceCancelText, { color: colors.secondaryText }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Category Browser Modal ───────────────────────────────────────────────────

function CategoryBrowserModal({
  visible,
  existingTexts,
  onAdd,
  onClose,
}: {
  visible: boolean;
  existingTexts: Set<string>;
  onAdd: (texts: string[]) => void;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTexts, setSelectedTexts] = useState<Set<string>>(new Set());

  const selectedCategory = AFFIRMATION_CATEGORIES.find((c) => c.id === selectedCategoryId);

  const handleClose = () => {
    setSelectedCategoryId(null);
    setSelectedTexts(new Set());
    onClose();
  };

  const handleBack = () => {
    setSelectedCategoryId(null);
    setSelectedTexts(new Set());
  };

  const toggleText = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTexts((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  };

  const handleAdd = () => {
    const texts = Array.from(selectedTexts);
    if (texts.length === 0) return;
    onAdd(texts);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.modalBackdrop} onPress={handleClose} />
      <View style={[styles.browserSheet, { backgroundColor: colors.cardBackground }]}>
        {/* Header */}
        <View style={[styles.browserHeader, { borderBottomColor: colors.separator }]}>
          {selectedCategoryId ? (
            <Pressable onPress={handleBack} hitSlop={8} style={styles.browserHeaderBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.tint} />
            </Pressable>
          ) : (
            <View style={styles.browserHeaderBtn} />
          )}
          <Text style={[styles.browserHeaderTitle, { color: colors.text }]}>
            {selectedCategory ? selectedCategory.label : 'Categories'}
          </Text>
          <Pressable onPress={handleClose} hitSlop={8} style={styles.browserHeaderBtn}>
            <Ionicons name="close" size={22} color={colors.secondaryText} />
          </Pressable>
        </View>

        {!selectedCategoryId ? (
          // Category list
          <ScrollView contentContainerStyle={styles.browserContent}>
            {AFFIRMATION_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                style={[styles.categoryRow, { borderBottomColor: colors.separator }]}
              >
                <Text style={[styles.categoryRowLabel, { color: colors.text }]}>{cat.label}</Text>
                <Text style={[styles.categoryRowCount, { color: colors.secondaryText }]}>
                  {cat.items.length}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          // Affirmation list for selected category
          <>
            <ScrollView contentContainerStyle={styles.browserContent}>
              {selectedCategory!.items.map((text) => {
                const alreadyAdded = existingTexts.has(text);
                const selected = selectedTexts.has(text);
                return (
                  <Pressable
                    key={text}
                    onPress={() => !alreadyAdded && toggleText(text)}
                    style={[
                      styles.affirmationRow,
                      { borderBottomColor: colors.separator },
                      alreadyAdded && styles.affirmationRowDimmed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.affirmationRowText,
                        { color: alreadyAdded ? colors.secondaryText : colors.text },
                      ]}
                    >
                      {text}
                    </Text>
                    {alreadyAdded ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.secondaryText} />
                    ) : selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color={colors.secondaryText} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedTexts.size > 0 && (
              <View style={[styles.addBarContainer, { borderTopColor: colors.separator, backgroundColor: colors.cardBackground }]}>
                <Pressable
                  onPress={handleAdd}
                  style={[styles.addBar, { backgroundColor: colors.tint }]}
                >
                  <Text style={styles.addBarText}>
                    Add {selectedTexts.size} Affirmation{selectedTexts.size !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
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
  const [showChoice, setShowChoice] = useState(false);
  const [showWriteOwn, setShowWriteOwn] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [editingItem, setEditingItem] = useState<Affirmation | null>(null);

  const current = config ?? DEFAULT_CONFIG;
  const affirmations = current.affirmations;

  const existingTexts = React.useMemo(
    () => new Set(affirmations.map((a) => a.text)),
    [affirmations]
  );

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

  const handleAddFromCategory = useCallback((texts: string[]) => {
    const newItems: Affirmation[] = texts.map((text) => ({
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${Math.random().toString(36).slice(2, 5)}`,
      text,
      createdAt: new Date().toISOString(),
    }));
    setConfig({ ...current, affirmations: [...affirmations, ...newItems] });
  }, [current, affirmations, setConfig]);

  const handleDelete = useCallback((id: string) => {
    setConfig({ ...current, affirmations: affirmations.filter((a) => a.id !== id) });
  }, [current, affirmations, setConfig]);

  const handleDragEnd = useCallback(({ data }: { data: Affirmation[] }) => {
    setConfig({ ...current, affirmations: data });
    setIsDragging(false);
  }, [current, setConfig]);

  const openEdit = (item: Affirmation) => {
    setEditingItem(item);
    setShowWriteOwn(true);
  };

  const canPlay = affirmations.length > 0;

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
      <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
        MY AFFIRMATIONS
      </Text>
      {affirmations.length === 0 && (
        <Text style={[styles.emptyHint, { color: colors.secondaryText }]}>
          Tap + to add affirmations
        </Text>
      )}
    </View>
  );

  const ListFooter = (
    <View style={styles.listFooter}>
      <Pressable
        onPress={() => setShowChoice(true)}
        style={[styles.addButton, { borderColor: colors.cardBorder }]}
      >
        <Ionicons name="add" size={20} color={colors.secondaryText} />
      </Pressable>
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

      <AddChoiceSheet
        visible={showChoice}
        onWriteOwn={() => { setEditingItem(null); setShowWriteOwn(true); }}
        onBrowseCategories={() => setShowBrowser(true)}
        onClose={() => setShowChoice(false)}
      />

      <AffirmationModal
        visible={showWriteOwn}
        initial={editingItem?.text ?? ''}
        isEditing={editingItem !== null}
        onSave={handleSave}
        onDelete={() => editingItem && handleDelete(editingItem.id)}
        onClose={() => { setShowWriteOwn(false); setEditingItem(null); }}
      />

      <CategoryBrowserModal
        visible={showBrowser}
        existingTexts={existingTexts}
        onAdd={handleAddFromCategory}
        onClose={() => setShowBrowser(false)}
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

  // Modal shared
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

  // Add choice sheet
  choiceSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: Layout.spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTextCol: { flex: 1 },
  choiceLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  choiceDesc: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  choiceCancelBtn: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  choiceCancelText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },

  // Category browser
  browserSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  browserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  browserHeaderBtn: {
    width: 40,
    alignItems: 'center',
  },
  browserHeaderTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  browserContent: {
    paddingBottom: Layout.spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Layout.spacing.sm,
  },
  categoryRowLabel: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
    flex: 1,
  },
  categoryRowCount: {
    fontSize: Layout.fontSize.caption,
  },
  affirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Layout.spacing.md,
  },
  affirmationRowText: {
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 22,
  },
  affirmationRowDimmed: {
    opacity: 0.5,
  },
  addBarContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Layout.spacing.md,
    paddingBottom: Layout.spacing.xl,
  },
  addBar: {
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  addBarText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
