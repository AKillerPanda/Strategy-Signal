import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  TrendingUp,
  Package,
  Zap,
  AlertTriangle,
  BarChart2,
  Sliders,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import MetricCard from '@/components/MetricCard';
import TrendBadge from '@/components/TrendBadge';
import AnimatedPressable from '@/components/AnimatedPressable';
import SkeletonLoader, { SkeletonCard } from '@/components/SkeletonLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return COLORS.positive;
  if (score >= 40) return COLORS.warning;
  return COLORS.negative;
}

function metricStatusLabel(value: number): string {
  if (value >= 80) return 'Strong';
  if (value >= 60) return 'Good';
  if (value >= 40) return 'Fair';
  return 'Weak';
}

function fragRiskColor(risk: number): string {
  if (risk >= 70) return COLORS.negative;
  if (risk >= 40) return COLORS.warning;
  return COLORS.positive;
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────

function HeroBannerCard({
  score,
  strategy,
  fragmentationRisk,
}: {
  score: number;
  strategy: string;
  fragmentationRisk: number;
}) {
  const color = scoreColor(score);
  const roundedScore = Math.round(score);
  const trendValue = Math.round((score - 50) / 5);
  const barWidth = `${Math.min(100, Math.max(0, score))}%` as `${number}%`;
  const strategyUpper = strategy.toUpperCase();
  const lastEvaluated = 'Last evaluated today';
  const fragColor = fragRiskColor(fragmentationRisk);
  const fragRounded = Math.round(fragmentationRisk);

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={{
        backgroundColor: '#162040',
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 3,
        borderLeftColor: color,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          STRATEGY SCORE
        </Text>
        <View
          style={{
            backgroundColor: COLORS.primaryMuted,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: COLORS.primary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {strategyUpper}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 72,
          fontFamily: 'SpaceMono',
          color,
          lineHeight: 80,
        }}
      >
        {roundedScore}
      </Text>

      <View style={{ height: 6, backgroundColor: COLORS.surfaceTertiary, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 6, width: barWidth, backgroundColor: color, borderRadius: 3 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fragColor }} />
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
          Fragmentation Risk:
        </Text>
        <Text style={{ fontSize: 12, color: fragColor, fontWeight: '600', fontFamily: 'SpaceMono' }}>
          {fragRounded}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TrendBadge value={trendValue} />
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>·</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{lastEvaluated}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onEvaluate }: { onEvaluate: () => void }) {
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
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
        No strategy evaluated yet
      </Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
        Tap Evaluate to analyze your startup strategy
      </Text>
      <AnimatedPressable
        onPress={() => {
          console.log('[Home] Empty state Evaluate button pressed');
          onEvaluate();
        }}
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 14,
          paddingHorizontal: 32,
          paddingVertical: 16,
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Evaluate Strategy</Text>
      </AnimatedPressable>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonDashboard() {
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      <SkeletonLoader width="100%" height={180} borderRadius={18} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SkeletonCard style={{ flex: 1 }} />
        <SkeletonCard style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SkeletonCard style={{ flex: 1 }} />
        <SkeletonCard style={{ flex: 1 }} />
      </View>
      <SkeletonCard />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);

  const navigateToInput = () => {
    console.log('[Home] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)');
  };

  const navigateToCharts = () => {
    console.log('[Home] Navigate to Charts tab');
    router.push('/(tabs)/(charts)');
  };

  if (isLoading) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
      >
        <SkeletonDashboard />
      </ScrollView>
    );
  }

  if (!result) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <EmptyState onEvaluate={navigateToInput} />
      </ScrollView>
    );
  }

  const marketingColor = result.marketing_strength >= 70 ? COLORS.positive : result.marketing_strength >= 40 ? COLORS.warning : COLORS.negative;
  const productColor = result.product_readiness >= 70 ? COLORS.positive : result.product_readiness >= 40 ? COLORS.warning : COLORS.negative;
  const competitionColor = result.competition_intensity >= 70 ? COLORS.negative : result.competition_intensity >= 40 ? COLORS.warning : COLORS.positive;
  const fragmentationColor = result.fragmentation_risk >= 70 ? COLORS.negative : result.fragmentation_risk >= 40 ? COLORS.warning : COLORS.positive;

  const marketingStatus = metricStatusLabel(result.marketing_strength);
  const productStatus = metricStatusLabel(result.product_readiness);
  const competitionStatus = metricStatusLabel(result.competition_intensity);
  const fragmentationStatus = metricStatusLabel(result.fragmentation_risk);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16, gap: 16 }}
    >
      <HeroBannerCard
        score={result.strategy_score}
        strategy={result.best_launch_strategy}
        fragmentationRisk={result.fragmentation_risk}
      />

      <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard
          label="Marketing Strength"
          value={result.marketing_strength}
          icon={<TrendingUp size={14} color={marketingColor} />}
          color={marketingColor}
          statusLabel={marketingStatus}
        />
        <MetricCard
          label="Product Readiness"
          value={result.product_readiness}
          icon={<Package size={14} color={productColor} />}
          color={productColor}
          statusLabel={productStatus}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard
          label="Competition"
          value={result.competition_intensity}
          icon={<Zap size={14} color={competitionColor} />}
          color={competitionColor}
          statusLabel={competitionStatus}
        />
        <MetricCard
          label="Fragmentation Risk"
          value={result.fragmentation_risk}
          icon={<AlertTriangle size={14} color={fragmentationColor} />}
          color={fragmentationColor}
          statusLabel={fragmentationStatus}
        />
      </Animated.View>

      {result.top_recommendation ? (
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.primary,
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: COLORS.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                KEY INSIGHT
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>
              {result.top_recommendation}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: COLORS.divider }} />
          <AnimatedPressable
            onPress={() => {
              console.log('[Home] View all recommendations pressed');
              router.push('/(tabs)/(feed)');
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>
              View all recommendations →
            </Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(500).springify()} style={{ flexDirection: 'row', gap: 12 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Quick action: Evaluate Strategy pressed');
            navigateToInput();
          }}
          style={{
            flex: 1,
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
          }}
        >
          <Sliders size={24} color={COLORS.primary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}>Evaluate</Text>
            <ChevronRight size={14} color={COLORS.textTertiary} />
          </View>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Quick action: View Charts pressed');
            navigateToCharts();
          }}
          style={{
            flex: 1,
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
          }}
        >
          <BarChart2 size={24} color={COLORS.accent} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}>Charts</Text>
            <ChevronRight size={14} color={COLORS.textTertiary} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}
