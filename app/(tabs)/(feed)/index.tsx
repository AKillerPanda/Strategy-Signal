import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
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

const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; label: string }> = {
  high: { color: COLORS.negative, bg: 'rgba(255,71,87,0.12)', label: 'HIGH' },
  medium: { color: COLORS.warning, bg: 'rgba(245,158,11,0.12)', label: 'MED' },
  low: { color: COLORS.positive, bg: COLORS.primaryMuted, label: 'LOW' },
};

function RecommendationCard({ item, index }: { item: Recommendation; index: number }) {
  const config = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.low;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <AnimatedPressable
        onPress={() => console.log('[Feed] Recommendation card pressed', item.title)}
        style={{
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {item.category}
          </Text>
          <View style={{
            backgroundColor: config.bg,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: config.color }}>{config.label}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text }}>{item.title}</Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 }}>{item.description}</Text>
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
            <SkeletonLoader width={40} height={20} borderRadius={6} />
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
        <Sliders size={16} color="#0A0E1A" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0A0E1A' }}>Evaluate Strategy</Text>
      </AnimatedPressable>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);

  const navigateToInput = () => {
    console.log('[Feed] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)');
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
      data={result.recommendations}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
        <RecommendationCard item={item as Recommendation} index={index} />
      )}
    />
  );
}
