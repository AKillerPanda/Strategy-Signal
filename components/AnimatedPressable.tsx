import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleDown?: number;
}

const AnimatedPressableInner = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressable({
  style,
  children,
  scaleDown = 0.96,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  hitSlop,
  testID,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableInner
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        onPress?.(e);
      }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      hitSlop={hitSlop}
      testID={testID}
    >
      {children}
    </AnimatedPressableInner>
  );
}
