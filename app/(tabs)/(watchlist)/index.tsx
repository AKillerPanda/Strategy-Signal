import React from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Sliders } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import AnimatedPressable from '@/components/AnimatedPressable';
import SkeletonLoader from '@/components/SkeletonLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Competitor {
  name: string;
  threat_score: number;
  suggested_response: string;
}

const AVATAR_COLORS = [
  '#3B82F6', '#A855F7', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#06B6D4',
];

function threatColor(score: number): string {
  if (score >= 70) return COLORS.negative;
  if (score >= 40) return COLORS.warning;
  return COLORS.positive;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

function CompetitorRow({ item, index }: { item: Competitor; index: number }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const tColor = threatColor(item.threat_score);
  const displayScore = Math.round(item.threat_score);
  const initial = getInitial(item.name);
  const barWidth = `${Math.min(100, Math.max(0, item.threat_score))}%` as `${number}%`;

  const handleLongPress = () => {
    console.log('[Watchlist] Long press on competitor', item.name);
    Alert.alert(
      item.name,
      'What would you like to do?',
      [
        {
          text: 'Copy Response',
          onPress: () => {
            console.log('[Watchlist] Copy response for', item.name);
            Clipboard.setString(item.suggested_response);
            Alert.alert('Copied', 'Suggested response copied to clipboard.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <AnimatedPressable
        onPress={() => console.log('[Watchlist] Competitor row pressed', item.name)}
        onLongPress={handleLongPress}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: avatarColor,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{initial}</Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{item.name}</Text>
          <Text
            style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}
            numberOfLines={2}
          >
            {item.suggested_response}
          </Text>
          <View style={{ marginTop: 6, height: 4, backgroundColor: COLORS.surfaceTertiary, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 4, width: barWidth, backgroundColor: tColor, borderRadius: 2 }} />
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <Text style={{ fontSize: 26, fontFamily: 'SpaceMono', color: tColor, lineHeight: 30 }}>
            {displayScore}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 1, textTransform: 'uppercase' }}>
            THREAT
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function SkeletonWatchlist() {
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <SkeletonLoader width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLoader width="50%" height={16} />
            <SkeletonLoader width="90%" height={12} />
            <SkeletonLoader width="70%" height={12} />
            <SkeletonLoader width="100%" height={4} borderRadius={2} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <SkeletonLoader width={40} height={28} borderRadius={6} />
            <SkeletonLoader width={40} height={10} borderRadius={4} />
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
        <Users size={36} color={COLORS.textTertiary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>No competitors tracked</Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 }}>
        Add competitors in the Evaluate tab
      </Text>
      <AnimatedPressable
        onPress={() => {
          console.log('[Watchlist] Empty state navigate to Evaluate pressed');
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

export default function WatchlistScreen() {
  const router = useRouter();
  const { result, isLoading } = React.use(StrategyContext);

  const navigateToInput = () => {
    console.log('[Watchlist] Navigate to Evaluate tab');
    router.push('/(tabs)/(input)');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ height: 120 }} />
        <SkeletonWatchlist />
      </View>
    );
  }

  if (!result || result.competitors.length === 0) {
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16, gap: 12 }}
      data={result.competitors}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
        <CompetitorRow item={item as Competitor} index={index} />
      )}
    />
  );
}
