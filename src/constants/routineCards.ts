import { RoutinePresetCard } from '../types';

export const ROUTINE_PRESET_CARDS: RoutinePresetCard[] = [
  // === MORNING ===
  {
    id: 'morning-hydrate',
    title: 'Drink Water',
    description: 'Drink a full glass of water to rehydrate after sleep.',
    category: 'morning',
  },
  {
    id: 'morning-sunlight',
    title: 'Get Sunlight',
    description: 'Step outside or open your curtains. Morning sunlight resets your circadian rhythm.',
    category: 'morning',
  },
  {
    id: 'morning-stretch',
    title: 'Morning Stretch',
    description: 'Spend 5 minutes stretching to wake up your body and loosen stiff muscles.',
    category: 'morning',
  },
  {
    id: 'morning-bed',
    title: 'Make Your Bed',
    description: 'A small win to start the day. It sets the tone for discipline and order.',
    category: 'morning',
  },
  {
    id: 'morning-cold-shower',
    title: 'Cold Shower',
    description: 'A brief cold shower boosts alertness, mood, and circulation.',
    category: 'morning',
  },
  {
    id: 'morning-intentions',
    title: 'Set Intentions',
    description: 'Choose 1-3 priorities for today. What must get done?',
    category: 'morning',
  },
  {
    id: 'morning-breakfast',
    title: 'Healthy Breakfast',
    description: 'Fuel your body with a nutritious meal to sustain energy through the morning.',
    category: 'morning',
  },
  {
    id: 'morning-walk',
    title: 'Morning Walk',
    description: 'A short walk outside combines movement, sunlight, and fresh air.',
    category: 'morning',
  },
  {
    id: 'morning-calendar',
    title: 'Review Calendar',
    description: 'Glance at your schedule so there are no surprises today.',
    category: 'morning',
  },
  {
    id: 'morning-read',
    title: 'Read',
    description: 'Read for 10-15 minutes. Start the day with ideas, not notifications.',
    category: 'morning',
  },
  {
    id: 'morning-visualize',
    title: 'Visualize Your Day',
    description: 'Close your eyes and walk through your ideal day from start to finish.',
    category: 'morning',
  },
  {
    id: 'morning-skincare',
    title: 'Morning Skincare',
    description: 'Cleanse, moisturize, and apply sunscreen. Take care of your skin.',
    category: 'morning',
  },
  {
    id: 'morning-no-phone',
    title: 'No Phone for 30 Min',
    description: 'Avoid checking your phone for the first 30 minutes. Protect your attention.',
    category: 'morning',
  },
  {
    id: 'morning-movement',
    title: 'Exercise',
    description: 'Get your heart rate up. Even 10 minutes of movement makes a difference.',
    category: 'morning',
  },

  // === EVENING ===
  {
    id: 'evening-review',
    title: 'Daily Review',
    description: 'Reflect on what went well today and what you learned.',
    category: 'evening',
  },
  {
    id: 'evening-screens-off',
    title: 'Screens Off',
    description: 'Put away all screens at least 30 minutes before bed. Blue light disrupts sleep.',
    category: 'evening',
  },
  {
    id: 'evening-tomorrow',
    title: 'Plan Tomorrow',
    description: 'Write down your top priorities for tomorrow so your mind can rest.',
    category: 'evening',
  },
  {
    id: 'evening-dim-lights',
    title: 'Dim the Lights',
    description: 'Reduce light exposure to signal your body it is time to wind down.',
    category: 'evening',
  },
  {
    id: 'evening-tidy',
    title: 'Tidy Up',
    description: 'Spend 10 minutes tidying your space. A clean environment supports restful sleep.',
    category: 'evening',
  },
  {
    id: 'evening-walk',
    title: 'Evening Walk',
    description: 'A gentle walk after dinner aids digestion and clears the mind.',
    category: 'evening',
  },
  {
    id: 'evening-music',
    title: 'Wind Down Music',
    description: 'Play calm music or ambient sounds to ease into relaxation.',
    category: 'evening',
  },
  {
    id: 'evening-prepare',
    title: 'Prepare for Bed',
    description: 'Brush teeth, wash face, change into sleepwear. Build a consistent pre-sleep ritual.',
    category: 'evening',
  },
  {
    id: 'evening-gratitude',
    title: 'Gratitude Journal',
    description: 'Write down three things you are grateful for from today.',
    category: 'evening',
  },
  {
    id: 'evening-read',
    title: 'Read',
    description: 'Read a physical book for 15-20 minutes. Fiction works especially well before sleep.',
    category: 'evening',
  },
  {
    id: 'evening-skincare',
    title: 'Night Skincare',
    description: 'Cleanse and moisturize. Let your skin recover overnight.',
    category: 'evening',
  },
  {
    id: 'evening-reflect',
    title: 'Reflect on the Day',
    description: 'What was the highlight of your day? What would you do differently?',
    category: 'evening',
  },
  {
    id: 'evening-tea',
    title: 'Herbal Tea',
    description: 'Sip a cup of caffeine-free herbal tea. Chamomile and lavender promote relaxation.',
    category: 'evening',
  },
  {
    id: 'evening-stretch',
    title: 'Evening Stretch',
    description: 'Gentle stretching or yoga to release tension from the day.',
    category: 'evening',
  },

  // === GENERAL ===
  {
    id: 'general-gratitude',
    title: 'Gratitude',
    description: 'Name three things you are grateful for right now.',
    category: 'general',
  },
  {
    id: 'general-breathe',
    title: 'Deep Breathing',
    description: 'Take 10 slow, deep breaths. Inhale for 4 counts, exhale for 6.',
    category: 'general',
  },
  {
    id: 'general-journal',
    title: 'Journal',
    description: 'Free-write for 5 minutes. No rules, just let your thoughts flow.',
    category: 'general',
  },
  {
    id: 'general-meditate',
    title: 'Meditate',
    description: 'Sit quietly for 5-10 minutes. Focus on your breath and let thoughts pass.',
    category: 'general',
  },
  {
    id: 'general-affirmations',
    title: 'Affirmations',
    description: 'Read or speak your personal affirmations aloud with conviction.',
    category: 'general',
  },
  {
    id: 'general-body-scan',
    title: 'Body Scan',
    description: 'Close your eyes and slowly scan from head to toe, noticing any tension.',
    category: 'general',
  },
  {
    id: 'general-water',
    title: 'Drink Water',
    description: 'Stay hydrated. Pour yourself a glass of water right now.',
    category: 'general',
  },
  {
    id: 'general-connect',
    title: 'Connect with Someone',
    description: 'Send a message or call someone you care about. Human connection matters.',
    category: 'general',
  },
  {
    id: 'general-learn',
    title: 'Learn Something',
    description: 'Spend 10 minutes learning something new. A podcast, article, or video.',
    category: 'general',
  },
  {
    id: 'general-digital-declutter',
    title: 'Digital Declutter',
    description: 'Clear notifications, close tabs, delete unused apps. Simplify your digital space.',
    category: 'general',
  },
  {
    id: 'general-mindful-moment',
    title: 'Mindful Moment',
    description: 'Pause for 60 seconds. Notice your surroundings using all five senses.',
    category: 'general',
  },
  {
    id: 'general-posture',
    title: 'Posture Check',
    description: 'Sit or stand tall. Roll your shoulders back and relax your jaw.',
    category: 'general',
  },
];

export function getPresetsForRoutine(routineType: 'morning' | 'evening'): RoutinePresetCard[] {
  return ROUTINE_PRESET_CARDS.filter(
    (c) => c.category === routineType || c.category === 'general'
  );
}

export function getPresetById(id: string): RoutinePresetCard | undefined {
  return ROUTINE_PRESET_CARDS.find((c) => c.id === id);
}
