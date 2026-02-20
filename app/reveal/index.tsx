import React, { useState, useCallback } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TypewriterText } from '@/src/components/TypewriterText';
import { CommitButton } from '@/src/components/CommitButton';
import { useGoals } from '@/src/hooks/useGoals';
import { useSettings } from '@/src/hooks/useSettings';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { Text, View } from '@/components/Themed';

export default function RevealScreen() {
  const router = useRouter();
  const { goals } = useGoals();
  const { recordCommit } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [showCommit, setShowCommit] = useState(false);
  const [goalLabel, setGoalLabel] = useState<'name' | 'details'>('name');

  const currentGoal = goals[currentGoalIndex];

  const getGoalText = useCallback(() => {
    if (!currentGoal) return '';

    if (goalLabel === 'name') {
      return currentGoal.name;
    }

    // Build details text
    const parts: string[] = [];
    if (currentGoal.outcome) parts.push(`Outcome: ${currentGoal.outcome}`);
    if (currentGoal.why) parts.push(`Why: ${currentGoal.why}`);
    if (currentGoal.consequences)
      parts.push(`Consequences: ${currentGoal.consequences}`);
    return parts.join('\n\n');
  }, [currentGoal, goalLabel]);

  const handleTypewriterComplete = useCallback(() => {
    if (!currentGoal) return;

    const hasDetails =
      currentGoal.outcome || currentGoal.why || currentGoal.consequences;

    if (goalLabel === 'name' && hasDetails) {
      // Show details after name
      setTimeout(() => setGoalLabel('details'), 500);
    } else {
      // Move to next goal or show commit
      setTimeout(() => {
        if (currentGoalIndex < goals.length - 1) {
          setCurrentGoalIndex((prev) => prev + 1);
          setGoalLabel('name');
        } else {
          setShowCommit(true);
        }
      }, 800);
    }
  }, [currentGoal, goalLabel, currentGoalIndex, goals.length]);

  const handleCommit = () => {
    recordCommit();
    router.back();
  };

  if (goals.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centerContent, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No goals to review.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.progressContainer, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.progressText, { color: colors.secondaryText }]}>
          {currentGoalIndex + 1} / {goals.length}
        </Text>
      </View>

      <View style={[styles.content, { backgroundColor: 'transparent' }]}>
        {goalLabel === 'name' && (
          <TypewriterText
            key={`name-${currentGoalIndex}`}
            text={getGoalText()}
            speed={45}
            onComplete={handleTypewriterComplete}
            style={[styles.goalName, { color: colors.text }]}
            cursorColor={colors.tint}
          />
        )}
        {goalLabel === 'details' && (
          <View style={[styles.detailsContainer, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.goalNameStatic, { color: colors.text }]}>{currentGoal.name}</Text>
            <TypewriterText
              key={`details-${currentGoalIndex}`}
              text={getGoalText()}
              speed={30}
              onComplete={handleTypewriterComplete}
              style={[styles.goalDetails, { color: colors.secondaryText }]}
              cursorColor={colors.tint}
            />
          </View>
        )}
      </View>

      <CommitButton onPress={handleCommit} visible={showCommit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Layout.fontSize.body,
  },
  progressContainer: {
    paddingTop: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.xl,
  },
  progressText: {
    fontSize: Layout.fontSize.caption,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  goalName: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  detailsContainer: {
    alignItems: 'center',
    maxWidth: 340,
  },
  goalNameStatic: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  goalDetails: {
    fontSize: Layout.fontSize.body,
    fontWeight: '400',
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
});
