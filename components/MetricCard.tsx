import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/styles/colors';
import AnimatedPressable from './AnimatedPressable';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  onPress?: () => void;
}

export default function MetricCard({ label, value, icon, color = COLORS.primary, onPress }: MetricCardProps) {
  const displayValue = Math.round(value);
  const barWidth = `${Math.min(100, Math.max(0, value))}%` as `${number}%`;
  const labelUpper = label.toUpperCase();

  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text
          style={{
            fontSize: 11,
            color: COLORS.textSecondary,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {labelUpper}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 28,
          fontFamily: 'SpaceMono',
          color,
          lineHeight: 34,
        }}
      >
        {displayValue}
      </Text>
      <View style={{ height: 4, backgroundColor: COLORS.surfaceTertiary, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: barWidth, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </AnimatedPressable>
  );
}
