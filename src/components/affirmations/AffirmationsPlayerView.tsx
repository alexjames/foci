import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Animated,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

function AffirmationPage({
  text,
  colors,
  height,
}: {
  text: string;
  colors: typeof Colors.light;
  height: number;
}) {
  return (
    <View style={[styles.page, { height }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.affirmationText, { color: colors.text }]}>{text}</Text>
      </View>
    </View>
  );
}

export function AffirmationsPlayerView({ items }: { items: string[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [containerHeight, setContainerHeight] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const flatListRef = useRef<FlatList<string>>(null);
  const hintOpacity = useRef(new Animated.Value(1)).current;

  const shuffled = useMemo(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items]);

  useEffect(() => {
    if (hasScrolled) {
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [hasScrolled, hintOpacity]);

  const showHint = containerHeight > 0 && shuffled.length > 1;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {containerHeight > 0 && (
        <FlatList
          ref={flatListRef}
          data={shuffled}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <AffirmationPage text={item} colors={colors} height={containerHeight} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          onScrollBeginDrag={() => setHasScrolled(true)}
        />
      )}

      {showHint && (
        <Animated.View style={[styles.hintRow, { opacity: hintOpacity }]}>
          <Text style={[styles.hintCaret, { color: colors.secondaryText }]}>^</Text>
          <Text style={[styles.hintText, { color: colors.secondaryText }]}>Swipe up for more</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: 340,
  },
  affirmationText: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  hintRow: {
    position: 'absolute',
    bottom: Layout.spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
  },
  hintCaret: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.5,
  },
  hintText: {
    fontSize: Layout.fontSize.caption,
    opacity: 0.5,
  },
});
