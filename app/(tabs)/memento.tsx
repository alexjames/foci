import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Colors } from '@/src/constants/Colors';
import { useSettings } from '@/src/hooks/useSettings';
import { calculateLifeData } from '@/src/utils/lifeData';
import {
  BirthdayPrompt,
  CountdownTimer,
  ViewSwitcher,
  VisualizationType,
} from '@/src/components/memento';
import {
  HourglassView,
  YearGridView,
  WeekGridView,
  MonthDotsView,
  ProgressBarView,
  SeasonsView,
  HeartbeatsView,
  SunsetsView,
} from '@/src/components/memento/visualizations';

export default function MementoScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, updateSettings } = useSettings();
  const [activeView, setActiveView] = useState<VisualizationType>('hourglass');

  const handleBirthdaySet = useCallback(
    (date: Date) => {
      updateSettings({ birthday: date.toISOString() });
    },
    [updateSettings],
  );

  const lifeData = useMemo(() => {
    if (!settings.birthday) return null;
    return calculateLifeData(new Date(settings.birthday), settings.lifeExpectancy ?? 80);
  }, [settings.birthday, settings.lifeExpectancy]);

  if (!settings.birthday || !lifeData) {
    return <BirthdayPrompt onComplete={handleBirthdaySet} lifeExpectancy={settings.lifeExpectancy ?? 80} />;
  }

  const renderVisualization = () => {
    switch (activeView) {
      case 'hourglass':
        return <HourglassView lifeData={lifeData} />;
      case 'yearGrid':
        return <YearGridView lifeData={lifeData} />;
      case 'weekGrid':
        return <WeekGridView lifeData={lifeData} />;
      case 'monthDots':
        return <MonthDotsView lifeData={lifeData} />;
      case 'progressBar':
        return <ProgressBarView lifeData={lifeData} />;
      case 'seasons':
        return <SeasonsView lifeData={lifeData} />;
      case 'heartbeats':
        return <HeartbeatsView lifeData={lifeData} />;
      case 'sunsets':
        return <SunsetsView lifeData={lifeData} />;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <CountdownTimer
        birthday={new Date(settings.birthday)}
        lifeExpectancy={settings.lifeExpectancy ?? 80}
      />
      <ViewSwitcher active={activeView} onChange={setActiveView} />
      {renderVisualization()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
});
