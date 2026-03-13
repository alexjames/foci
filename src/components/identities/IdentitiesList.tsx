import React, { useCallback, useState, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { IdentitiesConfig, Identity } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';

const MAX_IDENTITIES = 3;

const DEFAULT_CONFIG: IdentitiesConfig = {
  toolId: 'identities',
  identities: [],
  notificationEnabled: false,
};

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
        pointerEvents="box-none"
      >
        <Pressable style={[styles.modalCard, { backgroundColor: colors.cardBackground }]} onPress={() => {}}>
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function IdentitiesList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { config, setConfig } = useToolConfig<IdentitiesConfig>('identities');
  const identities = config?.identities ?? [];
  const swipeRefs = useRef<Map<string, SwipeableMethods | null>>(new Map());

  const [identityModal, setIdentityModal] = useState<{ identity?: Identity } | null>(null);

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

      {identities.map((identity) => (
          <Swipeable
            key={identity.id}
            ref={(r) => { swipeRefs.current.set(identity.id, r); }}
            renderRightActions={() => (
              <View style={styles.swipeDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#fff" />
                <Text style={styles.swipeDeleteText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(direction) => {
              if (direction === 'right') {
                swipeRefs.current.get(identity.id)?.close();
                deleteIdentity(identity.id, identity.title);
              }
            }}
            overshootRight={false}
          >
            <Pressable
              onPress={() => router.push(`/identity/${identity.id}` as any)}
              style={[styles.identityCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
            >
              <View style={styles.identityCardContent}>
                <Text style={[styles.identityCardTitle, { color: colors.text }]}>{identity.title}</Text>
                <Text style={[styles.identityCardCount, { color: colors.secondaryText }]}>
                  {identity.affirmations.length} affirmation{identity.affirmations.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} style={{ opacity: 0.4 }} />
            </Pressable>
          </Swipeable>
      ))}

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
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  identityCardContent: {
    flex: 1,
    gap: 2,
  },
  identityCardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  identityCardCount: {
    fontSize: Layout.fontSize.caption,
  },
  swipeDeleteAction: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: Layout.fontSize.caption,
    fontWeight: '600',
    marginTop: 2,
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
});
