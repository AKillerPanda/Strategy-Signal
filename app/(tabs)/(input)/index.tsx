import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import { evaluateStrategy, EvaluateInput } from '@/utils/api';
import AnimatedPressable from '@/components/AnimatedPressable';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

// ─── Helpers ────────────────────────────────────────────────────────────────

function zoneColor(v: number): string {
  if (v >= 80) return COLORS.positive;
  if (v >= 60) return COLORS.accent;
  if (v >= 40) return COLORS.warning;
  return COLORS.negative;
}

function getSliderLabel(value: number, type: 'marketing' | 'product' | 'competition'): string {
  const v = Math.round(value);
  if (type === 'marketing') {
    if (v >= 80) return 'Dominant — strong brand presence';
    if (v >= 60) return 'Active — solid channel coverage';
    if (v >= 40) return 'Developing — limited reach';
    if (v >= 20) return 'Early — minimal marketing';
    return 'None — no marketing yet';
  }
  if (type === 'product') {
    if (v >= 80) return 'Launch-ready — polished & tested';
    if (v >= 60) return 'Beta-ready — core features done';
    if (v >= 40) return 'MVP — basic functionality';
    if (v >= 20) return 'Prototype — early stage';
    return 'Concept — not yet built';
  }
  if (type === 'competition') {
    if (v >= 80) return 'Saturated — very crowded market';
    if (v >= 60) return 'Competitive — several strong players';
    if (v >= 40) return 'Moderate — some competition';
    if (v >= 20) return 'Emerging — few competitors';
    return 'Open — blue ocean';
  }
  return '';
}

function parseCSV(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 0,
        marginTop: 8,
      }}>
        {title}
      </Text>
      {description ? (
        <Text style={{ fontSize: 13, color: COLORS.textTertiary, lineHeight: 18, marginBottom: 4 }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Tag Row ─────────────────────────────────────────────────────────────────

const MAX_TAGS = 8;

function TagRow({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, MAX_TAGS);
  const overflow = items.length - MAX_TAGS;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {visible.map((item, i) => (
        <View
          key={`${item}-${i}`}
          style={{
            backgroundColor: COLORS.surfaceTertiary,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{item}</Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={{
            backgroundColor: COLORS.surfaceTertiary,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>
            +{overflow}
            {' '}
            more
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function InputField({ label, value, onChangeText, placeholder, hint, autoCapitalize = 'none' }: InputFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const labelUpper = label.toUpperCase();
  const parsedItems = parseCSV(value);
  const itemCount = parsedItems.length;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: COLORS.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {labelUpper}
        </Text>
        {itemCount > 0 ? (
          <Text style={{ fontSize: 13, color: COLORS.textTertiary }}>
            {itemCount}
            {' '}
            {itemCount === 1 ? 'item' : 'items'}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        autoCapitalize={autoCapitalize}
        returnKeyType="next"
        multiline
        numberOfLines={2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: focused ? COLORS.primary : COLORS.border,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: COLORS.text,
          fontSize: 15,
          minHeight: 52,
          textAlignVertical: 'top',
        }}
      />
      {hint ? (
        <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontStyle: 'italic' }}>{hint}</Text>
      ) : null}
      <TagRow items={parsedItems} />
    </View>
  );
}

// ─── Slider Field ─────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  color: string;
  type: 'marketing' | 'product' | 'competition';
}

function SliderField({ label, value, onValueChange, color, type }: SliderFieldProps) {
  const displayValue = Math.round(value);
  const contextLabel = getSliderLabel(value, type);
  const labelColor = zoneColor(value);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.text }}>{label}</Text>
        </View>
        <View style={{
          backgroundColor: `${color}20`,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color, fontFamily: 'SpaceMono' }}>{displayValue}</Text>
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
      <Text style={{ fontSize: 12, fontStyle: 'italic', color: labelColor, lineHeight: 16 }}>
        {contextLabel}
      </Text>
    </View>
  );
}

// ─── Pulsing Text ─────────────────────────────────────────────────────────────

function PulsingText({ text }: { text: string }) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[{ fontSize: 16, fontWeight: '700', color: COLORS.textSecondary }, animStyle]}>
      {text}
    </Animated.Text>
  );
}

// ─── Readiness Preview ────────────────────────────────────────────────────────

interface ReadinessPreviewProps {
  marketingStrength: number;
  productReadiness: number;
  competitionIntensity: number;
}

function ReadinessPreview({ marketingStrength, productReadiness, competitionIntensity }: ReadinessPreviewProps) {
  const indicators = [
    { label: 'Marketing', value: marketingStrength },
    { label: 'Product', value: productReadiness },
    { label: 'Competition', value: competitionIntensity },
  ];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 12 }}>
      {indicators.map(({ label, value }) => {
        const dotColor = zoneColor(value);
        return (
          <View key={label} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor }} />
            <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
          <SectionHeader
            title="Strategy Inputs"
            description="Describe your startup to get a tailored analysis"
          />

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
          }}
        >
          <SectionHeader
            title="Strength Indicators"
            description="Rate your current position on each dimension"
          />

          <SliderField
            label="Marketing Strength"
            value={marketingStrength}
            onValueChange={setMarketingStrength}
            color={COLORS.positive}
            type="marketing"
          />
          <SliderField
            label="Product Readiness"
            value={productReadiness}
            onValueChange={setProductReadiness}
            color={COLORS.primary}
            type="product"
          />
          <SliderField
            label="Competition Intensity"
            value={competitionIntensity}
            onValueChange={setCompetitionIntensity}
            color={COLORS.negative}
            type="competition"
          />
        </Animated.View>

        {error ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={{
              backgroundColor: 'rgba(248,113,113,0.10)',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(248,113,113,0.25)',
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.negative, lineHeight: 20 }}>{error}</Text>
          </Animated.View>
        ) : null}

        <ReadinessPreview
          marketingStrength={marketingStrength}
          productReadiness={productReadiness}
          competitionIntensity={competitionIntensity}
        />

        <AnimatedPressable
          onPress={handleEvaluate}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? COLORS.surfaceTertiary : COLORS.primary,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          {isLoading ? (
            <PulsingText text="Evaluating strategy..." />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Run evaluation</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
