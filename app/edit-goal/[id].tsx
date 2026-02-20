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
  View as RNView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useGoals } from '@/src/hooks/useGoals';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { DEADLINE_COLORS } from '@/src/constants/tools';

type Point = { x: number; y: number };

function SignaturePreview({
  signature,
  onClear,
  colors,
}: {
  signature: string;
  onClear: () => void;
  colors: typeof Colors.light;
}) {
  let paths: Point[][] = [];
  try {
    const parsed = JSON.parse(signature);
    paths = parsed.paths ?? [];
  } catch {
    return null;
  }

  function pointsToSvgPath(pts: Point[]): string {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  }

  return (
    <RNView>
      <RNView
        style={[
          styles.sigPreview,
          { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
        ]}
      >
        <Svg width="100%" height={120}>
          {paths.filter((p) => p.length >= 2).map((pts, i) => (
            <Path
              key={i}
              d={pointsToSvgPath(pts)}
              stroke={colors.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </RNView>
      <Pressable onPress={onClear} hitSlop={8} style={styles.clearSigBtn}>
        <Text style={[styles.clearSigText, { color: colors.destructive }]}>
          Clear Signature
        </Text>
      </Pressable>
    </RNView>
  );
}

export default function EditGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, updateGoal, deleteGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const existingGoal = goals.find((g) => g.id === id);

  const [name, setName] = useState(existingGoal?.name ?? '');
  const [outcome, setOutcome] = useState(existingGoal?.outcome ?? '');
  const [why, setWhy] = useState(existingGoal?.why ?? '');
  const [consequences, setConsequences] = useState(existingGoal?.consequences ?? '');
  const [measurement, setMeasurement] = useState(existingGoal?.measurement ?? '');
  const [dueDate, setDueDate] = useState<Date>(
    existingGoal?.dueDate ? new Date(existingGoal.dueDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );
  const [color, setColor] = useState<string | undefined>(existingGoal?.color);
  const [signature, setSignature] = useState<string | undefined>(existingGoal?.signature);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');

  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const handleSave = () => {
    if (!name.trim() || !existingGoal) return;
    updateGoal(existingGoal.id, {
      name: name.trim(),
      color,
      outcome: outcome.trim() || undefined,
      why: why.trim() || undefined,
      consequences: consequences.trim() || undefined,
      measurement: measurement.trim() || undefined,
      dueDate: dueDate.toISOString(),
      signature,
    });
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Goal</Text>
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
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <RNView style={styles.colorRow}>
              {DEADLINE_COLORS.map((c) => {
                const chipColor = colorScheme === 'dark' ? c.dark : c.light;
                const selected = color === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setColor(c.id)}
                    style={[
                      styles.colorChip,
                      { backgroundColor: chipColor },
                      selected && { borderColor: colors.text, borderWidth: 2 },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={colors.text} />
                    )}
                  </Pressable>
                );
              })}
            </RNView>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Specific Outcome</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Target Date</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              >
                <Text style={[styles.dateButtonText, { color: colors.tint }]}>{formatDate(dueDate)}</Text>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setDueDate(selected);
                }}
                themeVariant={colorScheme}
              />
            )}
            {Platform.OS === 'ios' && (
              <Text style={[styles.dateLabel, { color: colors.secondaryText }]}>{formatDate(dueDate)}</Text>
            )}
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
            <Text style={[styles.label, { color: colors.text }]}>Consequences</Text>
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

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Measurement</Text>
            <TextInput
              style={inputStyle(styles.multiline)}
              value={measurement}
              onChangeText={setMeasurement}
              placeholder="How will you track progress?"
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          {signature ? (
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Commitment Signature</Text>
              <SignaturePreview
                signature={signature}
                onClear={() => setSignature(undefined)}
                colors={colors}
              />
            </View>
          ) : null}

          {existingGoal && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.deleteButtonText, { color: colors.destructive }]}>
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
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    backgroundColor: 'transparent',
  },
  headerButton: { fontSize: Layout.fontSize.body },
  headerButtonBold: { fontWeight: '600' },
  headerTitle: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  scrollContent: { padding: Layout.spacing.md },
  fieldContainer: { marginBottom: Layout.spacing.lg, backgroundColor: 'transparent' },
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
  multiline: { minHeight: 80, paddingTop: Layout.spacing.md },
  dateButton: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  dateLabel: { fontSize: Layout.fontSize.caption, marginTop: Layout.spacing.xs },
  sigPreview: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    height: 120,
  },
  clearSigBtn: { alignSelf: 'center', marginTop: Layout.spacing.sm },
  clearSigText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  deleteButtonText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
});
