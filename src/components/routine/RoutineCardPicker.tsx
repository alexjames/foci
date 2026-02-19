import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { RoutinesConfig, RoutineCustomCard } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { ROUTINE_PRESET_CARDS } from '@/src/constants/routineCards';

interface RoutineCardPickerProps {
  routineId: string;
}

export function RoutineCardPicker({ routineId }: RoutineCardPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { config, setConfig } = useToolConfig<RoutinesConfig>('routines');

  const routine = config?.routines.find((r) => r.id === routineId);

  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const morningPresets = useMemo(() => ROUTINE_PRESET_CARDS.filter((p) => p.category === 'morning'), []);
  const eveningPresets = useMemo(() => ROUTINE_PRESET_CARDS.filter((p) => p.category === 'evening'), []);
  const generalPresets = useMemo(() => ROUTINE_PRESET_CARDS.filter((p) => p.category === 'general'), []);

  const selectedSet = useMemo(
    () => new Set(routine?.orderedCards ?? []),
    [routine?.orderedCards]
  );

  const togglePreset = useCallback(
    async (presetId: string) => {
      if (!routine || !config) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newOrderedCards = selectedSet.has(presetId)
        ? routine.orderedCards.filter((id) => id !== presetId)
        : [...routine.orderedCards, presetId];
      setConfig({
        ...config,
        routines: config.routines.map((r) =>
          r.id === routineId ? { ...r, orderedCards: newOrderedCards } : r
        ),
      });
    },
    [routine, config, routineId, selectedSet, setConfig]
  );

  const handleAddCustom = useCallback(async () => {
    if (!routine || !config) return;
    const title = customTitle.trim();
    const description = customDescription.trim();
    if (!title) {
      Alert.alert('Title Required', 'Please enter a title for your custom card.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newCard: RoutineCustomCard = {
      id,
      title,
      description: description || 'Custom routine step',
      createdAt: new Date().toISOString(),
    };
    setConfig({
      ...config,
      routines: config.routines.map((r) =>
        r.id === routineId
          ? {
              ...r,
              orderedCards: [...r.orderedCards, id],
              customCards: [...r.customCards, newCard],
            }
          : r
      ),
    });
    setCustomTitle('');
    setCustomDescription('');
    setShowCustomForm(false);
  }, [customTitle, customDescription, routine, config, routineId, setConfig]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Custom card section */}
      <View style={styles.section}>
        {!showCustomForm ? (
          <Pressable
            onPress={() => setShowCustomForm(true)}
            style={[styles.addCustomButton, { borderColor: colors.tint }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
            <Text style={[styles.addCustomText, { color: colors.tint }]}>Create Custom Card</Text>
          </Pressable>
        ) : (
          <View style={[styles.customForm, { backgroundColor: colors.cardBackground }]}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Card title"
              placeholderTextColor={colors.secondaryText}
              value={customTitle}
              onChangeText={setCustomTitle}
              maxLength={80}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.secondaryText}
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              maxLength={200}
            />
            <View style={styles.customFormActions}>
              <Pressable onPress={() => setShowCustomForm(false)} style={styles.cancelButton}>
                <Text style={[styles.cancelText, { color: colors.secondaryText }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddCustom} style={styles.saveButton}>
                <Text style={styles.saveText}>Add Card</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Custom cards already added */}
      {(routine?.customCards.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Cards</Text>
          {routine!.customCards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => togglePreset(card.id)}
              style={[styles.presetCard, { backgroundColor: colors.cardBackground }]}
            >
              <View style={styles.presetContent}>
                <Text style={[styles.presetTitle, { color: colors.text }]}>{card.title}</Text>
                <Text style={[styles.presetDescription, { color: colors.secondaryText }]} numberOfLines={2}>
                  {card.description}
                </Text>
              </View>
              <Ionicons
                name={selectedSet.has(card.id) ? 'checkbox' : 'square-outline'}
                size={24}
                color={selectedSet.has(card.id) ? colors.tint : colors.secondaryText}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* Morning presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Morning</Text>
        {morningPresets.map((preset) => (
          <Pressable
            key={preset.id}
            onPress={() => togglePreset(preset.id)}
            style={[styles.presetCard, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.presetContent}>
              <Text style={[styles.presetTitle, { color: colors.text }]}>{preset.title}</Text>
              <Text style={[styles.presetDescription, { color: colors.secondaryText }]} numberOfLines={2}>
                {preset.description}
              </Text>
            </View>
            <Ionicons
              name={selectedSet.has(preset.id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={selectedSet.has(preset.id) ? colors.tint : colors.secondaryText}
            />
          </Pressable>
        ))}
      </View>

      {/* Evening presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Evening</Text>
        {eveningPresets.map((preset) => (
          <Pressable
            key={preset.id}
            onPress={() => togglePreset(preset.id)}
            style={[styles.presetCard, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.presetContent}>
              <Text style={[styles.presetTitle, { color: colors.text }]}>{preset.title}</Text>
              <Text style={[styles.presetDescription, { color: colors.secondaryText }]} numberOfLines={2}>
                {preset.description}
              </Text>
            </View>
            <Ionicons
              name={selectedSet.has(preset.id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={selectedSet.has(preset.id) ? colors.tint : colors.secondaryText}
            />
          </Pressable>
        ))}
      </View>

      {/* General presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>General</Text>
        {generalPresets.map((preset) => (
          <Pressable
            key={preset.id}
            onPress={() => togglePreset(preset.id)}
            style={[styles.presetCard, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.presetContent}>
              <Text style={[styles.presetTitle, { color: colors.text }]}>{preset.title}</Text>
              <Text style={[styles.presetDescription, { color: colors.secondaryText }]} numberOfLines={2}>
                {preset.description}
              </Text>
            </View>
            <Ionicons
              name={selectedSet.has(preset.id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={selectedSet.has(preset.id) ? colors.tint : colors.secondaryText}
            />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  presetContent: {
    flex: 1,
    marginRight: Layout.spacing.sm,
  },
  presetTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  presetDescription: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
    lineHeight: 18,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: Layout.spacing.sm,
  },
  addCustomText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  customForm: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.sm,
    fontSize: Layout.fontSize.body,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  customFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  cancelText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  saveText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
