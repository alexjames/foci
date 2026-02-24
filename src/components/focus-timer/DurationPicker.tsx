import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240
const SPACER_HEIGHT = ITEM_HEIGHT * 2;
const MINUTES = Array.from({ length: 100 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

interface DurationPickerProps {
  durationSeconds: number;
  onChangeDuration: (seconds: number) => void;
  colors: typeof Colors.light;
}

export function DurationPicker({ durationSeconds, onChangeDuration, colors }: DurationPickerProps) {
  const minutesRef = useRef<FlatList>(undefined);
  const secondsRef = useRef<FlatList>(undefined);
  const isProgrammatic = useRef(false);
  const hasMounted = useRef(false);

  // Track current values in refs to avoid stale closures in scroll handlers
  const currentMins = useRef(Math.floor(durationSeconds / 60));
  const currentSecs = useRef(durationSeconds % 60);

  // Sync wheels when durationSeconds changes (e.g. preset tap)
  useEffect(() => {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    currentMins.current = mins;
    currentSecs.current = secs;

    const animated = hasMounted.current;
    isProgrammatic.current = true;
    minutesRef.current?.scrollToOffset({ offset: mins * ITEM_HEIGHT, animated });
    secondsRef.current?.scrollToOffset({ offset: secs * ITEM_HEIGHT, animated });
    hasMounted.current = true;

    const t = setTimeout(() => {
      isProgrammatic.current = false;
    }, animated ? 400 : 100);
    return () => clearTimeout(t);
  }, [durationSeconds]);

  const handleMinutesScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammatic.current) return;
      const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(MINUTES.length - 1, index));
      currentMins.current = clamped;
      const total = Math.max(60, clamped * 60 + currentSecs.current);
      // If enforcing minimum snapped mins to 1
      if (total !== clamped * 60 + currentSecs.current) {
        // total was floored to 60 → 1 min, 0 sec
        currentMins.current = 1;
        currentSecs.current = 0;
        isProgrammatic.current = true;
        minutesRef.current?.scrollToOffset({ offset: ITEM_HEIGHT, animated: true });
        secondsRef.current?.scrollToOffset({ offset: 0, animated: true });
        setTimeout(() => { isProgrammatic.current = false; }, 400);
      }
      onChangeDuration(total);
    },
    [onChangeDuration]
  );

  const handleSecondsScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammatic.current) return;
      const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(SECONDS.length - 1, index));
      currentSecs.current = clamped;
      const total = Math.max(60, currentMins.current * 60 + clamped);
      if (total !== currentMins.current * 60 + clamped) {
        // Snapped up to 60
        currentMins.current = 1;
        currentSecs.current = 0;
        isProgrammatic.current = true;
        minutesRef.current?.scrollToOffset({ offset: ITEM_HEIGHT, animated: true });
        secondsRef.current?.scrollToOffset({ offset: 0, animated: true });
        setTimeout(() => { isProgrammatic.current = false; }, 400);
      }
      onChangeDuration(total);
    },
    [onChangeDuration]
  );

  const handleScrollBeginDrag = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderMinuteItem = useCallback(
    ({ item }: { item: number }) => {
      const isSel = item === currentMins.current;
      return (
        <View style={styles.item}>
          <Text style={[styles.itemText, { color: isSel ? colors.text : colors.secondaryText }, isSel && styles.selectedItemText]}>
            {item}
          </Text>
        </View>
      );
    },
    // Re-render when duration changes so selected item updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [durationSeconds, colors]
  );

  const renderSecondItem = useCallback(
    ({ item }: { item: number }) => {
      const isSel = item === currentSecs.current;
      return (
        <View style={styles.item}>
          <Text style={[styles.itemText, { color: isSel ? colors.text : colors.secondaryText }, isSel && styles.selectedItemText]}>
            {item.toString().padStart(2, '0')}
          </Text>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [durationSeconds, colors]
  );

  const Spacer = () => <View style={{ height: SPACER_HEIGHT }} />;

  return (
    <View style={styles.container}>
      {/* Selection band */}
      <View
        style={[
          styles.selectionBand,
          { borderTopColor: colors.secondaryText + '40', borderBottomColor: colors.secondaryText + '40' },
        ]}
        pointerEvents="none"
      />

      {/* Minutes column */}
      <View style={styles.column}>
        <FlatList
          ref={minutesRef}
          data={MINUTES}
          keyExtractor={(item) => String(item)}
          renderItem={renderMinuteItem}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          style={{ height: PICKER_HEIGHT }}
          ListHeaderComponent={<Spacer />}
          ListFooterComponent={<Spacer />}
          onMomentumScrollEnd={handleMinutesScrollEnd}
          onScrollEndDrag={handleMinutesScrollEnd}
          onScrollBeginDrag={handleScrollBeginDrag}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        />
        <Text style={[styles.columnLabel, { color: colors.secondaryText }]}>min</Text>
      </View>

      <Text style={[styles.colon, { color: colors.secondaryText }]}>:</Text>

      {/* Seconds column */}
      <View style={styles.column}>
        <FlatList
          ref={secondsRef}
          data={SECONDS}
          keyExtractor={(item) => String(item)}
          renderItem={renderSecondItem}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          style={{ height: PICKER_HEIGHT }}
          ListHeaderComponent={<Spacer />}
          ListFooterComponent={<Spacer />}
          onMomentumScrollEnd={handleSecondsScrollEnd}
          onScrollEndDrag={handleSecondsScrollEnd}
          onScrollBeginDrag={handleScrollBeginDrag}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        />
        <Text style={[styles.columnLabel, { color: colors.secondaryText }]}>sec</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.xl,
  },
  column: {
    alignItems: 'center',
    width: 80,
  },
  columnLabel: {
    fontSize: Layout.fontSize.caption,
    marginTop: Layout.spacing.xs,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 28,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  selectedItemText: {
    fontWeight: '600',
  },
  colon: {
    fontSize: 28,
    fontWeight: '300',
    marginBottom: Layout.spacing.lg,
    marginHorizontal: Layout.spacing.xs,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SPACER_HEIGHT,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
