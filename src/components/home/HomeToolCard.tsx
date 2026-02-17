import React, { useMemo } from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import {
  ToolId,
  MementoMoriConfig,
  AffirmationsConfig,
  BreathingConfig,
} from '@/src/types';
import { TOOL_REGISTRY, BREATHING_PRESETS } from '@/src/constants/tools';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { useGoals } from '@/src/hooks/useGoals';
import { useSettings } from '@/src/hooks/useSettings';
import { calculateLifeData } from '@/src/utils/lifeData';
import { AffirmationCarousel } from '@/src/components/affirmations/AffirmationCarousel';

interface HomeToolCardProps {
  toolId: ToolId;
  drag?: () => void;
  isActive?: boolean;
}

function MementoPreview() {
  const { config } = useToolConfig<MementoMoriConfig>('memento-mori');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const lifeData = useMemo(() => {
    if (!config?.birthday) return null;
    return calculateLifeData(new Date(config.birthday), config.lifeExpectancy ?? 80);
  }, [config?.birthday, config?.lifeExpectancy]);

  if (!lifeData) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to set your birthday
      </Text>
    );
  }

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {lifeData.daysRemaining.toLocaleString()} days remaining
    </Text>
  );
}

function GoalsPreview() {
  const { goals } = useGoals();
  const { settings } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {goals.length} goal{goals.length !== 1 ? 's' : ''} configured
      {settings.lastCommitDate
        ? ` · Last reviewed ${new Date(settings.lastCommitDate).toLocaleDateString()}`
        : ''}
    </Text>
  );
}

function AffirmationsPreview() {
  const { config } = useToolConfig<AffirmationsConfig>('affirmations');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!config?.affirmations?.length) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to add your first affirmation
      </Text>
    );
  }

  return <AffirmationCarousel affirmations={config.affirmations} />;
}

function BreathingPreview() {
  const { config } = useToolConfig<BreathingConfig>('breathing');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const preset = BREATHING_PRESETS.find((p) => p.id === config?.selectedPresetId);

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {preset?.name ?? 'Box Breathing'} · {(config?.durationSeconds ?? 120) / 60} min
    </Text>
  );
}

export function HomeToolCard({ toolId, drag, isActive }: HomeToolCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);

  if (!tool) return null;

  const renderPreview = () => {
    switch (toolId) {
      case 'memento-mori': return <MementoPreview />;
      case 'goals': return <GoalsPreview />;
      case 'affirmations': return <AffirmationsPreview />;
      case 'breathing': return <BreathingPreview />;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBackground },
        isActive && { opacity: 0.9, elevation: 8 },
      ]}
    >
      <View style={styles.cardHeader}>
        <Ionicons name={tool.icon as any} size={24} color={colors.tint} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{tool.name}</Text>
        <Ionicons
          name="menu"
          size={20}
          color={colors.secondaryText}
          onLongPress={drag}
        />
      </View>
      <View style={styles.preview}>{renderPreview()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  cardTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    flex: 1,
  },
  preview: {
    marginTop: Layout.spacing.sm,
  },
  previewText: {
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
  },
});
