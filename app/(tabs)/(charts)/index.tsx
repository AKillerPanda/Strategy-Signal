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

  const first = filteredData.length > 1 ? filteredData[0] : null;
  const last = filteredData.length > 1 ? filteredData[filteredData.length - 1] : null;
  const trendDiff = first !== null && last !== null ? Math.round(last - first) : 0;
  const trendArrow = trendDiff > 0 ? '↑' : trendDiff < 0 ? '↓' : '—';
  const trendColor = trendDiff > 0 ? COLORS.positive : trendDiff < 0 ? COLORS.negative : COLORS.textSecondary;
  const trendText = trendDiff > 0 ? `+${trendDiff}` : String(trendDiff);

  const periods: Period[] = ['1W', '1M', '3M'];

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>{title}</Text>
            {trendDiff !== 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: trendColor, fontFamily: 'SpaceMono' }}>
                  {trendArrow}
                </Text>
                <Text style={{ fontSize: 12, color: trendColor, fontFamily: 'SpaceMono' }}>
                  {trendText}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>pts this period</Text>
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 20, fontFamily: 'SpaceMono', color, lineHeight: 24 }}>
              {displayValue}
            </Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {periods.map((p) => (
                <AnimatedPressable
                  key={p}
                  onPress={() => {
                    console.log(`[Charts] Period selector "${p}" pressed for chart "${title}"`);
                    setPeriod(p);
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: period === p ? `${color}20` : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: period === p ? `${color}40` : COLORS.border,
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: period === p ? color : COLORS.textSecondary,
                  }}>
                    {p}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </View>

        <LineChart
          data={filteredData}
          color={color}
          width={chartWidth}
          height={120}
          showGradient
        />
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
        <Sliders size={16} color="#fff" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Evaluate Strategy</Text>
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16, gap: 16 }}
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
