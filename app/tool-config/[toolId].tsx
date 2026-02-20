import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import {
  ToolId,
  MementoMoriConfig,
  GoalsConfig,
  AffirmationsConfig,
  BreathingConfig,
  FocusTimerConfig,
  FocusTimerAlarm,
  ToolConfig,
} from '@/src/types';
import { TOOL_REGISTRY, BREATHING_PRESETS } from '@/src/constants/tools';
import { useTools } from '@/src/hooks/useTools';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { TimePicker } from '@/src/components/TimePicker';

function getDefaultConfig(toolId: ToolId): ToolConfig {
  switch (toolId) {
    case 'memento-mori':
      return { toolId: 'memento-mori', lifeExpectancy: 80, notificationEnabled: false };
    case 'goals':
      return { toolId: 'goals', notificationEnabled: false };
    case 'affirmations':
      return { toolId: 'affirmations', affirmations: [], notificationEnabled: false };
    case 'breathing':
      return {
        toolId: 'breathing',
        selectedPresetId: 'box',
        durationSeconds: 120,
        notificationEnabled: false,
      };
    case 'focus-timer':
      return {
        toolId: 'focus-timer',
        lastDurationSeconds: 25 * 60,
        breakDurationSeconds: 5 * 60,
        alarmType: 'both',
        notificationEnabled: false,
      };
    case 'deadline-tracker':
      return {
        toolId: 'deadline-tracker',
        deadlines: [],
        notificationEnabled: false,
      };
    case 'streak-tracker':
      return {
        toolId: 'streak-tracker',
        streaks: [],
        notificationEnabled: false,
      };
    case 'morning-routine':
      return {
        toolId: 'morning-routine',
        orderedCards: [],
        customCards: [],
        notificationEnabled: false,
      };
    case 'evening-routine':
      return {
        toolId: 'evening-routine',
        orderedCards: [],
        customCards: [],
        notificationEnabled: false,
      };
    case 'tally-counter':
      return { toolId: 'tally-counter', counters: [] };
    case 'routines':
      return { toolId: 'routines', routines: [] };
    case 'motivational-quotes':
      return { toolId: 'motivational-quotes', notificationEnabled: false };
  }
}

function MementoConfig({ config, onUpdate }: { config: MementoMoriConfig; onUpdate: (c: MementoMoriConfig) => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Life Expectancy</Text>
      <View style={[styles.row, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Years</Text>
        <View style={styles.stepperRow}>
          <Pressable onPress={() => onUpdate({ ...config, lifeExpectancy: Math.max(28, config.lifeExpectancy - 1) })}>
            <Ionicons name="remove-circle-outline" size={28} color={colors.tint} />
          </Pressable>
          <Text style={[styles.stepperValue, { color: colors.text }]}>{config.lifeExpectancy}</Text>
          <Pressable onPress={() => onUpdate({ ...config, lifeExpectancy: Math.min(120, config.lifeExpectancy + 1) })}>
            <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.secondaryText }]}>
        Birthday is set when you first open the tool.
      </Text>
    </View>
  );
}

