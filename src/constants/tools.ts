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
    id: 'routines',
    name: 'Routines',
    tagline: 'Build your daily rituals',
    icon: 'repeat-outline',
    description:
      'Create up to 5 custom routines with your own steps. Play through them one card at a time.',
  },
  {
    id: 'tally-counter',
    name: 'Tally Counter',
    tagline: 'Count what matters',
    icon: 'add-circle-outline',
    description:
      'Track anything with a simple tap counter. Add multiple counters, color-code them, and increment or decrement with a swipe.',
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
  { id: 'teal',      light: '#7ECECE', dark: '#7ECECE', label: 'Teal' },
  { id: 'turquoise', light: '#6DC8A8', dark: '#6DC8A8', label: 'Turquoise' },
  { id: 'matcha',    light: '#B8D4A0', dark: '#B8D4A0', label: 'Matcha' },
  { id: 'sunshine',  light: '#F5C97A', dark: '#F5C97A', label: 'Sunshine' },
  { id: 'peach',     light: '#F4A8B8', dark: '#F4A8B8', label: 'Peach' },
  { id: 'lilac',     light: '#C4A8E0', dark: '#C4A8E0', label: 'Lilac' },
  { id: 'pearl',     light: '#E0DEDD', dark: '#E0DEDD', label: 'Pearl' },
  { id: 'pebble',    light: '#9E9E9E', dark: '#9E9E9E', label: 'Pebble' },
];

export const ROUTINE_ICONS = [
  'sunny-outline', 'moon-outline', 'flame-outline', 'fitness-outline',
  'book-outline', 'cafe-outline', 'bicycle-outline', 'barbell-outline',
  'leaf-outline', 'heart-outline', 'water-outline', 'musical-notes-outline',
  'walk-outline', 'bed-outline', 'briefcase-outline', 'school-outline',
];

export const DEADLINE_REMINDER_OPTIONS: { value: DeadlineReminderType; label: string }[] = [
  { value: '1-week', label: '1 week before' },
  { value: '3-days', label: '3 days before' },
  { value: '1-day', label: '1 day before' },
];
