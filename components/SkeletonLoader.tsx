import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '@/styles/colors';

interface SkeletonLoaderProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0.4, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.surfaceTertiary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 12,
        },
        style,
      ]}
    >
      <SkeletonLoader width="60%" height={14} />
      <SkeletonLoader width="100%" height={40} borderRadius={8} />
      <SkeletonLoader width="80%" height={12} />
    </View>
  );
}
