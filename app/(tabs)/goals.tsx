import React from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useGoals } from '@/src/hooks/useGoals';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { EmptyState } from '@/src/components/EmptyState';

export default function GoalsScreen() {
  const router = useRouter();
  const { goals, deleteGoal, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleEdit = (id: string) => {
    router.push(`/edit-goal/${id}`);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGoal(id),
      },
    ]);
  };

  const handleAdd = () => {
    router.push('/edit-goal/new');
  };

  if (goals.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No Goals Yet"
          message="Tap the + button to add your first goal."
        />
        <View style={styles.fabContainer}>
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.fab,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
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
          <View
            key={goal.id}
            style={[
              styles.goalRow,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Pressable
              onPress={() => handleEdit(goal.id)}
              style={styles.goalInfo}
            >
              <Text style={[styles.goalName, { color: colors.text }]}>
                {goal.name}
              </Text>
              {goal.outcome ? (
                <Text
                  style={[styles.goalSubtext, { color: colors.secondaryText }]}
                  numberOfLines={1}
                >
                  {goal.outcome}
                </Text>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => handleDelete(goal.id, goal.name)}
              style={styles.deleteButton}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {canAddGoal && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.fab,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
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
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  goalInfo: {
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  goalName: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  goalSubtext: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
  deleteButton: {
    padding: Layout.spacing.xs,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    right: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  fab: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
