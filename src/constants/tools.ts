import { ToolDefinition, BreathingPreset } from '../types';

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
