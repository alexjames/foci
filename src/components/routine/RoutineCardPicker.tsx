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
import { RoutineConfig, RoutineCustomCard } from '@/src/types';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { getPresetsForRoutine } from '@/src/constants/routineCards';

interface RoutineCardPickerProps {
  toolId: 'morning-routine' | 'evening-routine';
}

export function RoutineCardPicker({ toolId }: RoutineCardPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const routineType = toolId === 'morning-routine' ? 'morning' : 'evening';
  const { config, setConfig } = useToolConfig<RoutineConfig>(toolId);

  const defaultConfig: RoutineConfig = {
    toolId,
    orderedCards: [],
    customCards: [],
    notificationEnabled: false,
  };
  const currentConfig = config ?? defaultConfig;

  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const presets = useMemo(() => getPresetsForRoutine(routineType), [routineType]);
  const routinePresets = useMemo(() => presets.filter((p) => p.category === routineType), [presets, routineType]);
  const generalPresets = useMemo(() => presets.filter((p) => p.category === 'general'), [presets]);

  const selectedSet = useMemo(() => new Set(currentConfig.orderedCards), [currentConfig.orderedCards]);

  const togglePreset = useCallback(
    async (presetId: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedSet.has(presetId)) {
        setConfig({
          ...currentConfig,
          orderedCards: currentConfig.orderedCards.filter((id) => id !== presetId),
        });
      } else {
        setConfig({
          ...currentConfig,
          orderedCards: [...currentConfig.orderedCards, presetId],
        });
      }
    },
    [currentConfig, selectedSet, setConfig]
  );

  const handleAddCustom = useCallback(async () => {
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
      ...currentConfig,
      orderedCards: [...currentConfig.orderedCards, id],
      customCards: [...currentConfig.customCards, newCard],
    });
    setCustomTitle('');
    setCustomDescription('');
    setShowCustomForm(false);
  }, [customTitle, customDescription, currentConfig, setConfig]);

  const categoryLabel = routineType === 'morning' ? 'Morning' : 'Evening';

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
      {currentConfig.customCards.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Cards</Text>
          {currentConfig.customCards.map((card) => (
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

      {/* Routine-specific presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{categoryLabel}</Text>
        {routinePresets.map((preset) => (
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
