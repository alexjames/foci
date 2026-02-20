import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { useGoals } from '@/src/hooks/useGoals';

// ─── Types ───────────────────────────────────────────────────────────────────

type GateAnswer = 'yes' | 'no' | 'not-sure' | null;

type WizardData = {
  name: string;
  outcome: string;
  dueDate: Date;
  why: string;
  consequences: string;
  measurement: string;
  able: GateAnswer;
  willing: GateAnswer;
  signature: string | null;
};

type StepId =
  | 'intro'
  | 'name'
  | 'outcome'
  | 'dueDate'
  | 'why'
  | 'consequences'
  | 'measurement'
  | 'able'
  | 'willing'
  | 'adjust'
  | 'signature';

type Point = { x: number; y: number };

// ─── Step Sequence ────────────────────────────────────────────────────────────

const BASE_STEPS: StepId[] = [
  'intro', 'name', 'outcome', 'dueDate', 'why',
  'consequences', 'measurement', 'able', 'willing',
];

function buildStepSequence(able: GateAnswer, willing: GateAnswer): StepId[] {
  const needsAdjust =
    able === 'no' || able === 'not-sure' ||
    willing === 'no' || willing === 'not-sure';
  return needsAdjust ? [...BASE_STEPS, 'adjust'] : [...BASE_STEPS, 'signature'];
}

// ─── SVG Drawing ─────────────────────────────────────────────────────────────

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

// ─── Shared Sub-components ───────────────────────────────────────────────────

function ProgressBar({
  currentStep,
  totalSteps,
  colors,
}: {
  currentStep: number;
  totalSteps: number;
  colors: typeof Colors.light;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Don't show progress for intro (step 0); start at step 1
    const fraction = currentStep <= 0 ? 0 : currentStep / (totalSteps - 1);
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, widthAnim]);

  if (currentStep === 0) return <View style={styles.progressPlaceholder} />;

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.separator }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.tint,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

