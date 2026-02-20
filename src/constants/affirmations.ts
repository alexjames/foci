export interface AffirmationCategory {
  id: string;
  label: string;
  items: string[];
}

export const AFFIRMATION_CATEGORIES: AffirmationCategory[] = [
  {
    id: 'self-worth',
    label: 'Self-Worth',
    items: [
      'I am enough exactly as I am.',
      'I deserve love, respect, and kindness.',
      'My value does not depend on my productivity.',
      'I am worthy of good things.',
      'I accept myself fully, including my flaws.',
      'I trust my own judgment.',
    ],
  },
  {
    id: 'resilience',
    label: 'Resilience',
    items: [
      'I can handle whatever comes my way.',
      'Every setback is a setup for a comeback.',
      'I grow stronger through adversity.',
      'I have overcome hard things before and I will again.',
      'My struggles do not define me — my response does.',
      'I am more resilient than I realize.',
    ],
  },
  {
    id: 'mindset',
    label: 'Growth Mindset',
    items: [
      'I embrace challenges as opportunities to grow.',
      'Mistakes are proof that I am trying.',
      'I am always learning and improving.',
      'Progress matters more than perfection.',
      'Every day I become a better version of myself.',
      'My potential is limitless.',
    ],
  },
  {
    id: 'calm',
    label: 'Calm & Clarity',
    items: [
      'I choose peace over worry.',
      'I release what I cannot control.',
      'I breathe deeply and return to the present.',
      'My mind is clear and focused.',
      'I am calm in the face of uncertainty.',
      'This moment is enough.',
    ],
  },
  {
    id: 'purpose',
    label: 'Purpose',
    items: [
      'My work matters.',
      'I am making a meaningful contribution.',
      'I am exactly where I need to be right now.',
      'I pursue what lights me up.',
      'My life has direction and intention.',
      'What I do today creates who I am tomorrow.',
    ],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    items: [
      'I attract people who uplift and support me.',
      'I give and receive love freely.',
      'I set healthy boundaries with grace.',
      'I am a caring and genuine friend.',
      'I communicate with honesty and compassion.',
      'I deserve relationships that nourish me.',
    ],
  },
  {
    id: 'body',
    label: 'Body & Health',
    items: [
      'I treat my body with kindness and respect.',
      'I make choices that support my wellbeing.',
      'I listen to what my body needs.',
      'I am grateful for my body and all it does.',
      'Rest and recovery are as important as effort.',
      'I am energized and ready for the day.',
    ],
  },
  {
    id: 'abundance',
    label: 'Abundance',
    items: [
      'I have more than enough.',
      'Opportunities flow toward me naturally.',
      'I celebrate others\' success without envy.',
      'Abundance is my natural state.',
      'I am open to receiving good things.',
      'What I need comes to me at the right time.',
    ],
  },
];
