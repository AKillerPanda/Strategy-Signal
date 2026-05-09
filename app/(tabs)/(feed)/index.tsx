import React from 'react';
import {
  View,
  Text,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lightbulb, Sliders } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import AnimatedPressable from '@/components/AnimatedPressable';
import SkeletonLoader from '@/components/SkeletonLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Priority = 'high' | 'medium' | 'low';

interface Recommendation {
  title: string;
  description: string;
  priority: Priority;
  category: string;
}

const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; label: string; dotColor: string }> = {
  high: { color: COLORS.negative, bg: 'rgba(248,113,113,0.12)', label: 'HIGH', dotColor: COLORS.negative },
  medium: { color: COLORS.warning, bg: 'rgba(251,191,36,0.12)', label: 'MED', dotColor: COLORS.warning },
  low: { color: COLORS.positive, bg: COLORS.accentMuted, label: 'LOW', dotColor: COLORS.positive },
};

const PRIORITY_BORDER: Record<Priority, string> = {
  high: COLORS.negative,
  medium: COLORS.warning,
  low: COLORS.positive,
};

function RecommendationCard({ item, index }: { item: Recommendation; index: number }) {
  const config = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.low;
  const borderColor = PRIORITY_BORDER[item.priority] ?? COLORS.positive;
  const categoryUpper = item.category.toUpperCase();
  const priorityLabel = config.label;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <AnimatedPressable
        onPress={() => console.log('[Feed] Recommendation card pressed', item.title)}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderLeftWidth: 2,
          borderLeftColor: borderColor,
          overflow: 'hidden',
        }}
      >
        <View style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: config.dotColor }} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                flex: 1,
              }}
            >
              {categoryUpper}
            </Text>
            <View
              style={{
                backgroundColor: config.bg,
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: config.color,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {priorityLabel}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 }}>
            {item.title}
          </Text>

          <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>
            {item.description}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function SkeletonFeed() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonLoader width={80} height={12} />
            <SkeletonLoader width={40} height={20} borderRadius={10} />
          </View>
          <SkeletonLoader width="70%" height={18} />
          <SkeletonLoader width="100%" height={14} />
          <SkeletonLoader width="85%" height={14} />
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
        <Lightbulb size={36} color={COLORS.textTertiary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>No recommendations yet</Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
        Evaluate your strategy to get personalized recommendations
      </Text>
      <AnimatedPressable
        onPress={() => {
          console.log('[Feed] Empty state navigate to Evaluate pressed');
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

export default function FeedScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);

  const navigateToInput = () => {
    console.log('[Feed] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)?from=feed');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ height: 120 }} />
        <SkeletonFeed />
      </View>
    );
  }

  if (!result || result.recommendations.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <EmptyState onNavigate={navigateToInput} />
      </View>
    );
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180, paddingTop: 16, gap: 12 }}
      data={result.recommendations}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
        <RecommendationCard item={item as Recommendation} index={index} />
      )}
    />
  );
}
