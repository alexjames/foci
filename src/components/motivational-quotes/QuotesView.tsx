import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { MOTIVATIONAL_QUOTES, Quote } from '@/src/constants/quotes';

function QuoteItem({
  quote,
  colors,
  height,
}: {
  quote: Quote;
  colors: typeof Colors.light;
  height: number;
}) {
  return (
    <View style={[styles.page, { height }]}>
      <View style={styles.quoteContainer}>
        <Text style={[styles.quoteText, { color: colors.text }]}>{quote.text}</Text>
        <View style={[styles.divider, { backgroundColor: colors.tint }]} />
        <Text style={[styles.authorText, { color: colors.secondaryText }]}>— {quote.author}</Text>
      </View>
    </View>
  );
}

export function QuotesView() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [containerHeight, setContainerHeight] = useState(0);

  const shuffled = useMemo(() => {
    const arr = [...MOTIVATIONAL_QUOTES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const flatListRef = useRef<FlatList<Quote>>(null);

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
            <QuoteItem quote={item} colors={colors} height={containerHeight} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
        />
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
  quoteContainer: {
    alignItems: 'center',
    maxWidth: 340,
  },
  quoteText: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    opacity: 0.5,
  },
  authorText: {
    fontSize: Layout.fontSize.body,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
