import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { List, ListItem } from '@/src/types';
import { useLists } from '@/src/hooks/useLists';

function RenameListModal({
  visible,
  currentTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  currentTitle: string;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState(currentTitle);

  React.useEffect(() => {
    if (visible) setText(currentTitle);
  }, [visible, currentTitle]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Rename List</Text>
          <TextInput
            style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.separator }]}
            value={text}
            onChangeText={setText}
            placeholder="List name"
            placeholderTextColor={colors.secondaryText}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.sheetButtons}>
            <Pressable onPress={onClose} style={[styles.sheetBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.sheetBtnText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!text.trim()}
              style={[styles.sheetBtn, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.4 }]}
            >
              <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DeleteItemAction() {
  return (
    <View style={styles.swipeActionRight}>
      <View style={styles.swipeActionContent}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.swipeText}>Delete</Text>
      </View>
    </View>
  );
}

function AddToTodayAction({ isLinked }: { isLinked: boolean }) {
  return (
    <View style={[styles.swipeActionLeft, isLinked && styles.swipeActionLinked]}>
      <View style={styles.swipeActionContent}>
        <Ionicons
          name={isLinked ? 'checkmark-circle' : 'calendar-outline'}
          size={20}
          color="#fff"
        />
        <Text style={styles.swipeText}>{isLinked ? 'Added' : 'Add to Today'}</Text>
      </View>
    </View>
  );
}

function SwipeableItemCard({
  item,
  listId,
  onToggle,
  onEdit,
  onDelete,
  onAddToToday,
  drag,
  isActive,
  showHandle,
}: {
  item: ListItem;
  listId: string;
  onToggle: (itemId: string) => void;
  onEdit: (item: ListItem, newText: string) => void;
  onDelete: (itemId: string) => void;
  onAddToToday: (itemId: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<Swipeable>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const isLinked = !!item.linkedChecklistId;

  const handleEditBlur = () => {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(item, trimmed);
    } else {
      setEditText(item.text);
    }
  };

  return (
    <ScaleDecorator>
      <View style={[styles.itemSwipeContainer, isActive && styles.itemSwipeActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <DeleteItemAction />}
          renderLeftActions={() => <AddToTodayAction isLinked={isLinked} />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') {
              swipeableRef.current?.close();
              onDelete(item.id);
            } else {
              swipeableRef.current?.close();
              if (!isLinked) onAddToToday(item.id);
            }
          }}
          overshootRight={false}
          overshootLeft={false}
          enabled={!isActive}
        >
          <Pressable
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.itemCard, { backgroundColor: colors.cardBackground }]}
          >
            {/* Checkbox */}
            <Pressable onPress={() => onToggle(item.id)} hitSlop={8} style={styles.checkbox}>
              <Ionicons
                name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.checked ? colors.tint : colors.secondaryText}
              />
            </Pressable>

            {/* Text */}
            {editing ? (
              <TextInput
                style={[styles.itemEditInput, { color: colors.text }]}
                value={editText}
                onChangeText={setEditText}
                onBlur={handleEditBlur}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleEditBlur}
              />
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => { setEditText(item.text); setEditing(true); }}>
                <Text
                  style={[
                    styles.itemText,
                    { color: item.checked ? colors.secondaryText : colors.text },
                    item.checked && styles.itemTextStrikethrough,
                  ]}
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
              </Pressable>
            )}

            {showHandle && !item.checked && (
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

function CompletedItemRow({
  item,
  listId,
  onToggle,
  onDelete,
}: {
  item: ListItem;
  listId: string;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<Swipeable>(null);

  return (
    <View style={styles.itemSwipeContainer}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={() => <DeleteItemAction />}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            swipeableRef.current?.close();
            onDelete(item.id);
          }
        }}
        overshootRight={false}
      >
        <Pressable
          style={[styles.itemCard, { backgroundColor: colors.cardBackground }]}
        >
          <Pressable onPress={() => onToggle(item.id)} hitSlop={8} style={styles.checkbox}>
            <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
          </Pressable>
          <Text
            style={[styles.itemText, styles.itemTextStrikethrough, { color: colors.secondaryText, flex: 1 }]}
            numberOfLines={2}
          >
            {item.text}
          </Text>
        </Pressable>
      </Swipeable>
    </View>
  );
}

