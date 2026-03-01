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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { List } from '@/src/types';
import { useLists } from '@/src/hooks/useLists';
import { ListDetailView } from './ListDetailView';

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

function SwipeableListCard({
  list,
  onPress,
  onDelete,
  drag,
  isActive,
  showHandle,
}: {
  list: List;
  onPress: (list: List) => void;
  onDelete: (id: string, title: string) => void;
  drag: () => void;
  isActive: boolean;
  showHandle: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<Swipeable>(null);
  const pendingCount = list.items.filter((i) => !i.checked).length;
  const totalCount = list.items.length;

  return (
    <ScaleDecorator>
      <View style={[styles.swipeableContainer, isActive && styles.swipeableActive]}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={() => <DeleteAction />}
          onSwipeableOpen={(direction) => {
            if (direction === 'right') {
              swipeableRef.current?.close();
              onDelete(list.id, list.title);
            }
          }}
          overshootRight={false}
          enabled={!isActive}
        >
          <Pressable
            onPress={() => onPress(list)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[styles.card, { backgroundColor: colors.cardBackground }]}
          >
            <Ionicons name="list-outline" size={22} color={colors.tint} style={styles.cardIcon} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {list.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                {totalCount === 0
                  ? 'No items'
                  : pendingCount === 0
                  ? `${totalCount} item${totalCount !== 1 ? 's' : ''} — all done`
                  : `${pendingCount} remaining`}
              </Text>
            </View>
            {showHandle && (
              <Ionicons
                name="reorder-three-outline"
                size={20}
                color={colors.secondaryText}
                style={{ opacity: 0.4 }}
              />
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} style={{ opacity: 0.4 }} />
          </Pressable>
        </Swipeable>
      </View>
    </ScaleDecorator>
  );
}

function AddListModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [text, setText] = useState('');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>New List</Text>
          <TextInput
            style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.separator }]}
            value={text}
            onChangeText={setText}
            placeholder="List name"
            placeholderTextColor={colors.secondaryText}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={styles.sheetButtons}>
            <Pressable onPress={handleClose} style={[styles.sheetBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.sheetBtnText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={!text.trim()}
              style={[styles.sheetBtn, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.4 }]}
            >
              <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Add</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ListsView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { lists, addList, deleteList, reorderLists } = useLists();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete List', `Delete "${title}" and all its items?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteList(id),
        },
      ]);
    },
    [deleteList]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: List[] }) => {
      reorderLists(data);
      setIsDragging(false);
    },
    [reorderLists]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<List>) => (
      <SwipeableListCard
        list={item}
        onPress={setSelectedList}
        onDelete={handleDelete}
        drag={() => {
          setIsDragging(true);
          drag();
        }}
        isActive={isActive}
        showHandle={isDragging}
      />
    ),
    [handleDelete, isDragging]
  );

  if (selectedList) {
    // Find the current version from lists (it may have been updated)
    const currentList = lists.find((l) => l.id === selectedList.id) ?? selectedList;
    return (
      <ListDetailView
        list={currentList}
        onBack={() => setSelectedList(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No lists yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
            Tap + to create your first list
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          activationDistance={1}
        />
      )}

      <View style={styles.fabContainer}>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.fab}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>

      <AddListModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addList}
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
  cardIcon: {
    width: 24,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  emptyState: {
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
  // Add modal
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
