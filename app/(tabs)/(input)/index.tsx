import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import { evaluateStrategy, EvaluateInput } from '@/utils/api';
import AnimatedPressable from '@/components/AnimatedPressable';
import Animated, { FadeInDown } from 'react-native-reanimated';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 4,
      marginTop: 8,
    }}>
      {title}
    </Text>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function InputField({ label, value, onChangeText, placeholder, hint, autoCapitalize = 'none' }: InputFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        autoCapitalize={autoCapitalize}
        returnKeyType="next"
        multiline
        numberOfLines={2}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: COLORS.text,
          fontSize: 15,
          minHeight: 52,
          textAlignVertical: 'top',
        }}
      />
      {hint ? (
        <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  color: string;
}

function SliderField({ label, value, onValueChange, color }: SliderFieldProps) {
  const displayValue = Math.round(value);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{label}</Text>
        <View style={{
          backgroundColor: `${color}20`,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color, fontVariant: ['tabular-nums'] }}>{displayValue}</Text>
        </View>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={100}
        value={value}
        onValueChange={(v) => {
          console.log(`[Input] Slider "${label}" changed to`, Math.round(v));
          onValueChange(v);
        }}
        minimumTrackTintColor={color}
        maximumTrackTintColor={COLORS.surfaceTertiary}
        thumbTintColor={color}
        style={{ height: 36 }}
      />
    </View>
  );
}

function parseCSV(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function InputScreen() {
  const router = useRouter();
  const { setResult, setIsLoading, isLoading, setLastInput } = React.use(StrategyContext);

  const [features, setFeatures] = React.useState('');
  const [channels, setChannels] = React.useState('');
  const [competitors, setCompetitors] = React.useState('');
  const [milestones, setMilestones] = React.useState('');
  const [marketingStrength, setMarketingStrength] = React.useState(70);
  const [productReadiness, setProductReadiness] = React.useState(65);
  const [competitionIntensity, setCompetitionIntensity] = React.useState(60);
  const [error, setError] = React.useState<string | null>(null);

  const handleEvaluate = async () => {
    console.log('[Input] Evaluate Strategy button pressed');
    setError(null);

    const input: EvaluateInput = {
      features: parseCSV(features),
      channels: parseCSV(channels),
      competitors: parseCSV(competitors),
      milestones: parseCSV(milestones),
      marketing_strength: Math.round(marketingStrength),
      product_readiness: Math.round(productReadiness),
      competition_intensity: Math.round(competitionIntensity),
    };

    console.log('[Input] Parsed input', input);

    setIsLoading(true);
    setLastInput(input);

    try {
      const result = await evaluateStrategy(input);
      console.log('[Input] Evaluation success, navigating to Dashboard');
      setResult(result);
      router.push('/(tabs)/(home)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      console.error('[Input] Evaluation failed', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 12 }}>
          <SectionHeader title="Strategy Inputs" />

          <InputField
            label="Product Features"
            value={features}
            onChangeText={setFeatures}
            placeholder="e.g. AI dashboard, onboarding flow, analytics"
            hint="Separate with commas"
          />
          <InputField
            label="Marketing Channels"
            value={channels}
            onChangeText={setChannels}
            placeholder="e.g. SEO, TikTok, PR, email"
            hint="Separate with commas"
          />
          <InputField
            label="Competitors"
            value={competitors}
            onChangeText={setCompetitors}
            placeholder="e.g. Competitor A, Competitor B"
            hint="Separate with commas"
          />
          <InputField
            label="Milestones"
            value={milestones}
            onChangeText={setMilestones}
            placeholder="e.g. MVP, Beta launch, Public launch"
            hint="Separate with commas"
            autoCapitalize="sentences"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 20,
            borderCurve: 'continuous',
          }}
        >
          <SectionHeader title="Strength Indicators" />

          <SliderField
            label="Marketing Strength"
            value={marketingStrength}
            onValueChange={setMarketingStrength}
            color={COLORS.positive}
          />
          <SliderField
            label="Product Readiness"
            value={productReadiness}
            onValueChange={setProductReadiness}
            color={COLORS.accent}
          />
          <SliderField
            label="Competition Intensity"
            value={competitionIntensity}
            onValueChange={setCompetitionIntensity}
            color={COLORS.negative}
          />
        </Animated.View>

        {error ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={{
              backgroundColor: 'rgba(255,71,87,0.12)',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,71,87,0.3)',
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.negative, lineHeight: 20 }}>{error}</Text>
          </Animated.View>
        ) : null}

        <AnimatedPressable
          onPress={handleEvaluate}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? COLORS.surfaceTertiary : COLORS.primary,
            borderRadius: 14,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
            borderCurve: 'continuous',
          }}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color={COLORS.text} size="small" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textSecondary }}>Evaluating...</Text>
            </>
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0A0E1A' }}>Evaluate Strategy</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
