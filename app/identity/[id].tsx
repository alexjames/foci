import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActionSheetIOS,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { IdentitiesConfig, IdentityAffirmation } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { AFFIRMATION_CATEGORIES } from '@/src/constants/affirmations';

const MAX_AFFIRMATIONS = 10;

const DEFAULT_CONFIG: IdentitiesConfig = {
  toolId: 'identities',
  identities: [],
  notificationEnabled: false,
};

// ─── Affirmation Modal ────────────────────────────────────────────────────────

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
        pointerEvents="box-none"
      >
        <Pressable style={[styles.modalCard, { backgroundColor: colors.cardBackground }]} onPress={() => {}}>
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
              onTouchStart={text.trim() ? handleSave : undefined}
              style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.5 }]}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
          {isEditing && (
            <Pressable onPress={handleDelete} style={styles.modalDeleteBtn}>
              <Text style={[styles.modalDeleteText, { color: colors.destructive }]}>Delete Affirmation</Text>
            </Pressable>
          )}
        </Pressable>
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
        <View style={[styles.browserHeader, { borderBottomColor: colors.separator }]}>
          {selectedCategoryId ? (
            <Pressable onPress={() => { setSelectedCategoryId(null); setSelectedTexts(new Set()); }} hitSlop={8} style={styles.browserHeaderBtn}>
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
          <ScrollView contentContainerStyle={styles.browserContent}>
            {AFFIRMATION_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                style={[styles.categoryRow, { borderBottomColor: colors.separator }]}
              >
                <Text style={[styles.categoryRowLabel, { color: colors.text }]}>{cat.label}</Text>
                <Text style={[styles.categoryRowCount, { color: colors.secondaryText }]}>{cat.items.length}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
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
                    <Text style={[styles.affirmationRowText, { color: alreadyAdded ? colors.secondaryText : colors.text }]}>
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
                <Pressable onPress={handleAdd} style={[styles.addBar, { backgroundColor: colors.tint }]}>
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

// ─── Swipeable Affirmation Row ────────────────────────────────────────────────

function SwipeableAffirmationRow({
  item,
  onPress,
  onDelete,
}: {
  item: IdentityAffirmation;
  onPress: (item: IdentityAffirmation) => void;
  onDelete: (id: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = React.useRef<Swipeable>(null);

  return (
    <View style={[styles.swipeableContainer, { overflow: 'hidden' }]}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={() => (
          <View style={styles.swipeActionRight}>
            <View style={styles.swipeActionContent}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.swipeText}>Delete</Text>
            </View>
          </View>
        )}
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
      >
        <Pressable
          onPress={() => onPress(item)}
          style={[styles.affItemRow, { backgroundColor: colors.cardBackground }]}
        >
          <Text style={[styles.affItemText, { color: colors.text }]}>{item.text}</Text>
        </Pressable>
      </Swipeable>
    </View>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: string;
  onSave: (title: string) => void;
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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={styles.modalKAV}
        pointerEvents="box-none"
      >
        <Pressable style={[styles.modalCard, { backgroundColor: colors.cardBackground }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Identity</Text>
          <TextInput
            style={[styles.modalInputSingle, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
            value={text}
            onChangeText={setText}
            placeholder="e.g. The Athlete"
            placeholderTextColor={colors.secondaryText}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.modalBtn, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalBtnText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onTouchStart={text.trim() ? handleSave : undefined}
              style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.5 }]}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IdentityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<IdentitiesConfig>('identities');
  const identities = config?.identities ?? [];
  const identity = identities.find((i) => i.id === id);

  const [renameModal, setRenameModal] = useState(false);
  const [affModal, setAffModal] = useState<{ affirmation?: IdentityAffirmation } | null>(null);
  const [choiceModal, setChoiceModal] = useState(false);
  const [browserModal, setBrowserModal] = useState(false);

  const renameIdentity = useCallback((title: string) => {
    setConfig({
      ...(config ?? DEFAULT_CONFIG),
      identities: identities.map((i) => i.id === id ? { ...i, title } : i),
    });
  }, [config, identities, id, setConfig]);

  const deleteIdentityAndGoBack = useCallback(() => {
    if (!identity) return;
    Alert.alert('Delete Identity', `Delete "${identity.title}" and all its affirmations?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setConfig({
          ...(config ?? DEFAULT_CONFIG),
          identities: identities.filter((i) => i.id !== id),
        });
        router.back();
      }},
    ]);
  }, [config, identities, id, identity, setConfig, router]);

  const updateIdentity = useCallback((updater: (affs: IdentityAffirmation[]) => IdentityAffirmation[]) => {
    setConfig({
      ...(config ?? DEFAULT_CONFIG),
      identities: identities.map((i) =>
        i.id === id ? { ...i, affirmations: updater(i.affirmations) } : i
      ),
    });
  }, [config, identities, id, setConfig]);

  const addAffirmation = useCallback((text: string) => {
    const aff: IdentityAffirmation = {
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    updateIdentity((affs) => [...affs, aff]);
  }, [updateIdentity]);

  const addAffirmations = useCallback((texts: string[]) => {
    const newAffs: IdentityAffirmation[] = texts.map((text) => ({
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    }));
    updateIdentity((affs) => [...affs, ...newAffs]);
  }, [updateIdentity]);

  const editAffirmation = useCallback((affId: string, text: string) => {
    updateIdentity((affs) => affs.map((a) => a.id === affId ? { ...a, text } : a));
  }, [updateIdentity]);

  const deleteAffirmation = useCallback((affId: string) => {
    updateIdentity((affs) => affs.filter((a) => a.id !== affId));
  }, [updateIdentity]);

  if (!identity) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Identity</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const affirmations = identity.affirmations;
  const canAddMore = affirmations.length < MAX_AFFIRMATIONS;
  const existingTexts = new Set(affirmations.map((a) => a.text));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{identity.title}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (Platform.OS === 'ios') {
              ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', 'Rename', 'Delete'], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
                (idx) => {
                  if (idx === 1) setRenameModal(true);
                  if (idx === 2) deleteIdentityAndGoBack();
                }
              );
            } else {
              Alert.alert(identity.title, undefined, [
                { text: 'Rename', onPress: () => setRenameModal(true) },
                { text: 'Delete', style: 'destructive', onPress: deleteIdentityAndGoBack },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.tint} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>Affirmations</Text>
        {affirmations.length === 0 && (
          <Text style={[styles.emptyHint, { color: colors.secondaryText }]}>
            No affirmations yet — tap + to add one.
          </Text>
        )}

        {affirmations.map((aff) => (
          <SwipeableAffirmationRow
            key={aff.id}
            item={aff}
            onPress={(item) => setAffModal({ affirmation: item })}
            onDelete={deleteAffirmation}
          />
        ))}

        {canAddMore && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setChoiceModal(true);
            }}
            style={[styles.addAffBtn, { borderColor: colors.tint, backgroundColor: colors.tint + '10' }]}
          >
            <Ionicons name="add" size={20} color={colors.tint} />
            <Text style={[styles.addAffBtnText, { color: colors.tint }]}>Add affirmation</Text>
          </Pressable>
        )}
        {!canAddMore && (
          <Text style={[styles.maxHint, { color: colors.secondaryText }]}>
            Maximum {MAX_AFFIRMATIONS} affirmations reached.
          </Text>
        )}
      </ScrollView>

      <AffirmationModal
        visible={affModal !== null}
        initial={affModal?.affirmation?.text ?? ''}
        isEditing={affModal?.affirmation !== undefined}
        onSave={(text) => {
          if (affModal?.affirmation) {
            editAffirmation(affModal.affirmation.id, text);
          } else {
            addAffirmation(text);
          }
        }}
        onDelete={() => {
          if (affModal?.affirmation) deleteAffirmation(affModal.affirmation.id);
        }}
        onClose={() => setAffModal(null)}
      />

      <AddChoiceSheet
        visible={choiceModal}
        onWriteOwn={() => { setChoiceModal(false); setTimeout(() => setAffModal({}), 50); }}
        onBrowseCategories={() => { setChoiceModal(false); setTimeout(() => setBrowserModal(true), 50); }}
        onClose={() => setChoiceModal(false)}
      />

      <CategoryBrowserModal
        visible={browserModal}
        existingTexts={existingTexts}
        onAdd={addAffirmations}
        onClose={() => setBrowserModal(false)}
      />

      <RenameModal
        visible={renameModal}
        initial={identity.title}
        onSave={renameIdentity}
        onClose={() => setRenameModal(false)}
      />
    </SafeAreaView>
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
  headerTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
  },
  content: {
    paddingTop: Layout.spacing.md,
    paddingBottom: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Layout.spacing.md,
    paddingBottom: Layout.spacing.xs,
  },
  emptyHint: {
    fontSize: Layout.fontSize.caption,
    fontStyle: 'italic',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  swipeableContainer: {
    marginHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
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
  affItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  affItemText: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  addAffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
  },
  addAffBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  maxHint: {
    fontSize: Layout.fontSize.caption,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalKAV: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
  modalInputSingle: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
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
  modalBtnPrimary: { borderWidth: 0 },
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
  choiceSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceTextCol: { flex: 1 },
  choiceLabel: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  choiceDesc: { fontSize: Layout.fontSize.caption, marginTop: 2 },
  choiceCancelBtn: { alignItems: 'center', paddingVertical: Layout.spacing.md },
  choiceCancelText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  browserSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
  browserHeaderBtn: { width: 40, alignItems: 'center' },
  browserHeaderTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  browserContent: { paddingBottom: Layout.spacing.xl },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Layout.spacing.sm,
  },
  categoryRowLabel: { fontSize: Layout.fontSize.body, fontWeight: '500', flex: 1 },
  categoryRowCount: { fontSize: Layout.fontSize.caption },
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
  affirmationRowDimmed: { opacity: 0.5 },
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
  addBarText: { color: '#fff', fontSize: Layout.fontSize.body, fontWeight: '600' },
});
