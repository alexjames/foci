import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, useColorScheme } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface HourglassViewProps {
  lifeData: LifeData;
}

const GLASS_WIDTH = Dimensions.get('window').width * 0.55;
const GLASS_HEIGHT = GLASS_WIDTH * 1.8;
const HALF_HEIGHT = (GLASS_HEIGHT - 20) / 2;
const NECK_HEIGHT = 20;

function FallingSandParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: NECK_HEIGHT + 10,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.delay(500),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.sandParticle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

export function HourglassView({ lifeData }: HourglassViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const percentLived = lifeData.percentLived;
  const percentRemaining = 100 - percentLived;

  const topFillHeight = (percentRemaining / 100) * HALF_HEIGHT;
  const bottomFillHeight = (percentLived / 100) * HALF_HEIGHT;

  const sandColor = colors.tint;
  const glassColor = colorScheme === 'dark' ? '#2C2C2E' : '#E5E7EB';

  return (
    <View style={styles.container}>
      <Text style={[styles.percentText, { color: colors.text }]}>
        {percentLived.toFixed(1)}% elapsed
      </Text>

      <View style={styles.hourglassContainer}>
        {/* Top half */}
        <View
          style={[
            styles.topHalf,
            {
              backgroundColor: glassColor,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={[styles.topFill, { height: topFillHeight, backgroundColor: sandColor }]} />
        </View>

        {/* Neck */}
        <View style={[styles.neck, { backgroundColor: colors.cardBorder }]}>
          {!lifeData.exceededExpectancy && (
            <>
              <FallingSandParticle delay={0} color={sandColor} />
              <FallingSandParticle delay={400} color={sandColor} />
              <FallingSandParticle delay={800} color={sandColor} />
            </>
          )}
        </View>

        {/* Bottom half */}
        <View
          style={[
            styles.bottomHalf,
            {
              backgroundColor: glassColor,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={[styles.bottomFill, { height: bottomFillHeight, backgroundColor: sandColor }]} />
        </View>
      </View>

      <View style={styles.labelRow}>
        <View style={styles.labelItem}>
          <Text style={[styles.labelValue, { color: colors.tint }]}>
            {lifeData.yearsLived}
          </Text>
          <Text style={[styles.labelText, { color: colors.secondaryText }]}>years lived</Text>
        </View>
        <View style={styles.labelItem}>
          <Text style={[styles.labelValue, { color: colors.secondaryText }]}>
            {lifeData.yearsRemaining}
          </Text>
          <Text style={[styles.labelText, { color: colors.secondaryText }]}>years left</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  percentText: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
    marginBottom: Layout.spacing.lg,
  },
  hourglassContainer: {
    alignItems: 'center',
    width: GLASS_WIDTH,
    backgroundColor: 'transparent',
  },
  topHalf: {
    width: GLASS_WIDTH,
    height: HALF_HEIGHT,
    borderTopLeftRadius: Layout.borderRadius.md,
    borderTopRightRadius: Layout.borderRadius.md,
    borderBottomLeftRadius: GLASS_WIDTH / 2,
    borderBottomRightRadius: GLASS_WIDTH / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
  },
  topFill: {
    width: '100%',
    borderTopLeftRadius: GLASS_WIDTH / 4,
    borderTopRightRadius: GLASS_WIDTH / 4,
  },
  neck: {
    width: 8,
    height: NECK_HEIGHT,
    alignItems: 'center',
    overflow: 'visible',
  },
  sandParticle: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    position: 'absolute',
    top: 0,
  },
  bottomHalf: {
    width: GLASS_WIDTH,
    height: HALF_HEIGHT,
    borderBottomLeftRadius: Layout.borderRadius.md,
    borderBottomRightRadius: Layout.borderRadius.md,
    borderTopLeftRadius: GLASS_WIDTH / 2,
    borderTopRightRadius: GLASS_WIDTH / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
  },
  bottomFill: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: GLASS_WIDTH + Layout.spacing.xxl,
    marginTop: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  labelItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  labelValue: {
    fontSize: Layout.fontSize.title,
    fontWeight: '700',
  },
  labelText: {
    fontSize: Layout.fontSize.caption,
    marginTop: 2,
  },
});
