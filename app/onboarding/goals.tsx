import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

interface OnboardingGoal {
  name: string;
  outcome: string;
  why: string;
  consequences: string;
  expanded: boolean;
}

const emptyGoal = (): OnboardingGoal => ({
  name: '',
  outcome: '',
  why: '',
  consequences: '',
  expanded: true,
});

export default function OnboardingGoals() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [goals, setGoals] = useState<OnboardingGoal[]>([emptyGoal()]);

  const addGoal = () => {
    if (goals.length >= 5) return;
    setGoals([...goals, emptyGoal()]);
  };

  const updateGoal = (
    index: number,
    field: keyof OnboardingGoal,
    value: string | boolean
  ) => {
    const updated = [...goals];
    (updated[index] as any)[field] = value;
    setGoals(updated);
  };

  const removeGoal = (index: number) => {
    if (goals.length <= 1) return;
    setGoals(goals.filter((_, i) => i !== index));
  };

  const toggleExpand = (index: number) => {
    const updated = [...goals];
    updated[index].expanded = !updated[index].expanded;
    setGoals(updated);
  };

  const hasValidGoal = goals.some((g) => g.name.trim().length > 0);

  const handleNext = () => {
    const validGoals = goals.filter((g) => g.name.trim().length > 0);
    // Pass goals via params as JSON
    router.push({
      pathname: '/onboarding/notification',
      params: { goals: JSON.stringify(validGoals) },
    });
  };

  const inputStyle = (extra?: object) => [
    styles.input,
    {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      color: colors.text,
    },
    extra,
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            What are your goals?
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Add between 1 and 5 goals. Only the name is required.
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {goals.map((goal, index) => (
            <View
              key={index}
              style={[
                styles.goalCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Pressable
                onPress={() => toggleExpand(index)}
                style={styles.goalHeader}
              >
                <Text style={[styles.goalNumber, { color: colors.tint }]}>
                  Goal {index + 1}
                </Text>
                <View style={styles.goalHeaderRight}>
                  {goals.length > 1 && (
                    <Pressable
                      onPress={() => removeGoal(index)}
                      hitSlop={8}
                      style={styles.removeButton}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.destructive}
                      />
                    </Pressable>
                  )}
                  <Ionicons
                    name={goal.expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.secondaryText}
                  />
                </View>
              </Pressable>

              <TextInput
                style={inputStyle()}
                value={goal.name}
                onChangeText={(v) => updateGoal(index, 'name', v)}
                placeholder="Goal name *"
                placeholderTextColor={colors.placeholder}
              />

              {goal.expanded && (
                <>
                  <TextInput
                    style={inputStyle(styles.multiline)}
                    value={goal.outcome}
                    onChangeText={(v) => updateGoal(index, 'outcome', v)}
                    placeholder="Specific outcome (optional)"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={inputStyle(styles.multiline)}
                    value={goal.why}
                    onChangeText={(v) => updateGoal(index, 'why', v)}
                    placeholder="Why is this important? (optional)"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={inputStyle(styles.multiline)}
                    value={goal.consequences}
                    onChangeText={(v) => updateGoal(index, 'consequences', v)}
                    placeholder="Consequences of not achieving? (optional)"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}
            </View>
          ))}

          {goals.length < 5 && (
            <Pressable
              onPress={addGoal}
              style={({ pressed }) => [
                styles.addButton,
                {
                  borderColor: colors.tint,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={20} color={colors.tint} />
              <Text style={[styles.addButtonText, { color: colors.tint }]}>
                Add Another Goal
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleNext}
            disabled={!hasValidGoal}
            style={({ pressed }) => [
              styles.nextButton,
              {
                opacity: !hasValidGoal ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    padding: Layout.spacing.xl,
    paddingBottom: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
  },
  scrollContent: {
    padding: Layout.spacing.md,
    paddingTop: 0,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  goalNumber: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  goalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    backgroundColor: 'transparent',
  },
  removeButton: {
    padding: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.body,
    marginBottom: Layout.spacing.sm,
  },
  multiline: {
    minHeight: 60,
    paddingTop: Layout.spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  addButtonText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
    marginLeft: Layout.spacing.sm,
  },
  footer: {
    padding: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
});
