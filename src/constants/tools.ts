import { ToolDefinition, BreathingPreset, DeadlineReminderType } from '../types';

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'memento-mori',
    name: 'Memento Mori',
    tagline: 'Remember your mortality',
    icon: 'hourglass-outline',
    description:
      'Visualize your life in weeks, months, and seasons. Set your birthday and life expectancy to see time in perspective.',
  },
  {
    id: 'goals',
    name: 'Goals',
    tagline: 'Track what matters',
    icon: 'flag-outline',
    description:
      'Define up to 5 meaningful goals with outcomes, reasons, and consequences. Review them daily with an immersive reveal.',
  },
  {
    id: 'affirmations',
    name: 'Affirmations',
    tagline: 'Speak your truth',
    icon: 'heart-outline',
    description:
      'Create a list of personal affirmations. See them in a scrollable carousel on your home screen.',
  },
  {
    id: 'breathing',
    name: 'Breathing Exercise',
    tagline: 'Breathe with intention',
    icon: 'leaf-outline',
    description:
      'Guided breathing exercises with multiple presets. Box breathing, 4-7-8 relaxation, and deep breathing.',
  },
  {
    id: 'focus-timer',
    name: 'Focus Timer',
    tagline: 'Deep work, timed',
    icon: 'timer-outline',
    description:
      'A countdown timer for focused work sessions. Set your duration, start the timer, and let the full-screen countdown keep you on track.',
  },
  {
    id: 'deadline-tracker',
    name: 'Deadline Tracker',
    tagline: 'Never miss a date',
    icon: 'calendar-outline',
    description:
      'Track up to 10 deadlines with color-coded cards. Set reminders so nothing slips through the cracks.',
  },
  {
    id: 'streak-tracker',
    name: 'Streak Tracker',
    tagline: 'Keep the fire burning',
    icon: 'flame-outline',
    description:
      'Track your daily streaks and build consistency. See how many days you\'ve kept each habit alive.',
  },
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    tagline: 'Start your day with intention',
    icon: 'sunny-outline',
    description:
      'Build your ideal morning routine from preset and custom cards. Play through them step by step each morning.',
  },
  {
    id: 'evening-routine',
    name: 'Evening Routine',
    tagline: 'End your day mindfully',
    icon: 'moon-outline',
    description:
      'Wind down with a guided evening routine. Customize your steps and play through them each night.',
  },
];

export const FOCUS_TIMER_PRESETS = [
  { label: '5 min', seconds: 5 * 60 },
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
];

export const BREATHING_PRESETS: BreathingPreset[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: '4-4-4-4 pattern used by Navy SEALs',
    phases: [
      { label: 'Inhale', durationSeconds: 4 },
      { label: 'Hold', durationSeconds: 4 },
      { label: 'Exhale', durationSeconds: 4 },
      { label: 'Hold', durationSeconds: 4 },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Relaxation',
    description: 'Calming technique for sleep and anxiety',
    phases: [
      { label: 'Inhale', durationSeconds: 4 },
      { label: 'Hold', durationSeconds: 7 },
      { label: 'Exhale', durationSeconds: 8 },
    ],
  },
  {
    id: 'deep',
    name: 'Deep Breathing',
    description: 'Simple 4-6 deep breathing',
    phases: [
      { label: 'Inhale', durationSeconds: 4 },
      { label: 'Exhale', durationSeconds: 6 },
    ],
  },
];

export const DEADLINE_COLORS = [
  { id: 'slate', light: '#64748B', dark: '#94A3B8', label: 'Slate' },
  { id: 'rose', light: '#E11D48', dark: '#FB7185', label: 'Rose' },
  { id: 'amber', light: '#D97706', dark: '#FBBF24', label: 'Amber' },
  { id: 'emerald', light: '#059669', dark: '#34D399', label: 'Emerald' },
  { id: 'sky', light: '#0284C7', dark: '#38BDF8', label: 'Sky' },
  { id: 'violet', light: '#7C3AED', dark: '#A78BFA', label: 'Violet' },
  { id: 'pink', light: '#DB2777', dark: '#F472B6', label: 'Pink' },
  { id: 'teal', light: '#0D9488', dark: '#2DD4BF', label: 'Teal' },
];

export const DEADLINE_REMINDER_OPTIONS: { value: DeadlineReminderType; label: string }[] = [
  { value: '1-week', label: '1 week before' },
  { value: '3-days', label: '3 days before' },
  { value: '1-day', label: '1 day before' },
];
