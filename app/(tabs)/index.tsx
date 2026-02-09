import { StyleSheet, ScrollView, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { GoalCard } from '@/src/components/GoalCard';
import { EmptyState } from '@/src/components/EmptyState';
import { useGoals } from '@/src/hooks/useGoals';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

export default function HomeScreen() {
  const router = useRouter();
  const { goals } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleGoalPress = (id: string) => {
    router.push(`/edit-goal/${id}`);
  };

  const handleReviewGoals = () => {
    router.push('/reveal');
  };

  if (goals.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No Goals Yet"
          message="Head over to the Goals tab to add your first goal."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onPress={handleGoalPress} />
        ))}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleReviewGoals}
          style={({ pressed }) => [
            styles.reviewButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.reviewButtonText}>Review Goals</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.md,
    paddingBottom: 100,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.md,
    paddingBottom: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  reviewButton: {
    backgroundColor: '#007AFF',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
