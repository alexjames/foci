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
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { IdentitiesConfig, Identity, IdentityAffirmation } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { AFFIRMATION_CATEGORIES } from '@/src/constants/affirmations';

const MAX_IDENTITIES = 3;
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

// ─── Identity Name Modal ──────────────────────────────────────────────────────

function IdentityNameModal({
  visible,
  initial,
  isEditing,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: string;
  isEditing: boolean;
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
      >
        <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isEditing ? 'Rename Identity' : 'New Identity'}
          </Text>
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
              onPress={handleSave}
              style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.tint, opacity: text.trim() ? 1 : 0.5 }]}
              disabled={!text.trim()}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
            </Pressable>
          </View>
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
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} style={{ opacity: 0.4 }} />
        </Pressable>
      </Swipeable>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function IdentitiesList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<IdentitiesConfig>('identities');
  const identities = config?.identities ?? [];

  // Modal state
  const [affModal, setAffModal] = useState<{ identityId: string; affirmation?: IdentityAffirmation } | null>(null);
  const [choiceModal, setChoiceModal] = useState<string | null>(null); // identityId
  const [browserModal, setBrowserModal] = useState<string | null>(null); // identityId
  const [identityModal, setIdentityModal] = useState<{ identity?: Identity } | null>(null);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const addIdentity = useCallback((title: string) => {
    const newIdentity: Identity = {
      id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      affirmations: [],
      createdAt: new Date().toISOString(),
    };
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: [...identities, newIdentity] });
  }, [config, identities, setConfig]);

  const renameIdentity = useCallback((id: string, title: string) => {
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.map(i => i.id === id ? { ...i, title } : i) });
  }, [config, identities, setConfig]);

  const deleteIdentity = useCallback((id: string, title: string) => {
    Alert.alert('Delete Identity', `Delete "${title}" and all its affirmations?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.filter(i => i.id !== id) });
      }},
    ]);
  }, [config, identities, setConfig]);

  const addAffirmation = useCallback((identityId: string, text: string) => {
    const aff: IdentityAffirmation = {
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    };
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.map(i =>
      i.id === identityId ? { ...i, affirmations: [...i.affirmations, aff] } : i
    )});
  }, [config, identities, setConfig]);

  const addAffirmations = useCallback((identityId: string, texts: string[]) => {
    const newAffs: IdentityAffirmation[] = texts.map(text => ({
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      createdAt: new Date().toISOString(),
    }));
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.map(i =>
      i.id === identityId ? { ...i, affirmations: [...i.affirmations, ...newAffs] } : i
    )});
  }, [config, identities, setConfig]);

  const editAffirmation = useCallback((identityId: string, affId: string, text: string) => {
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.map(i =>
      i.id === identityId
        ? { ...i, affirmations: i.affirmations.map(a => a.id === affId ? { ...a, text } : a) }
        : i
    )});
  }, [config, identities, setConfig]);

  const deleteAffirmation = useCallback((identityId: string, affId: string) => {
    setConfig({ ...(config ?? DEFAULT_CONFIG), identities: identities.map(i =>
      i.id === identityId
        ? { ...i, affirmations: i.affirmations.filter(a => a.id !== affId) }
        : i
    )});
  }, [config, identities, setConfig]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {identities.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.secondaryText} style={{ opacity: 0.4, marginBottom: Layout.spacing.md }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Identities Yet</Text>
          <Text style={[styles.emptyHint, { color: colors.secondaryText }]}>
            Tap the button below to define who you are.
          </Text>
        </View>
      )}

      {identities.map((identity) => {
        const existingTexts = new Set(identity.affirmations.map(a => a.text));
        const canAddMore = identity.affirmations.length < MAX_AFFIRMATIONS;

        return (
          <View key={identity.id} style={styles.identitySection}>
            {/* Identity header */}
            <View style={[styles.identityHeader, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.identityTitle, { color: colors.text }]}>{identity.title}</Text>
              <Pressable
                onPress={() => setIdentityModal({ identity })}
                hitSlop={8}
                style={styles.headerIconBtn}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.secondaryText} />
              </Pressable>
              <Pressable
                onPress={() => deleteIdentity(identity.id, identity.title)}
                hitSlop={8}
                style={styles.headerIconBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
              </Pressable>
            </View>

            {/* Affirmations */}
            {identity.affirmations.length === 0 && (
              <Text style={[styles.affEmptyHint, { color: colors.secondaryText }]}>
                No affirmations yet — tap + to add one.
              </Text>
            )}
            {identity.affirmations.map((aff) => (
              <SwipeableAffirmationRow
                key={aff.id}
                item={aff}
                onPress={(item) => setAffModal({ identityId: identity.id, affirmation: item })}
                onDelete={(affId) => deleteAffirmation(identity.id, affId)}
              />
            ))}

            {/* Add affirmation button */}
            {canAddMore && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setChoiceModal(identity.id);
                }}
                style={[styles.addAffBtn, { borderColor: colors.cardBorder }]}
              >
                <Ionicons name="add" size={16} color={colors.secondaryText} />
                <Text style={[styles.addAffBtnText, { color: colors.secondaryText }]}>Add affirmation</Text>
              </Pressable>
            )}
            {!canAddMore && (
              <Text style={[styles.maxHint, { color: colors.secondaryText }]}>
                Maximum {MAX_AFFIRMATIONS} affirmations reached.
              </Text>
            )}
          </View>
        );
      })}

      {/* Add Identity button */}
      {identities.length < MAX_IDENTITIES && (
        <Pressable
          onPress={() => setIdentityModal({})}
          style={[styles.addIdentityBtn, { borderColor: colors.tint, backgroundColor: colors.tint + '10' }]}
        >
          <Ionicons name="add" size={20} color={colors.tint} />
          <Text style={[styles.addIdentityBtnText, { color: colors.tint }]}>Add Identity</Text>
        </Pressable>
      )}
      {identities.length >= MAX_IDENTITIES && (
        <Text style={[styles.maxHint, { color: colors.secondaryText, textAlign: 'center', marginTop: Layout.spacing.md }]}>
          Maximum {MAX_IDENTITIES} identities reached.
        </Text>
      )}

      {/* Affirmation modal (add / edit) */}
      <AffirmationModal
        visible={affModal !== null}
        initial={affModal?.affirmation?.text ?? ''}
        isEditing={affModal?.affirmation !== undefined}
        onSave={(text) => {
          if (!affModal) return;
          if (affModal.affirmation) {
            editAffirmation(affModal.identityId, affModal.affirmation.id, text);
          } else {
            addAffirmation(affModal.identityId, text);
          }
        }}
        onDelete={() => {
          if (affModal?.affirmation) deleteAffirmation(affModal.identityId, affModal.affirmation.id);
        }}
        onClose={() => setAffModal(null)}
      />

      {/* Add choice sheet */}
      <AddChoiceSheet
        visible={choiceModal !== null}
        onWriteOwn={() => {
          const id = choiceModal!;
          setChoiceModal(null);
          setTimeout(() => setAffModal({ identityId: id }), 50);
        }}
        onBrowseCategories={() => {
          const id = choiceModal!;
          setChoiceModal(null);
          setTimeout(() => setBrowserModal(id), 50);
        }}
        onClose={() => setChoiceModal(null)}
      />

      {/* Category browser */}
      <CategoryBrowserModal
        visible={browserModal !== null}
        existingTexts={browserModal ? new Set(identities.find(i => i.id === browserModal)?.affirmations.map(a => a.text) ?? []) : new Set()}
        onAdd={(texts) => { if (browserModal) addAffirmations(browserModal, texts); }}
        onClose={() => setBrowserModal(null)}
      />

      {/* Identity name modal */}
      <IdentityNameModal
        visible={identityModal !== null}
        initial={identityModal?.identity?.title ?? ''}
        isEditing={identityModal?.identity !== undefined}
        onSave={(title) => {
          if (!identityModal) return;
          if (identityModal.identity) {
            renameIdentity(identityModal.identity.id, title);
          } else {
            addIdentity(title);
          }
        }}
        onClose={() => setIdentityModal(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingVertical: Layout.spacing.md,
    paddingBottom: 60,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xxl,
    paddingHorizontal: Layout.spacing.xl,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  emptyHint: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  identitySection: {
    marginBottom: Layout.spacing.lg,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Layout.spacing.sm,
  },
  identityTitle: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerIconBtn: {
    padding: 4,
  },

  affEmptyHint: {
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
    gap: Layout.spacing.xs,
    marginHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  addAffBtnText: {
    fontSize: Layout.fontSize.caption,
    fontWeight: '500',
  },
  maxHint: {
    fontSize: Layout.fontSize.caption,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
  },

  addIdentityBtn: {
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
  addIdentityBtnText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
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
