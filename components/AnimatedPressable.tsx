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
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableInner
      style={[animatedStyle, style]}
      onPressIn={() => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={onPress}
      {...rest}
    >
      {children}
    </AnimatedPressableInner>
  );
}
