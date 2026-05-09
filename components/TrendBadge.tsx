import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
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
    ? 'rgba(139,156,200,0.12)'
    : isPositive
    ? COLORS.primaryMuted
    : 'rgba(255,71,87,0.12)';

  const iconSize = size === 'sm' ? 12 : 14;
  const fontSize = size === 'sm' ? 11 : 13;
  const padding = size === 'sm' ? { paddingHorizontal: 6, paddingVertical: 3 } : { paddingHorizontal: 8, paddingVertical: 4 };

  const displayValue = showSign && isPositive ? `+${value}` : String(value);

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          borderRadius: 20,
          backgroundColor: bgColor,
        },
        padding,
      ]}
    >
      <Icon size={iconSize} color={color} />
      <Text style={{ fontSize, fontWeight: '600', color }}>{displayValue}</Text>
    </View>
  );
}
