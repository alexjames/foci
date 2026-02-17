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

export function AffirmationsList() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<AffirmationsConfig>('affirmations');
  const [newText, setNewText] = useState('');

  const affirmations = config?.affirmations ?? [];

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const newAffirmation: Affirmation = {
      id: `aff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setConfig({
      ...(config ?? { toolId: 'affirmations', notificationEnabled: false, affirmations: [] }),
      affirmations: [...affirmations, newAffirmation],
    });
    setNewText('');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Affirmation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({
            ...config!,
            affirmations: affirmations.filter((a) => a.id !== id),
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {affirmations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No affirmations yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.secondaryText }]}>
              Add positive statements to remind yourself
            </Text>
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
    flexGrow: 1,
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
});
