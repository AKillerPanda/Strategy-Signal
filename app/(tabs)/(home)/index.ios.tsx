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
  Lightbulb,
  BarChart2,
  Sliders,
} from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import MetricCard from '@/components/MetricCard';
import TrendBadge from '@/components/TrendBadge';
import AnimatedPressable from '@/components/AnimatedPressable';
import SkeletonLoader, { SkeletonCard } from '@/components/SkeletonLoader';
import ScoreRing from '@/components/ScoreRing';
import Animated, { FadeInDown } from 'react-native-reanimated';

function scoreColor(score: number): string {
  if (score >= 70) return COLORS.positive;
  if (score >= 40) return COLORS.warning;
  return COLORS.negative;
}

function ScoreSection({ score, strategy }: { score: number; strategy: string }) {
  const color = scoreColor(score);
  const roundedScore = Math.round(score);
  const trendValue = Math.round((score - 50) / 5);

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}
    >
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <ScoreRing score={score} size={160} color={color} />
        <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 10, letterSpacing: 2, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase' }}>
            STRATEGY SCORE
          </Text>
          <Text style={{ fontSize: 52, fontFamily: 'SpaceMono', fontWeight: '700', color, lineHeight: 60 }}>
            {roundedScore}
          </Text>
        </View>
      </View>
      <TrendBadge value={trendValue} />
      <View style={{
        backgroundColor: COLORS.primaryMuted,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: `${COLORS.primary}30`,
      }}>
        <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>{strategy}</Text>
      </View>
    </Animated.View>
  );
}

function EmptyState({ onEvaluate, onDemo }: { onEvaluate: () => void; onDemo: () => void }) {
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
      <View style={{ width: '100%', paddingHorizontal: 32, gap: 12, marginTop: 8 }}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home iOS] Empty state Demo button pressed');
            onDemo();
          }}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Lightbulb size={18} color="#0A0E1A" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0A0E1A' }}>Try Guided Demo</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home iOS] Empty state Evaluate button pressed');
            onEvaluate();
          }}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 14,
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>Evaluate Strategy</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function SkeletonDashboard() {
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
        <SkeletonLoader width={160} height={160} borderRadius={80} />
        <SkeletonLoader width={120} height={20} />
        <SkeletonLoader width={160} height={32} />
      </View>
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

export default function HomeScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);

  const navigateToInput = () => {
    console.log('[Home iOS] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)?from=home');
  };

  const navigateToDemo = () => {
    console.log('[Home iOS] Navigate to Guided Demo');
    router.push('/(tabs)/(input)?mode=demo&from=home');
  };

  const navigateToCharts = () => {
    console.log('[Home iOS] Navigate to Charts tab');
    router.push('/(tabs)/(charts)');
  };

  if (isLoading) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 180 }}
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
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        <EmptyState onEvaluate={navigateToInput} onDemo={navigateToDemo} />
      </ScrollView>
    );
  }

  const marketingColor = result.marketing_strength >= 70 ? COLORS.positive : result.marketing_strength >= 40 ? COLORS.warning : COLORS.negative;
  const productColor = result.product_readiness >= 70 ? COLORS.positive : result.product_readiness >= 40 ? COLORS.warning : COLORS.negative;
  const competitionColor = result.competition_intensity >= 70 ? COLORS.negative : result.competition_intensity >= 40 ? COLORS.warning : COLORS.positive;
  const fragmentationColor = result.fragmentation_risk >= 70 ? COLORS.negative : result.fragmentation_risk >= 40 ? COLORS.warning : COLORS.positive;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 180 }}
    >
      <ScoreSection score={result.strategy_score} strategy={result.best_launch_strategy} />

      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flexDirection: 'row', gap: 12 }}>
          <MetricCard
            label="Marketing Strength"
            value={result.marketing_strength}
            icon={<TrendingUp size={18} color={marketingColor} />}
            color={marketingColor}
          />
          <MetricCard
            label="Product Readiness"
            value={result.product_readiness}
            icon={<Package size={18} color={productColor} />}
            color={productColor}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ flexDirection: 'row', gap: 12 }}>
          <MetricCard
            label="Competition"
            value={result.competition_intensity}
            icon={<Zap size={18} color={competitionColor} />}
            color={competitionColor}
          />
          <MetricCard
            label="Fragmentation Risk"
            value={result.fragmentation_risk}
            icon={<AlertTriangle size={18} color={fragmentationColor} />}
            color={fragmentationColor}
          />
        </Animated.View>

        {result.top_recommendation ? (
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderLeftWidth: 3,
              borderLeftColor: COLORS.primary,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              borderCurve: 'continuous',
              flexDirection: 'row',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Lightbulb size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                TOP RECOMMENDATION
              </Text>
              <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>
                {result.top_recommendation}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(500).springify()} style={{ flexDirection: 'row', gap: 12 }}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Home iOS] Quick action: Evaluate Strategy pressed');
              navigateToInput();
            }}
            style={{
              flex: 1,
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              borderWidth: 1,
              borderColor: `${COLORS.primary}30`,
              borderCurve: 'continuous',
            }}
          >
            <Sliders size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>Evaluate Strategy</Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log('[Home iOS] Quick action: View Charts pressed');
              navigateToCharts();
            }}
            style={{
              flex: 1,
              backgroundColor: COLORS.accentMuted,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              borderWidth: 1,
              borderColor: `${COLORS.accent}30`,
              borderCurve: 'continuous',
            }}
          >
            <BarChart2 size={16} color={COLORS.accent} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.accent }}>View Charts</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
