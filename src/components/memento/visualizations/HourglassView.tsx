import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, useColorScheme, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';
import { LifeData } from '@/src/utils/lifeData';

interface HourglassViewProps {
  lifeData: LifeData;
}

const GLASS_WIDTH = Dimensions.get('window').width * 0.55;
const GLASS_HEIGHT = GLASS_WIDTH * 1.8;
const HALF_HEIGHT = (GLASS_HEIGHT - 24) / 2;
const NECK_HEIGHT = 24;

// Aesthetic blue palette
const SAND_TOP = '#60A5FA';
const SAND_MID = '#3B82F6';
const SAND_BOTTOM = '#1D4ED8';
const GLASS_BORDER = 'rgba(96,165,250,0.35)';
const GLOW_COLOR = 'rgba(96,165,250,0.28)';

function GlowParticle({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: NECK_HEIGHT + 8,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.parallel([
              Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
            ]),
            Animated.delay(550),
            Animated.parallel([
              Animated.timing(opacity, { toValue: 0, duration: 230, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 0.6, duration: 230, useNativeDriver: true }),
            ]),
          ]),
        ]),
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, translateY, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.particleWrapper,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {/* Glow halo */}
      <RNView style={styles.particleGlow} />
      {/* Core dot */}
      <RNView style={styles.particleCore} />
    </Animated.View>
  );
}

export function HourglassView({ lifeData }: HourglassViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const percentLived = lifeData.percentLived;
  const percentRemaining = 100 - percentLived;

  const topFillHeight = (percentRemaining / 100) * HALF_HEIGHT;
  const bottomFillHeight = (percentLived / 100) * HALF_HEIGHT;

  const glassBg =
    colorScheme === 'dark' ? 'rgba(10,20,40,0.55)' : 'rgba(235,242,255,0.55)';

  return (
    <View style={styles.container}>
      {/* Percent text */}
      <View style={styles.percentRow}>
        <Text style={[styles.percentNumber, { color: SAND_MID }]}>
          {percentLived.toFixed(1)}
        </Text>
        <Text style={[styles.percentSign, { color: colors.secondaryText }]}>% elapsed</Text>
      </View>

      <View style={styles.hourglassContainer}>
        {/* Top bulb */}
        <RNView
          style={[
            styles.topHalf,
            { backgroundColor: glassBg, borderColor: GLASS_BORDER },
          ]}
        >
          {/* Sand fill — two layers for depth */}
          {topFillHeight > 0 && (
            <RNView style={[styles.topFill, { height: topFillHeight }]}>
              {/* Lighter top band */}
              <RNView
                style={[
                  styles.sandLayerTop,
                  { height: topFillHeight * 0.4, backgroundColor: SAND_TOP },
                ]}
              />
              {/* Richer lower band */}
              <RNView
                style={[
                  styles.sandLayerBottom,
                  { height: topFillHeight * 0.6, backgroundColor: SAND_MID },
                ]}
              />
            </RNView>
          )}
        </RNView>

        {/* Neck */}
        <RNView style={[styles.neck, { borderColor: GLASS_BORDER }]}>
          {!lifeData.exceededExpectancy && (
            <>
              <GlowParticle delay={0} />
              <GlowParticle delay={300} />
              <GlowParticle delay={600} />
            </>
          )}
        </RNView>

        {/* Bottom bulb */}
        <RNView
          style={[
            styles.bottomHalf,
            { backgroundColor: glassBg, borderColor: GLASS_BORDER },
          ]}
        >
          {bottomFillHeight > 0 && (
            <RNView style={[styles.bottomFill, { height: bottomFillHeight }]}>
              {/* Surface sheen */}
              <RNView
                style={[
                  styles.sandSurface,
                  { height: bottomFillHeight * 0.18, backgroundColor: SAND_TOP },
                ]}
              />
              {/* Body */}
              <RNView
                style={[
                  styles.sandBody,
                  { height: bottomFillHeight * 0.82, backgroundColor: SAND_BOTTOM },
                ]}
              />
            </RNView>
          )}
        </RNView>
      </View>

      {/* Labels */}
      <View style={styles.labelRow}>
        <View style={styles.labelItem}>
          <Text style={[styles.labelValue, { color: SAND_MID }]}>
            {lifeData.yearsLived}
          </Text>
          <Text style={[styles.labelText, { color: colors.secondaryText }]}>years lived</Text>
        </View>
        <RNView style={[styles.labelDivider, { backgroundColor: colors.separator }]} />
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
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Layout.spacing.lg,
    backgroundColor: 'transparent',
  },
  percentNumber: {
    fontSize: Layout.fontSize.heading,
    fontWeight: '700',
  },
  percentSign: {
    fontSize: Layout.fontSize.body,
    fontWeight: '400',
    marginLeft: 4,
  },
  hourglassContainer: {
    alignItems: 'center',
    width: GLASS_WIDTH,
    backgroundColor: 'transparent',
  },
  topHalf: {
    width: GLASS_WIDTH,
    height: HALF_HEIGHT,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: GLASS_WIDTH / 2,
    borderBottomRightRadius: GLASS_WIDTH / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1.5,
  },
  topFill: {
    width: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: GLASS_WIDTH / 5,
    borderTopRightRadius: GLASS_WIDTH / 5,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  sandLayerTop: {
    width: '100%',
  },
  sandLayerBottom: {
    width: '100%',
  },
  neck: {
    width: 6,
    height: NECK_HEIGHT,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  particleWrapper: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 10,
    height: 10,
  },
  particleGlow: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GLOW_COLOR,
  },
  particleCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: SAND_TOP,
  },
  bottomHalf: {
    width: GLASS_WIDTH,
    height: HALF_HEIGHT,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: GLASS_WIDTH / 2,
    borderTopRightRadius: GLASS_WIDTH / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1.5,
  },
  bottomFill: {
    width: '100%',
    overflow: 'hidden',
  },
  sandSurface: {
    width: '100%',
  },
  sandBody: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: GLASS_WIDTH + Layout.spacing.xxl,
    marginTop: Layout.spacing.lg,
    backgroundColor: 'transparent',
    gap: Layout.spacing.xl,
  },
  labelDivider: {
    width: 1,
    height: 32,
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
