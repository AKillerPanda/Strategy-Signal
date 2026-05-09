import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/styles/colors';

interface TrendBadgeProps {
  value: number;
  showSign?: boolean;
  size?: 'sm' | 'md';
}

export default function TrendBadge({ value, showSign = true, size = 'md' }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const color = isNeutral ? COLORS.textSecondary : isPositive ? COLORS.positive : COLORS.negative;
  const bgColor = isNeutral
    ? COLORS.surfaceSecondary
    : isPositive
    ? COLORS.accentMuted
    : 'rgba(248,113,113,0.12)';

  const fontSize = size === 'sm' ? 11 : 13;
  const padding =
    size === 'sm'
      ? { paddingHorizontal: 7, paddingVertical: 3 }
      : { paddingHorizontal: 9, paddingVertical: 4 };

  const arrow = isNeutral ? '—' : isPositive ? '↑' : '↓';
  const absValue = Math.abs(value);
  const signedDisplay = isNeutral ? '0' : isPositive ? `+${absValue}` : `-${absValue}`;
  const displayText = showSign ? `${arrow} ${signedDisplay}` : String(absValue);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 20,
          backgroundColor: bgColor,
        },
        padding,
      ]}
    >
      <Text
        style={{
          fontSize,
          fontWeight: '600',
          color,
          fontFamily: 'SpaceMono',
        }}
      >
        {displayText}
      </Text>
    </View>
  );
}
