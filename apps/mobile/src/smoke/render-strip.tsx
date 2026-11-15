import { Host, Text as ExpoUIText } from '@expo/ui';
import { FlashList } from '@shopify/flash-list';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import icon from '../../assets/icon.png';
import { LazySkiaSwatch } from './lazy-skia-swatch';

// expo-image is not one of React Native's own components, so it gets a plain style object:
// on web a Unistyles style gave it no size at all (ADR 0006).
const imageStyle = { borderRadius: 10, height: 48, width: 48 };

const listItems = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.tile}>
      <View style={styles.sample}>{children}</View>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/** A dot that pulses on the UI thread and can be dragged sideways. */
function AnimatedDot() {
  const pulse = useSharedValue(0.6);
  const offset = useSharedValue(0);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [pulse]);

  const pan = usePanGesture({
    onUpdate: (event) => {
      offset.set(event.translationX);
    },
    onDeactivate: () => {
      offset.set(withSpring(0));
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.get(),
    transform: [{ translateX: offset.get() }, { scale: pulse.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.dot, animatedStyle]} />
    </GestureDetector>
  );
}

/** One instance of every visual library, so each is rendered at least once per platform. */
export function RenderStrip() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.strip}>
      <Tile label="Reanimated + Gesture Handler">
        <AnimatedDot />
      </Tile>
      <Tile label="SVG">
        <Svg width={56} height={56} viewBox="0 0 56 56">
          <Circle cx={28} cy={28} r={22} stroke={theme.colors.border} strokeWidth={6} fill="none" />
          <Circle
            cx={28}
            cy={28}
            r={22}
            stroke={theme.colors.accent}
            strokeWidth={6}
            strokeDasharray="90 138"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Tile>
      <Tile label="Skia (lazy)">
        <LazySkiaSwatch />
      </Tile>
      <Tile label="Expo UI">
        <Host matchContents>
          <ExpoUIText>Native text</ExpoUIText>
        </Host>
      </Tile>
      <Tile label="Glass effect">
        <GlassView style={styles.glass} glassEffectStyle="regular">
          <Text style={styles.glassText}>Glass</Text>
        </GlassView>
      </Tile>
      <Tile label="Symbols">
        <SymbolView
          name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
          size={40}
          tintColor={theme.colors.accent}
          fallback={<Text style={styles.glassText}>✓</Text>}
        />
      </Tile>
      <Tile label="expo-image">
        <Image source={icon} style={imageStyle} contentFit="cover" accessibilityLabel="App icon" />
      </Tile>
      <View style={styles.listTile}>
        <FlashList
          horizontal
          data={listItems}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <Text style={styles.chip}>{item}</Text>}
          showsHorizontalScrollIndicator={false}
        />
        <Text style={styles.tileLabel}>FlashList</Text>
      </View>
    </View>
  );
}

// At accessibility text sizes three tiles no longer fit side by side, so each takes a row.
const styles = StyleSheet.create((theme, runtime) => ({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: runtime.fontScale > 1.5 ? '100%' : '30%',
    flexGrow: 1,
    gap: 6,
    padding: 8,
  },
  sample: { alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  tileLabel: { color: theme.colors.muted, fontSize: 12, textAlign: 'center' },
  dot: { backgroundColor: theme.colors.accent, borderRadius: 18, height: 36, width: 36 },
  glass: { alignItems: 'center', borderRadius: 14, justifyContent: 'center', padding: 12 },
  glassText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  listTile: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '100%',
    gap: 6,
    // On web a horizontal list's full width would otherwise stretch the whole page.
    overflow: 'hidden',
    padding: 8,
  },
  chip: {
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    color: theme.colors.text,
    fontSize: 13,
    marginRight: 6,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
}));
