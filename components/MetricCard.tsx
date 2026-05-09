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

  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        borderCurve: 'continuous',
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color }}>{displayValue}</Text>
      </View>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' }}>{label}</Text>
      <View style={{ height: 4, backgroundColor: COLORS.surfaceTertiary, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: barWidth, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </AnimatedPressable>
  );
}
