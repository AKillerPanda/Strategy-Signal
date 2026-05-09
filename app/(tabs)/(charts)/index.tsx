import React from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart2, Sliders } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import LineChart from '@/components/LineChart';
import AnimatedPressable from '@/components/AnimatedPressable';
import SkeletonLoader from '@/components/SkeletonLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Period = '1W' | '1M' | '3M';

function filterByPeriod(data: number[], period: Period): number[] {
  if (data.length === 0) return data;
  if (period === '1W') return data.slice(-Math.min(7, data.length));
  if (period === '1M') return data.slice(-Math.min(30, data.length));
  return data;
}

interface ChartCardProps {
  title: string;
  currentValue: number;
  data: number[];
  color: string;
  index: number;
  chartWidth: number;
}

function ChartCard({ title, currentValue, data, color, index, chartWidth }: ChartCardProps) {
  const [period, setPeriod] = React.useState<Period>('3M');
  const filteredData = filterByPeriod(data, period);
  const displayValue = Math.round(currentValue);

  const periods: Period[] = ['1W', '1M', '3M'];

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        borderCurve: 'continuous',
        gap: 12,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>{title}</Text>
          <View style={{
            backgroundColor: `${color}20`,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color, fontVariant: ['tabular-nums'] }}>{displayValue}</Text>
          </View>
        </View>

        <LineChart
          data={filteredData}
          color={color}
          width={chartWidth}
          height={120}
          showGradient
        />

        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
          {periods.map((p) => (
            <AnimatedPressable
              key={p}
              onPress={() => {
                console.log(`[Charts] Period selector "${p}" pressed for chart "${title}"`);
                setPeriod(p);
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: period === p ? `${color}20` : COLORS.surfaceSecondary,
                borderWidth: 1,
                borderColor: period === p ? `${color}40` : COLORS.border,
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: period === p ? color : COLORS.textSecondary,
              }}>
                {p}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function SkeletonCharts({ chartWidth }: { chartWidth: number }) {
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonLoader width={140} height={16} />
            <SkeletonLoader width={50} height={28} borderRadius={8} />
          </View>
          <SkeletonLoader width={chartWidth} height={120} borderRadius={8} />
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
            <SkeletonLoader width={36} height={28} borderRadius={8} />
            <SkeletonLoader width={36} height={28} borderRadius={8} />
            <SkeletonLoader width={36} height={28} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
      }}>
        <BarChart2 size={36} color={COLORS.textTertiary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>No chart data yet</Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
        Evaluate your strategy to see charts
      </Text>
      <AnimatedPressable
        onPress={() => {
          console.log('[Charts] Empty state navigate to Evaluate pressed');
          onNavigate();
        }}
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 14,
          paddingHorizontal: 32,
          paddingVertical: 16,
          marginTop: 8,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Sliders size={16} color="#0A0E1A" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0A0E1A' }}>Evaluate Strategy</Text>
      </AnimatedPressable>
    </View>
  );
}

export default function ChartsScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);
  const { width } = useWindowDimensions();
  const chartWidth = width - 32 - 32; // screen padding + card padding

  const navigateToInput = () => {
    console.log('[Charts] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)');
  };

  if (isLoading) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={{ height: 20 }} />
        <SkeletonCharts chartWidth={chartWidth} />
      </ScrollView>
    );
  }

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <EmptyState onNavigate={navigateToInput} />
      </View>
    );
  }

  const charts = [
    {
      title: 'Strategy Score',
      currentValue: result.strategy_score,
      data: result.score_history,
      color: COLORS.chart1,
    },
    {
      title: 'Launch Readiness',
      currentValue: result.marketing_strength,
      data: result.launch_readiness_history,
      color: COLORS.chart2,
    },
    {
      title: 'Product Readiness',
      currentValue: result.product_readiness,
      data: result.product_readiness_history,
      color: COLORS.chart3,
    },
    {
      title: 'Market Pressure',
      currentValue: result.competition_intensity,
      data: result.market_pressure_history,
      color: COLORS.chart4,
    },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}
    >
      {charts.map((chart, i) => (
        <ChartCard
          key={chart.title}
          title={chart.title}
          currentValue={chart.currentValue}
          data={chart.data}
          color={chart.color}
          index={i}
          chartWidth={chartWidth}
        />
      ))}
    </ScrollView>
  );
}
