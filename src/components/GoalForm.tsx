import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

interface GoalFormValues {
  name: string;
  outcome: string;
  why: string;
  consequences: string;
}

interface GoalFormProps {
  initialValues?: Partial<GoalFormValues>;
  onSubmit: (values: GoalFormValues) => void;
  submitLabel?: string;
}

export function GoalForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save',
}: GoalFormProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState(initialValues?.name ?? '');
  const [outcome, setOutcome] = useState(initialValues?.outcome ?? '');
  const [why, setWhy] = useState(initialValues?.why ?? '');
  const [consequences, setConsequences] = useState(
    initialValues?.consequences ?? ''
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      outcome: outcome.trim(),
      why: why.trim(),
      consequences: consequences.trim(),
    });
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Goal Name <Text style={{ color: colors.destructive }}>*</Text>
          </Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Run a marathon"
            placeholderTextColor={colors.placeholder}
            autoFocus
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Specific Outcome
          </Text>
          <Text style={[styles.hint, { color: colors.secondaryText }]}>
            What does achieving this goal look like?
          </Text>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            value={outcome}
            onChangeText={setOutcome}
            placeholder="e.g., Complete a full 26.2 mile marathon in under 4 hours"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Why</Text>
          <Text style={[styles.hint, { color: colors.secondaryText }]}>
            Why is this goal important to you?
          </Text>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            value={why}
            onChangeText={setWhy}
            placeholder="e.g., To prove to myself I can push through limits"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Consequences
          </Text>
          <Text style={[styles.hint, { color: colors.secondaryText }]}>
            What happens if you don't achieve this?
          </Text>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            value={consequences}
            onChangeText={setConsequences}
            placeholder="e.g., I'll stay stuck in my comfort zone"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Expose a way for parent to get form values and trigger submit
GoalForm.useFormRef = () => {
  const ref = React.useRef<{ submit: () => void } | null>(null);
  return ref;
};

export { type GoalFormValues };

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
  fieldContainer: {
    marginBottom: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
    marginBottom: Layout.spacing.xs,
  },
  hint: {
    fontSize: Layout.fontSize.caption,
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
});
