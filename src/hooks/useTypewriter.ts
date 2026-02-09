import { useState, useEffect, useCallback } from 'react';

export function useTypewriter(text: string, speed: number = 50) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const reset = useCallback(() => {
    setDisplayedText('');
    setIsComplete(false);
  }, []);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete, reset };
}