function BreathingConfigView({ config, onUpdate }: { config: BreathingConfig; onUpdate: (c: BreathingConfig) => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Preset</Text>
      {BREATHING_PRESETS.map((preset) => (
        <Pressable
          key={preset.id}
          style={[
            styles.row,
            { backgroundColor: colors.cardBackground },
            config.selectedPresetId === preset.id && { borderColor: colors.tint, borderWidth: 2 },
          ]}
          onPress={() => onUpdate({ ...config, selectedPresetId: preset.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{preset.name}</Text>
            <Text style={[styles.hint, { color: colors.secondaryText, marginTop: 2 }]}>{preset.description}</Text>
          </View>
          {config.selectedPresetId === preset.id && (
            <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
          )}
        </Pressable>
      ))}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Layout.spacing.md }]}>
        Session Duration
      </Text>
      <View style={[styles.row, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Seconds</Text>
        <View style={styles.stepperRow}>
          <Pressable onPress={() => onUpdate({ ...config, durationSeconds: Math.max(30, config.durationSeconds - 30) })}>
            <Ionicons name="remove-circle-outline" size={28} color={colors.tint} />
          </Pressable>
          <Text style={[styles.stepperValue, { color: colors.text }]}>{config.durationSeconds}</Text>
          <Pressable onPress={() => onUpdate({ ...config, durationSeconds: Math.min(600, config.durationSeconds + 30) })}>
            <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const ALARM_OPTIONS: { value: FocusTimerAlarm; label: string }[] = [
  { value: 'both', label: 'Sound & Vibration' },
  { value: 'sound', label: 'Sound Only' },
  { value: 'vibration', label: 'Vibration Only' },
];

function FocusTimerConfigView({ config, onUpdate }: { config: FocusTimerConfig; onUpdate: (c: FocusTimerConfig) => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Alarm</Text>
      {ALARM_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.row,
            { backgroundColor: colors.cardBackground },
            config.alarmType === option.value && { borderColor: colors.tint, borderWidth: 2 },
          ]}
          onPress={() => onUpdate({ ...config, alarmType: option.value })}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>{option.label}</Text>
          {config.alarmType === option.value && (
            <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
          )}
        </Pressable>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Layout.spacing.md }]}>
        Break Duration
      </Text>
      <View style={[styles.row, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>Minutes</Text>
        <View style={styles.stepperRow}>
          <Pressable onPress={() => onUpdate({ ...config, breakDurationSeconds: Math.max(60, config.breakDurationSeconds - 60) })}>
            <Ionicons name="remove-circle-outline" size={28} color={colors.tint} />
          </Pressable>
          <Text style={[styles.stepperValue, { color: colors.text }]}>{Math.round(config.breakDurationSeconds / 60)}</Text>
          <Pressable onPress={() => onUpdate({ ...config, breakDurationSeconds: Math.min(30 * 60, config.breakDurationSeconds + 60) })}>
            <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function ToolConfigScreen() {
  const { toolId: rawToolId } = useLocalSearchParams<{ toolId: string }>();
  const toolId = rawToolId as ToolId;
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);
  const { isToolOnHome, addToolToHome, removeToolFromHome } = useTools();
  const { config, setConfig } = useToolConfig(toolId);

  const currentConfig = config ?? getDefaultConfig(toolId);
  const onHome = isToolOnHome(toolId);

  const handleToggleHome = () => {
    if (onHome) {
      removeToolFromHome(toolId);
    } else {
      // Ensure config is saved when adding to home
      if (!config) {
        setConfig(currentConfig);
      }
      addToolToHome(toolId);
    }
  };

  const handleUpdateConfig = (updated: ToolConfig) => {
    setConfig(updated);
  };

  if (!tool) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configure</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tool info */}
        <View style={styles.toolInfo}>
          <Ionicons name={tool.icon as any} size={48} color={colors.tint} />
          <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
          <Text style={[styles.toolDescription, { color: colors.secondaryText }]}>
            {tool.description}
          </Text>
        </View>

        {/* Add/Remove button */}
        <Pressable
          onPress={handleToggleHome}
          style={[
            styles.toggleButton,
            { backgroundColor: onHome ? colors.destructive : colors.tint },
          ]}
        >
          <Ionicons name={onHome ? 'remove-circle-outline' : 'add-circle-outline'} size={20} color="#fff" />
          <Text style={styles.toggleButtonText}>
            {onHome ? 'Remove from Home' : 'Add to Home'}
          </Text>
        </Pressable>

        {/* Tool-specific config */}
        {toolId === 'memento-mori' && (
          <MementoConfig
            config={currentConfig as MementoMoriConfig}
            onUpdate={(c) => handleUpdateConfig(c)}
          />
        )}
        {toolId === 'breathing' && (
          <BreathingConfigView
            config={currentConfig as BreathingConfig}
            onUpdate={(c) => handleUpdateConfig(c)}
          />
        )}
        {toolId === 'focus-timer' && (
          <FocusTimerConfigView
            config={currentConfig as FocusTimerConfig}
            onUpdate={(c) => handleUpdateConfig(c)}
          />
        )}

        {/* Notification settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={[styles.row, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily Reminder</Text>
            <Switch
              value={currentConfig.notificationEnabled}
              onValueChange={(enabled) =>
                handleUpdateConfig({ ...currentConfig, notificationEnabled: enabled } as ToolConfig)
              }
              trackColor={{ true: colors.tint }}
            />
          </View>
          {currentConfig.notificationEnabled && (
            <View style={[styles.row, { backgroundColor: colors.cardBackground }]}>
              <TimePicker
                hour={currentConfig.notificationTime?.hour ?? 8}
                minute={currentConfig.notificationTime?.minute ?? 0}
                onChange={(hour, minute) =>
                  handleUpdateConfig({
                    ...currentConfig,
                    notificationTime: { hour, minute },
                  } as ToolConfig)
                }
              />
            </View>
          )}
        </View>
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
  content: {
    padding: Layout.spacing.md,
  },
  toolInfo: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  toolName: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginTop: Layout.spacing.sm,
  },
  toolDescription: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    lineHeight: 22,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  rowLabel: {
    fontSize: Layout.fontSize.body,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  stepperValue: {
    fontSize: Layout.fontSize.title,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  hint: {
    fontSize: Layout.fontSize.caption,
    marginTop: Layout.spacing.xs,
  },
});
