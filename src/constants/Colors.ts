export const Colors = {
  light: {
    text: '#000000',
    secondaryText: '#6B7280',
    background: '#F2F2F7',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E7EB',
    tint: '#007AFF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#007AFF',
    destructive: '#FF3B30',
    separator: '#E5E7EB',
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',
    placeholder: '#9CA3AF',
  },
  dark: {
    text: '#FFFFFF',
    secondaryText: '#9CA3AF',
    background: '#000000',
    cardBackground: '#1C1C1E',
    cardBorder: '#2C2C2E',
    tint: '#0A84FF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#0A84FF',
    destructive: '#FF453A',
    separator: '#38383A',
    inputBackground: '#1C1C1E',
    inputBorder: '#38383A',
    placeholder: '#6B7280',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