function WizardNavButtons({
  onBack,
  onNext,
  canProceed,
  nextLabel = 'Continue',
  backLabel,
  colors,
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  nextLabel?: string;
  backLabel?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.navRow}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        {backLabel ? (
          <Text style={[styles.backLabel, { color: colors.secondaryText }]}>{backLabel}</Text>
        ) : (
          <Ionicons name="chevron-back" size={28} color={colors.secondaryText} />
        )}
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={!canProceed}
        style={[
          styles.nextBtn,
          { backgroundColor: colors.tint, opacity: canProceed ? 1 : 0.35 },
        ]}
      >
        <Text style={styles.nextBtnText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function IntroStep({
  onNext,
  onCancel,
  colors,
}: {
  onNext: () => void;
  onCancel: () => void;
  colors: typeof Colors.light;
}) {
  const items = [
    { letter: 'S', word: 'Specific', desc: 'Clear and well-defined' },
    { letter: 'M', word: 'Measurable', desc: 'Track progress with evidence' },
    { letter: 'A', word: 'Achievable', desc: 'Realistic and attainable' },
    { letter: 'R', word: 'Relevant', desc: 'Aligned with your values' },
    { letter: 'T', word: 'Time-Bound', desc: 'Has a clear deadline' },
  ];

  return (
    <View style={styles.stepOuter}>
      <View style={styles.stepContent}>
        <Text style={[styles.introTitle, { color: colors.text }]}>
          Setting a SMART Goal
        </Text>
        <Text style={[styles.introSubtitle, { color: colors.secondaryText }]}>
          Goals with the highest likelihood of success are SMART.
        </Text>
        <View style={[styles.smartCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          {items.map((item) => (
            <View key={item.letter} style={styles.smartRow}>
              <Text style={[styles.smartLetter, { color: colors.tint }]}>{item.letter}</Text>
              <View style={styles.smartTextCol}>
                <Text style={[styles.smartWord, { color: colors.text }]}>{item.word}</Text>
                <Text style={[styles.smartDesc, { color: colors.secondaryText }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.introNavRow}>
        <Pressable onPress={onCancel} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backLabel, { color: colors.secondaryText }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onNext} style={[styles.nextBtn, { backgroundColor: colors.tint }]}>
          <Text style={styles.nextBtnText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TextStep({
  question,
  hint,
  value,
  onChangeText,
  onNext,
  onBack,
  canProceed,
  placeholder,
  colors,
}: {
  question: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  placeholder: string;
  colors: typeof Colors.light;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepOuter}
    >
      <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.stepQuestion, { color: colors.text }]}>{question}</Text>
        {hint ? (
          <Text style={[styles.stepHint, { color: colors.secondaryText }]}>{hint}</Text>
        ) : null}
        <TextInput
          style={[
            styles.stepInput,
            { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryText}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </ScrollView>
      <WizardNavButtons onBack={onBack} onNext={onNext} canProceed={canProceed} colors={colors} />
    </KeyboardAvoidingView>
  );
}

function DueDateStep({
  value,
  onChange,
  onNext,
  onBack,
  colors,
  colorScheme,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onNext: () => void;
  onBack: () => void;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}) {
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <View style={styles.stepOuter}>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={[styles.stepQuestion, { color: colors.text }]}>
          By when will you complete this?
        </Text>
        {Platform.OS === 'android' && (
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.dateButton, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.dateButtonText, { color: colors.tint }]}>{formatDate(value)}</Text>
          </Pressable>
        )}
        {showPicker && (
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_, selected) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (selected) onChange(selected);
            }}
            themeVariant={colorScheme}
            style={styles.datePicker}
          />
        )}
        {Platform.OS === 'ios' && (
          <Text style={[styles.dateSelectedLabel, { color: colors.secondaryText }]}>
            {formatDate(value)}
          </Text>
        )}
      </ScrollView>
      <WizardNavButtons onBack={onBack} onNext={onNext} canProceed colors={colors} />
    </View>
  );
}

function GateStep({
  question,
  value,
  onSelect,
  onBack,
  colors,
}: {
  question: string;
  value: GateAnswer;
  onSelect: (v: NonNullable<GateAnswer>) => void;
  onBack: () => void;
  colors: typeof Colors.light;
}) {
  const options: { label: string; value: NonNullable<GateAnswer> }[] = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Not Sure', value: 'not-sure' },
  ];

  return (
    <View style={styles.stepOuter}>
      <View style={styles.stepContent}>
        <Text style={[styles.stepQuestion, { color: colors.text }]}>{question}</Text>
        <View style={styles.optionsCol}>
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selected ? colors.tint : colors.cardBackground,
                    borderColor: selected ? colors.tint : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.optionLabel, { color: selected ? '#fff' : colors.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.navRow}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.secondaryText} />
        </Pressable>
      </View>
    </View>
  );
}

function AdjustStep({
  onRestart,
  onBack,
  colors,
}: {
  onRestart: () => void;
  onBack: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.stepOuter}>
      <View style={[styles.stepContent, styles.adjustContent]}>
        <Ionicons name="refresh-circle-outline" size={64} color={colors.secondaryText} />
        <Text style={[styles.stepQuestion, { color: colors.text, textAlign: 'center', marginTop: Layout.spacing.lg }]}>
          Take some time to adjust your goal.
        </Text>
        <Text style={[styles.stepHint, { color: colors.secondaryText, textAlign: 'center' }]}>
          A goal works best when you are both able and willing to achieve it.
        </Text>
        <Pressable
          onPress={onRestart}
          style={[styles.nextBtn, styles.adjustBtn, { backgroundColor: colors.tint }]}
        >
          <Text style={styles.nextBtnText}>Revise My Goal</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.ghostBtn} hitSlop={8}>
          <Text style={[styles.ghostBtnText, { color: colors.tint }]}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const CANVAS_HEIGHT = 220;

function SignatureStep({
  signature,
  onSignatureChange,
  onCommit,
  onBack,
  colors,
}: {
  signature: string | null;
  onSignatureChange: (sig: string | null) => void;
  onCommit: () => void;
  onBack: () => void;
  colors: typeof Colors.light;
}) {
  const canvasWidth = Dimensions.get('window').width - Layout.spacing.md * 2;
  const [completedPaths, setCompletedPaths] = useState<Point[][]>([]);
  const [renderCount, setRenderCount] = useState(0);
  const activePathRef = useRef<Point[]>([]);
  const pointCounterRef = useRef(0);

  const hasSignature = completedPaths.some((p) => p.length >= 2);

  useEffect(() => {
    const sigData = completedPaths.some((p) => p.length >= 2)
      ? JSON.stringify({ paths: completedPaths, viewBox: `0 0 ${canvasWidth} ${CANVAS_HEIGHT}` })
      : null;
    onSignatureChange(sigData);
  }, [completedPaths, canvasWidth, onSignatureChange]);

  const handleGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { x, y } = event.nativeEvent;
    activePathRef.current.push({ x, y });
    pointCounterRef.current += 1;
    if (pointCounterRef.current % 5 === 0) {
      setRenderCount((n) => n + 1);
    }
  }, []);

  const handleStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { state, x, y } = event.nativeEvent;
    if (state === State.BEGAN) {
      activePathRef.current = [{ x, y }];
      pointCounterRef.current = 0;
    } else if (state === State.END || state === State.CANCELLED) {
      const finished = [...activePathRef.current];
      activePathRef.current = [];
      setCompletedPaths((prev) => [...prev, finished]);
      setRenderCount((n) => n + 1);
    }
  }, []);

  const handleClear = () => {
    activePathRef.current = [];
    setCompletedPaths([]);
    onSignatureChange(null);
    setRenderCount((n) => n + 1);
  };

  const allPaths = [...completedPaths, activePathRef.current].filter((p) => p.length >= 2);

  return (
    <View style={styles.stepOuter}>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={[styles.stepQuestion, { color: colors.text }]}>
          Commit to this goal.
        </Text>
        <Text style={[styles.stepHint, { color: colors.secondaryText }]}>
          Sign below to make your commitment real.
        </Text>

        <View
          style={[
            styles.signatureCanvas,
            { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
          ]}
        >
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
            minDist={0}
          >
            <View style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
              <Svg width={canvasWidth} height={CANVAS_HEIGHT} key={renderCount}>
                {allPaths.map((pts, i) => (
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
            </View>
          </PanGestureHandler>
        </View>

        {hasSignature && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Text style={[styles.clearBtnText, { color: colors.tint }]}>Clear</Text>
          </Pressable>
        )}
      </ScrollView>
      <WizardNavButtons
        onBack={onBack}
        onNext={onCommit}
        canProceed={hasSignature}
        nextLabel="I Commit"
        colors={colors}
      />
    </View>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function NewGoalWizard() {
  const router = useRouter();
  const { addGoal, canAddGoal } = useGoals();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const SCREEN_WIDTH = Dimensions.get('window').width;

  const [data, setData] = useState<WizardData>({
    name: '',
    outcome: '',
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    why: '',
    consequences: '',
    measurement: '',
    able: null,
    willing: null,
    signature: null,
  });

  const stepSequence = useMemo(
    () => buildStepSequence(data.able, data.willing),
    [data.able, data.willing]
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goToStep = useCallback(
    (nextIndex: number, direction: 'forward' | 'backward') => {
      const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
      Animated.timing(slideAnim, {
        toValue,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(-toValue);
        setCurrentStepIndex(nextIndex);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim, SCREEN_WIDTH]
  );

  const goForward = useCallback(() => {
    if (currentStepIndex < stepSequence.length - 1) {
      goToStep(currentStepIndex + 1, 'forward');
    }
  }, [currentStepIndex, stepSequence.length, goToStep]);

  const goBackward = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1, 'backward');
    } else {
      router.back();
    }
  }, [currentStepIndex, goToStep, router]);

  const handleGateSelect = useCallback(
    (field: 'able' | 'willing', value: NonNullable<GateAnswer>) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setTimeout(goForward, 200);
    },
    [goForward]
  );

  const handleRestart = useCallback(() => {
    setData((prev) => ({ ...prev, able: null, willing: null }));
    // Animate back to name step (index 1)
    slideAnim.setValue(SCREEN_WIDTH);
    setCurrentStepIndex(1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, SCREEN_WIDTH]);

  const handleSignatureChange = useCallback((sig: string | null) => {
    setData((p) => ({ ...p, signature: sig }));
  }, []);

  const handleCommit = useCallback(() => {
    if (!canAddGoal) return;
    addGoal({
      name: data.name.trim(),
      outcome: data.outcome.trim() || undefined,
      why: data.why.trim() || undefined,
      consequences: data.consequences.trim() || undefined,
      dueDate: data.dueDate.toISOString(),
      measurement: data.measurement.trim() || undefined,
      signature: data.signature ?? undefined,
    });
    router.back();
  }, [canAddGoal, addGoal, data, router]);

  const currentStepId = stepSequence[currentStepIndex];

  const renderStep = () => {
    switch (currentStepId) {
      case 'intro':
        return (
          <IntroStep
            onNext={goForward}
            onCancel={() => router.back()}
            colors={colors}
          />
        );
      case 'name':
        return (
          <TextStep
            question="What goal do you want to achieve?"
            value={data.name}
            onChangeText={(v) => setData((p) => ({ ...p, name: v }))}
            onNext={goForward}
            onBack={goBackward}
            canProceed={data.name.trim().length > 0}
            placeholder="e.g., Run a marathon"
            colors={colors}
          />
        );
      case 'outcome':
        return (
          <TextStep
            question="What is the specific outcome of this goal?"
            hint="Describe what success looks like in concrete terms."
            value={data.outcome}
            onChangeText={(v) => setData((p) => ({ ...p, outcome: v }))}
            onNext={goForward}
            onBack={goBackward}
            canProceed={data.outcome.trim().length > 0}
            placeholder="e.g., Complete a 26.2 mile marathon in under 5 hours"
            colors={colors}
          />
        );
      case 'dueDate':
        return (
          <DueDateStep
            value={data.dueDate}
            onChange={(d) => setData((p) => ({ ...p, dueDate: d }))}
            onNext={goForward}
            onBack={goBackward}
            colors={colors}
            colorScheme={colorScheme}
          />
        );
      case 'why':
        return (
          <TextStep
            question="Why is this important to you?"
            value={data.why}
            onChangeText={(v) => setData((p) => ({ ...p, why: v }))}
            onNext={goForward}
            onBack={goBackward}
            canProceed={data.why.trim().length > 0}
            placeholder="e.g., I want to prove to myself I can push physical limits"
            colors={colors}
          />
        );
      case 'consequences':
        return (
          <TextStep
            question="What happens if you don't achieve this?"
            value={data.consequences}
            onChangeText={(v) => setData((p) => ({ ...p, consequences: v }))}
            onNext={goForward}
            onBack={goBackward}
            canProceed={data.consequences.trim().length > 0}
            placeholder="e.g., I'll feel like I gave up on a lifelong dream"
            colors={colors}
          />
        );
      case 'measurement':
        return (
          <TextStep
            question="How will you measure and track progress?"
            value={data.measurement}
            onChangeText={(v) => setData((p) => ({ ...p, measurement: v }))}
            onNext={goForward}
            onBack={goBackward}
            canProceed={data.measurement.trim().length > 0}
            placeholder="e.g., Weekly long runs logged in a training app"
            colors={colors}
          />
        );
      case 'able':
        return (
          <GateStep
            question="Are you able to do what is necessary to get what you want?"
            value={data.able}
            onSelect={(v) => handleGateSelect('able', v)}
            onBack={goBackward}
            colors={colors}
          />
        );
      case 'willing':
        return (
          <GateStep
            question="Are you willing to do what it takes to get what you want?"
            value={data.willing}
            onSelect={(v) => handleGateSelect('willing', v)}
            onBack={goBackward}
            colors={colors}
          />
        );
      case 'adjust':
        return (
          <AdjustStep
            onRestart={handleRestart}
            onBack={goBackward}
            colors={colors}
          />
        );
      case 'signature':
        return (
          <SignatureStep
            signature={data.signature}
            onSignatureChange={handleSignatureChange}
            onCommit={handleCommit}
            onBack={goBackward}
            colors={colors}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ProgressBar
        currentStep={currentStepIndex}
        totalSteps={stepSequence.length}
        colors={colors}
      />
      <Animated.View
        style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}
      >
        {renderStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  progressPlaceholder: { height: 3 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  slideContainer: { flex: 1 },

  stepOuter: { flex: 1 },
  stepContent: {
    padding: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    flexGrow: 1,
  },

  stepQuestion: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
    marginBottom: Layout.spacing.sm,
  },
  stepHint: {
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
    marginBottom: Layout.spacing.lg,
  },
  stepInput: {
    fontSize: Layout.fontSize.body,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    minHeight: 100,
    marginTop: Layout.spacing.md,
  },

  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    paddingBottom: Layout.spacing.xl,
  },
  introNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    paddingBottom: Layout.spacing.xl,
  },
  backBtn: { padding: 4 },
  backLabel: { fontSize: Layout.fontSize.body },
  nextBtn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    minWidth: 120,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: Layout.fontSize.body,
    fontWeight: '600',
  },

  // Intro
  introTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Layout.spacing.sm,
  },
  introSubtitle: {
    fontSize: Layout.fontSize.body,
    lineHeight: 22,
    marginBottom: Layout.spacing.lg,
  },
  smartCard: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    padding: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  smartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.md,
  },
  smartLetter: {
    fontSize: 22,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  smartTextCol: { flex: 1 },
  smartWord: { fontSize: Layout.fontSize.body, fontWeight: '600' },
  smartDesc: { fontSize: Layout.fontSize.caption, marginTop: 1 },

  // Date
  dateButton: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.md,
    alignItems: 'center',
  },
  dateButtonText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
  datePicker: { marginTop: Layout.spacing.md },
  dateSelectedLabel: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
  },

  // Gate
  optionsCol: { marginTop: Layout.spacing.lg, gap: Layout.spacing.md },
  optionCard: {
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionLabel: { fontSize: 18, fontWeight: '500' },

  // Adjust
  adjustContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  adjustBtn: { marginTop: Layout.spacing.xl, alignSelf: 'stretch' },
  ghostBtn: { marginTop: Layout.spacing.md, padding: Layout.spacing.sm },
  ghostBtnText: { fontSize: Layout.fontSize.body, fontWeight: '500' },

  // Signature
  signatureCanvas: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.md,
    overflow: 'hidden',
  },
  clearBtn: { alignSelf: 'center', marginTop: Layout.spacing.sm, padding: 4 },
  clearBtnText: { fontSize: Layout.fontSize.body, fontWeight: '500' },
});