function QuickAddRow({
  listId,
  onAdd,
}: {
  listId: string;
  onAdd: (text: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
  };

  return (
    <View style={[styles.quickAddRow, { backgroundColor: colors.cardBackground }]}>
      <Pressable onPress={handleSubmit} hitSlop={8}>
        <Ionicons name="add-circle-outline" size={24} color={colors.tint} />
      </Pressable>
      <TextInput
        style={[styles.quickAddInput, { color: colors.text }]}
        value={text}
        onChangeText={setText}
        placeholder="Quick add item…"
        placeholderTextColor={colors.secondaryText}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={handleSubmit}
      />
    </View>
  );
}

export function ListDetailView({
  list,
  onBack,
}: {
  list: List;
  onBack: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { addItem, updateItem, deleteItem, reorderItems, toggleItem, addItemToToday, updateListTitle } = useLists();
  const [showRename, setShowRename] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const pendingItems = list.items.filter((i) => !i.checked);
  const completedItems = list.items.filter((i) => i.checked);

  const handleToggle = useCallback(
    (itemId: string) => {
      toggleItem(list.id, itemId);
    },
    [list.id, toggleItem]
  );

  const handleEdit = useCallback(
    (item: ListItem, newText: string) => {
      updateItem(list.id, { ...item, text: newText });
    },
    [list.id, updateItem]
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      Alert.alert('Delete Item', 'Remove this item from the list?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteItem(list.id, itemId),
        },
      ]);
    },
    [list.id, deleteItem]
  );

  const handleAddToToday = useCallback(
    (itemId: string) => {
      addItemToToday(list.id, itemId);
    },
    [list.id, addItemToToday]
  );

  const handleQuickAdd = useCallback(
    (text: string) => {
      addItem(list.id, text);
    },
    [list.id, addItem]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: ListItem[] }) => {
      // data contains only pending items; merge back with completed items in their positions
      reorderItems(list.id, [...data, ...completedItems]);
      setIsDragging(false);
    },
    [list.id, completedItems, reorderItems]
  );

  const renderPendingItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ListItem>) => (
      <SwipeableItemCard
        item={item}
        listId={list.id}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddToToday={handleAddToToday}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [list.id, handleToggle, handleEdit, handleDelete, handleAddToToday, isDragging]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Pressable onPress={() => setShowRename(true)} style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {list.title}
          </Text>
          <Ionicons name="pencil-outline" size={16} color={colors.secondaryText} style={{ marginLeft: 6, opacity: 0.6 }} />
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      {/* Pending items (DraggableFlatList) + completed section */}
      <DraggableFlatList
        data={pendingItems}
        keyExtractor={(item) => item.id}
        renderItem={renderPendingItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
        activationDistance={1}
        ListFooterComponent={
          <>
            {/* Quick add */}
            <QuickAddRow listId={list.id} onAdd={handleQuickAdd} />

            {/* Completed section */}
            {completedItems.length > 0 && (
              <View style={styles.completedSection}>
                <Pressable
                  onPress={() => setCompletedExpanded((v) => !v)}
                  style={styles.completedHeader}
                >
                  <Ionicons
                    name={completedExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={colors.secondaryText}
                  />
                  <Text style={[styles.completedHeaderText, { color: colors.secondaryText }]}>
                    Completed ({completedItems.length})
                  </Text>
                </Pressable>

                {completedExpanded &&
                  completedItems.map((item) => (
                    <CompletedItemRow
                      key={item.id}
                      item={item}
                      listId={list.id}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
              </View>
            )}
          </>
        }
      />

      <RenameListModal
        visible={showRename}
        currentTitle={list.title}
        onClose={() => setShowRename(false)}
        onSave={(title) => updateListTitle(list.id, title)}
      />
    </View>
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
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Layout.spacing.sm,
  },
  headerTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    flexShrink: 1,
  },
  listContent: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
    gap: Layout.spacing.sm,
  },
  itemSwipeContainer: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Layout.spacing.sm,
  },
  itemSwipeActive: {
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
  swipeActionLeft: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  swipeActionLinked: {
    backgroundColor: '#34C759',
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    gap: Layout.spacing.md,
    minHeight: 52,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
  },
  itemTextStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  itemEditInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    padding: 0,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.md,
    minHeight: 52,
  },
  quickAddInput: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    padding: 0,
  },
  completedSection: {
    marginTop: Layout.spacing.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.sm,
  },
  completedHeaderText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
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
