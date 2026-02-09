import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Text } from '@/components/Themed';
import { useTypewriter } from '@/src/hooks/useTypewriter';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  style?: TextStyle;
  cursorColor?: string;
}

export function TypewriterText({
  text,
  speed = 50,
  onComplete,
  style,
  cursorColor = '#007AFF',
}: TypewriterTextProps) {
  const { displayedText, isComplete } = useTypewriter(text, speed);

  React.useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  return (
    <Text style={[styles.text, style]}>
      {displayedText}
      {!isComplete && (
        <Text style={[styles.cursor, { color: cursorColor }]}>|</Text>
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 34,
  },
  cursor: {
    fontWeight: '300',
  },
});
