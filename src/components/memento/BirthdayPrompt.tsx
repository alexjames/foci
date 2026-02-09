import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Pressable, Animated, useColorScheme } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import * as Haptics from 'expo-haptics';

interface BirthdayPromptProps {
  onComplete: (date: Date) => void;
  lifeExpectancy: number;
}

export function BirthdayPrompt({ onComplete, lifeExpectancy }: BirthdayPromptProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const opacity = useRef(new Animated.Value(0)).current;

  const thirtyYearsAgo = new Date();
  thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
  const [selectedDate, setSelectedDate] = useState(thirtyYearsAgo);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setSelectedDate(date);
  };

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete(selectedDate);
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity }]}>
      <Ionicons name="hourglass" size={64} color={colors.tint} style={styles.icon} />
      <Text style={[styles.title, { color: colors.text }]}>When were you born?</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Based on a life expectancy of {lifeExpectancy} years, this calculates your memento mori — a reflection on the time you have. You can change this in Settings.
      </Text>

      <View style={[styles.pickerCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
          onChange={handleDateChange}
        />
      </View>

      <Pressable
        onPress={handleConfirm}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },
  icon: {
    marginBottom: Layout.spacing.lg,
  },
  title: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.body,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
    lineHeight: 22,
  },
  pickerCard: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Layout.spacing.xl,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Layout.spacing.xxl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
});
