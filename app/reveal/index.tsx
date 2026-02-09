import React, { useState, useCallback } from 'react';
import { StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TypewriterText } from '@/src/components/TypewriterText';
import { CommitButton } from '@/src/components/CommitButton';
import { useGoals } from '@/src/hooks/useGoals';
import { useSettings } from '@/src/hooks/useSettings';
import { Layout } from '@/src/constants/Layout';
import { Text, View } from '@/components/Themed';

export default function RevealScreen() {
  const router = useRouter();
  const { goals } = useGoals();
  const { recordCommit } = useSettings();
  const { height } = useWindowDimensions();
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No goals to review.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentGoalIndex + 1} / {goals.length}
        </Text>
      </View>

      <View style={styles.content}>
        {goalLabel === 'name' && (
          <TypewriterText
            key={`name-${currentGoalIndex}`}
            text={getGoalText()}
            speed={45}
            onComplete={handleTypewriterComplete}
            style={styles.goalName}
            cursorColor="#0A84FF"
          />
        )}
        {goalLabel === 'details' && (
          <View style={styles.detailsContainer}>
            <Text style={styles.goalNameStatic}>{currentGoal.name}</Text>
            <TypewriterText
              key={`details-${currentGoalIndex}`}
              text={getGoalText()}
              speed={30}
              onComplete={handleTypewriterComplete}
              style={styles.goalDetails}
              cursorColor="#0A84FF"
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
    backgroundColor: '#000000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: Layout.fontSize.body,
  },
  progressContainer: {
    paddingTop: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.xl,
    backgroundColor: 'transparent',
  },
  progressText: {
    color: '#6B7280',
    fontSize: Layout.fontSize.caption,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
    backgroundColor: 'transparent',
  },
  goalName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 42,
  },
  detailsContainer: {
    backgroundColor: 'transparent',
  },
  goalNameStatic: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 42,
    marginBottom: Layout.spacing.lg,
  },
  goalDetails: {
    color: '#D1D5DB',
    fontSize: Layout.fontSize.body,
    fontWeight: '400',
    lineHeight: 26,
  },
});
