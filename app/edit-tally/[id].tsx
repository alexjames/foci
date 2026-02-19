import React, { useState, useMemo } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { TallyCounterConfig, TallyCounter } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { DEADLINE_COLORS } from '@/src/constants/tools';

const DEFAULT_CONFIG: TallyCounterConfig = {
  toolId: 'tally-counter',
  counters: [],
};

export default function EditTallyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<TallyCounterConfig>('tally-counter');

  const counters = config?.counters ?? [];
  const existingCounter = useMemo(
    () => (id !== 'new' ? counters.find((c) => c.id === id) : null),
    [id, counters]
  );

  const [title, setTitle] = useState(existingCounter?.title ?? '');
  const [count, setCount] = useState(existingCounter?.count?.toString() ?? '0');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(existingCounter?.color);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const parsedCount = parseInt(count, 10);
    const safeCount = isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;
    const currentConfig = config ?? DEFAULT_CONFIG;

    if (existingCounter) {
      const updated: TallyCounter = {
        ...existingCounter,
        title: trimmed,
        count: safeCount,
        color: selectedColor,
      };
      setConfig({
        ...currentConfig,
        counters: currentConfig.counters.map((c) =>
          c.id === existingCounter.id ? updated : c
        ),
      });
    } else {
      const newCounter: TallyCounter = {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        count: safeCount,
        color: selectedColor,
        createdAt: new Date().toISOString(),
      };
      setConfig({
        ...currentConfig,
        counters: [...currentConfig.counters, newCounter],
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingCounter || !config) return;
    Alert.alert('Delete Counter', `Delete "${existingCounter.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({
            ...config,
            counters: config.counters.filter((c) => c.id !== existingCounter.id),
          });
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {existingCounter ? 'Edit Counter' : 'New Counter'}
        </Text>
        <Pressable onPress={handleSave} disabled={!title.trim()}>
          <Text style={[styles.headerButton, { color: colors.tint, opacity: title.trim() ? 1 : 0.4 }]}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Name</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.cardBackground }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Counter name"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Count */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Current count
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.cardBackground }]}
          value={count}
          onChangeText={setCount}
          placeholder="0"
          placeholderTextColor={colors.secondaryText}
          keyboardType="number-pad"
        />

        {/* Color */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Color (optional)
        </Text>
        <View style={styles.colorRow}>
          <Pressable
            onPress={() => setSelectedColor(undefined)}
            style={[
              styles.colorChip,
              { backgroundColor: colors.cardBackground, borderColor: colors.separator },
              !selectedColor && { borderColor: colors.tint, borderWidth: 2 },
            ]}
          >
            <Ionicons name="ban-outline" size={16} color={colors.secondaryText} />
          </Pressable>
          {DEADLINE_COLORS.map((c) => {
            const chipColor = colorScheme === 'dark' ? c.dark : c.light;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedColor(c.id)}
                style={[
                  styles.colorChip,
                  { backgroundColor: chipColor },
                  selectedColor === c.id && { borderColor: colors.text, borderWidth: 2 },
                ]}
              />
            );
          })}
        </View>

        {/* Delete */}
        {existingCounter && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete Counter
            </Text>
          </Pressable>
        )}
      </ScrollView>
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
  headerButton: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  content: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
  },
  label: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  input: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.xl,
    gap: Layout.spacing.sm,
  },
  deleteText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});
