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
import { RoutinesConfig, Routine } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { ROUTINE_ICONS } from '@/src/constants/tools';

const DEFAULT_CONFIG: RoutinesConfig = { toolId: 'routines', routines: [] };

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<RoutinesConfig>('routines');

  const routines = config?.routines ?? [];
  const existingRoutine = useMemo(
    () => (id !== 'new' ? routines.find((r) => r.id === id) : null),
    [id, routines]
  );

  const [title, setTitle] = useState(existingRoutine?.title ?? '');
  const [selectedIcon, setSelectedIcon] = useState(existingRoutine?.icon ?? 'repeat-outline');

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const currentConfig = config ?? DEFAULT_CONFIG;

    if (existingRoutine) {
      setConfig({
        ...currentConfig,
        routines: currentConfig.routines.map((r) =>
          r.id === existingRoutine.id ? { ...r, title: trimmed, icon: selectedIcon } : r
        ),
      });
    } else {
      const newRoutine: Routine = {
        id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed,
        icon: selectedIcon,
        orderedCards: [],
        customCards: [],
        notificationEnabled: false,
        createdAt: new Date().toISOString(),
      };
      setConfig({
        ...currentConfig,
        routines: [...currentConfig.routines, newRoutine],
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingRoutine || !config) return;
    Alert.alert('Delete Routine', `Delete "${existingRoutine.title}" and all its steps?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setConfig({ ...config, routines: config.routines.filter((r) => r.id !== existingRoutine.id) });
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
          {existingRoutine ? 'Edit Routine' : 'New Routine'}
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
          placeholder="Routine name"
          placeholderTextColor={colors.secondaryText}
          autoFocus={id === 'new'}
        />

        {/* Icon */}
        <Text style={[styles.label, { color: colors.text, marginTop: Layout.spacing.lg }]}>
          Icon
        </Text>
        <View style={styles.iconGrid}>
          {ROUTINE_ICONS.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => setSelectedIcon(icon)}
              style={[
                styles.iconChip,
                { backgroundColor: colors.cardBackground },
                selectedIcon === icon && { borderColor: colors.tint, borderWidth: 2 },
              ]}
            >
              <Ionicons name={icon as any} size={24} color={selectedIcon === icon ? colors.tint : colors.secondaryText} />
            </Pressable>
          ))}
        </View>

        {/* Delete */}
        {existingRoutine && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: colors.destructive }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete Routine
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: Layout.borderRadius.md,
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
