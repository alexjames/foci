import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export function AffirmationsList({ onPlay }: { onPlay: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<AffirmationsConfig>('affirmations');
  const [newText, setNewText] = useState('');

  const current = config ?? DEFAULT_CONFIG;
  const affirmations = current.affirmations;
  const selectedCategories = current.selectedCategories ?? [];

  const toggleCategory = (id: string) => {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    setConfig({ ...current, selectedCategories: next });
  };

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const newAffirmation: Affirmation = {
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setConfig({ ...current, affirmations: [...affirmations, newAffirmation] });
    setNewText('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Affirmation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setConfig({ ...current, affirmations: affirmations.filter((a) => a.id !== id) }),
      },
    ]);
  };

  const categoryItems = AFFIRMATION_CATEGORIES
    .filter((cat) => selectedCategories.includes(cat.id))
    .flatMap((cat) => cat.items);
  const customItems = affirmations.map((a) => a.text);
  const allItems = [...categoryItems, ...customItems];
  const canPlay = allItems.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {/* Categories */}
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>CATEGORIES</Text>
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

        {/* Custom affirmations */}
        <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginTop: Layout.spacing.lg }]}>
          MY AFFIRMATIONS
        </Text>
        {affirmations.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.secondaryText }]}>
            Add personal affirmations below
          </Text>
        ) : (
          affirmations.map((item) => (
            <View key={item.id} style={[styles.itemRow, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.itemText, { color: colors.text }]}>{item.text}</Text>
              <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input row */}
      <View style={[styles.inputRow, { backgroundColor: colors.cardBackground, borderTopColor: colors.separator }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
          placeholder="Add an affirmation..."
          placeholderTextColor={colors.secondaryText}
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAdd}
          style={[styles.addButton, { backgroundColor: colors.tint, opacity: newText.trim() ? 1 : 0.5 }]}
          disabled={!newText.trim()}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Play FAB */}
      {canPlay && (
        <View style={styles.fabContainer}>
          <Pressable onPress={onPlay} style={styles.fab}>
            <Ionicons name="play" size={26} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
    paddingBottom: 160,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  itemText: {
    fontSize: Layout.fontSize.body,
    flex: 1,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
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
});
