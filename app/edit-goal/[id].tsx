import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { useGoals } from '@/src/hooks/useGoals';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, addGoal, updateGoal, deleteGoal, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isNew = id === 'new';
  const existingGoal = !isNew ? goals.find((g) => g.id === id) : undefined;

  const [name, setName] = useState(existingGoal?.name ?? '');
  const [outcome, setOutcome] = useState(existingGoal?.outcome ?? '');
  const [why, setWhy] = useState(existingGoal?.why ?? '');
  const [consequences, setConsequences] = useState(
    existingGoal?.consequences ?? ''
  );

  const handleSave = () => {
    if (!name.trim()) return;

    if (isNew) {
      if (!canAddGoal) {
        Alert.alert('Limit Reached', 'You can have a maximum of 5 goals.');
        return;
      }
      addGoal({
        name: name.trim(),
        outcome: outcome.trim() || undefined,
        why: why.trim() || undefined,
        consequences: consequences.trim() || undefined,
      });
    } else if (existingGoal) {
      updateGoal(existingGoal.id, {
        name: name.trim(),
        outcome: outcome.trim() || undefined,
        why: why.trim() || undefined,
        consequences: consequences.trim() || undefined,
      });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingGoal) return;
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${existingGoal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGoal(existingGoal.id);
            router.back();
          },
        },
      ]
    );
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
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>
            Cancel
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isNew ? 'New Goal' : 'Edit Goal'}
        </Text>
        <Pressable onPress={handleSave} disabled={!name.trim()}>
          <Text
            style={[
              styles.headerButton,
              styles.headerButtonBold,
              { color: colors.tint, opacity: name.trim() ? 1 : 0.4 },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Goal Name <Text style={{ color: colors.destructive }}>*</Text>
            </Text>
            <TextInput
              style={inputStyle()}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Run a marathon"
              placeholderTextColor={colors.placeholder}
              autoFocus={isNew}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Specific Outcome
            </Text>
            <TextInput
              style={inputStyle(styles.multiline)}
              value={outcome}
              onChangeText={setOutcome}
              placeholder="What does achieving this look like?"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Why</Text>
            <TextInput
              style={inputStyle(styles.multiline)}
              value={why}
              onChangeText={setWhy}
              placeholder="Why is this important to you?"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Consequences
            </Text>
            <TextInput
              style={inputStyle(styles.multiline)}
              value={consequences}
              onChangeText={setConsequences}
              placeholder="What happens if you don't achieve this?"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          {!isNew && existingGoal && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text
                style={[styles.deleteButtonText, { color: colors.destructive }]}
              >
                Delete Goal
              </Text>
            </Pressable>
          )}
        </ScrollView>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  headerButton: {
    fontSize: Layout.fontSize.body,
  },
  headerButtonBold: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },
  scrollContent: {
    padding: Layout.spacing.md,
  },
  fieldContainer: {
    marginBottom: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.body,
  },
  multiline: {
    minHeight: 80,
    paddingTop: Layout.spacing.md,
  },
  deleteButton: {
    alignItems: 'center',
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  deleteButtonText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
  },
});
