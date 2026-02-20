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
  FocusTimerConfig,
  DeadlineTrackerConfig,
  HabitTrackerConfig,
} from '@/src/types';
import { TOOL_REGISTRY, BREATHING_PRESETS, FOCUS_TIMER_PRESETS } from '@/src/constants/tools';
import { useToolConfig } from '@/src/hooks/useToolConfig';
import { useGoals } from '@/src/hooks/useGoals';
import { useSettings } from '@/src/hooks/useSettings';
import { calculateLifeData } from '@/src/utils/lifeData';
import { MOTIVATIONAL_QUOTES } from '@/src/constants/quotes';

interface HomeToolCardProps {
  toolId: ToolId;
  drag?: () => void;
  isActive?: boolean;
  showHandle?: boolean;
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
  const customCount = config?.affirmations?.length ?? 0;

  if (customCount === 0) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to add your first affirmation
      </Text>
    );
  }

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {customCount} custom affirmation{customCount !== 1 ? 's' : ''}
    </Text>
  );
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

function FocusTimerPreview() {
  const { config } = useToolConfig<FocusTimerConfig>('focus-timer');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const seconds = config?.lastDurationSeconds ?? 25 * 60;
  const minutes = Math.round(seconds / 60);

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {minutes} min focus session
    </Text>
  );
}

function DeadlineTrackerPreview() {
  const { config } = useToolConfig<DeadlineTrackerConfig>('deadline-tracker');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const deadlines = config?.deadlines ?? [];

  if (deadlines.length === 0) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to add your first deadline
      </Text>
    );
  }

  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const next = sorted[0];
  const now = new Date();
  const target = new Date(next.date);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const daysUntil = Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'in 1 day' : daysUntil > 1 ? `in ${daysUntil} days` : `${Math.abs(daysUntil)} days ago`;

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''} · Next: {next.title} ({daysLabel})
    </Text>
  );
}

function StreakTrackerPreview() {
  const { config } = useToolConfig<HabitTrackerConfig>('streak-tracker');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const habits = config?.habits ?? [];

  if (habits.length === 0) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to start tracking habits
      </Text>
    );
  }

  // Find habit with highest current streak
  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const getStreak = (completions: string[]) => {
    const set = new Set(completions);
    const today = new Date();
    const todayKey = toDateKey(today);
    let count = 0;
    const cursor = new Date(today);
    if (!set.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    while (count < 3650) {
      if (!set.has(toDateKey(cursor))) break;
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  };

  const bestStreak = habits.reduce((best, h) => {
    const s = getStreak(h.completions);
    return s > best.streak ? { title: h.title, streak: s } : best;
  }, { title: '', streak: 0 });

  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {habits.length} habit{habits.length !== 1 ? 's' : ''}
      {bestStreak.streak > 0 ? ` · Best: ${bestStreak.title} (🔥 ${bestStreak.streak}d)` : ''}
    </Text>
  );
}

function TallyCounterPreview() {
  const { config } = useToolConfig<import('@/src/types').TallyCounterConfig>('tally-counter');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const counters = config?.counters ?? [];

  if (counters.length === 0) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to add your first counter
      </Text>
    );
  }

  const top = [...counters].sort((a, b) => b.count - a.count)[0];
  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {counters.length} counter{counters.length !== 1 ? 's' : ''} · highest: {top.title} ({top.count})
    </Text>
  );
}

function MotivationalQuotesPreview() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];
  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]} numberOfLines={2}>
      "{quote.text}" — {quote.author}
    </Text>
  );
}

function RoutinesPreview() {
  const { config } = useToolConfig<import('@/src/types').RoutinesConfig>('routines');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const routines = config?.routines ?? [];

  if (routines.length === 0) {
    return (
      <Text style={[styles.previewText, { color: colors.secondaryText }]}>
        Tap to create your first routine
      </Text>
    );
  }

  const totalSteps = routines.reduce((sum, r) => sum + r.orderedCards.length, 0);
  return (
    <Text style={[styles.previewText, { color: colors.secondaryText }]}>
      {routines.length} routine{routines.length !== 1 ? 's' : ''} · {totalSteps} total step{totalSteps !== 1 ? 's' : ''}
    </Text>
  );
}

export function HomeToolCard({ toolId, drag, isActive, showHandle }: HomeToolCardProps) {
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
      case 'focus-timer': return <FocusTimerPreview />;
      case 'deadline-tracker': return <DeadlineTrackerPreview />;
      case 'streak-tracker': return <StreakTrackerPreview />;
      case 'routines': return <RoutinesPreview />;
      case 'tally-counter': return <TallyCounterPreview />;
      case 'motivational-quotes': return <MotivationalQuotesPreview />;
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
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Ionicons name={tool.icon as any} size={24} color={colors.tint} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{tool.name}</Text>
        </View>
        <View style={styles.preview}>{renderPreview()}</View>
      </View>
      {showHandle && (
        <Ionicons
          name="menu"
          size={20}
          color={colors.secondaryText}
          onLongPress={drag}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  cardContent: {
    flex: 1,
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
  previewSubtext: {
    fontSize: Layout.fontSize.caption,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.6,
  },
});
