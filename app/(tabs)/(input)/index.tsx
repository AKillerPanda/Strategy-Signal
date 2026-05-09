import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { COLORS } from '@/styles/colors';
import { StrategyContext } from '@/utils/strategyStore';
import { evaluateStrategy, EvaluateInput } from '@/utils/api';
import { DEMO_PRESETS, DemoPreset, DemoPresetId, evaluateDemoPreset, getDemoPreset } from '@/utils/demoPresets';
import AnimatedPressable from '@/components/AnimatedPressable';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const RETURN_ROUTES = {
  home: '/(tabs)/(home)',
  feed: '/(tabs)/(feed)',
  charts: '/(tabs)/(charts)',
  watchlist: '/(tabs)/(watchlist)',
} as const;

type ReturnRouteKey = keyof typeof RETURN_ROUTES;

function isReturnRouteKey(value: string | undefined): value is ReturnRouteKey {
  return Boolean(value && value in RETURN_ROUTES);
}

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

function DemoPresetCard({
  preset,
  selected,
  onPress,
}: {
  preset: DemoPreset;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? COLORS.surfaceHighlight : COLORS.surfaceSecondary,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: selected ? `${COLORS.primary}70` : COLORS.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{preset.title}</Text>
          <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>{preset.subtitle}</Text>
        </View>
        <View
          style={{
            backgroundColor: selected ? COLORS.primaryMuted : COLORS.surface,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: selected ? COLORS.primary : COLORS.textSecondary, letterSpacing: 0.8 }}>
            {selected ? 'ACTIVE' : 'PRESET'}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>{preset.description}</Text>
      <TagRow items={preset.input.features} />
    </AnimatedPressable>
  );
}

function DemoGuide({ preset, onSelectPreset }: { preset: DemoPreset; onSelectPreset: (presetId: DemoPresetId) => void }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(80).springify()}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 1.4 }}>
          Guided Demo
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
          Pick a preset, then run the demo to fill every tab.
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 }}>
          The demo stays inside the app, so Dashboard, Feed, Charts, and Watchlist all load with stable preset data.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {DEMO_PRESETS.map((candidate) => (
          <DemoPresetCard
            key={candidate.id}
            preset={candidate}
            selected={candidate.id === preset.id}
            onPress={() => onPressPreset(candidate.id)}
          />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }}>
          What this demo covers
        </Text>
        {preset.featureTour.map((item) => (
          <View key={item.title} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{item.title}</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  function onPressPreset(presetId: DemoPresetId) {
    onSelectPreset(presetId);
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; from?: string | string[]; preset?: string | string[] }>();
  const { setResult, setIsLoading, isLoading, setLastInput } = React.use(StrategyContext);

  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
  const presetParam = Array.isArray(params.preset) ? params.preset[0] : params.preset;
  const demoMode = modeParam === 'demo';
  const fromRoute = isReturnRouteKey(fromParam) ? RETURN_ROUTES[fromParam] : null;
  const initialPresetId = (getDemoPreset(presetParam)?.id ?? DEMO_PRESETS[0].id) as DemoPresetId;

  const [features, setFeatures] = React.useState('');
  const [channels, setChannels] = React.useState('');
  const [competitors, setCompetitors] = React.useState('');
  const [milestones, setMilestones] = React.useState('');
  const [marketingStrength, setMarketingStrength] = React.useState(70);
  const [productReadiness, setProductReadiness] = React.useState(65);
  const [competitionIntensity, setCompetitionIntensity] = React.useState(60);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = React.useState<DemoPresetId>(initialPresetId);

  const selectedPreset = getDemoPreset(selectedPresetId) ?? DEMO_PRESETS[0];

  React.useEffect(() => {
    if (!demoMode) return;
    setSelectedPresetId(initialPresetId);
  }, [demoMode, initialPresetId]);

  const applyPreset = React.useCallback((preset: DemoPreset) => {
    setFeatures(preset.input.features.join(', '));
    setChannels(preset.input.channels.join(', '));
    setCompetitors(preset.input.competitors.join(', '));
    setMilestones(preset.input.milestones.join(', '));
    setMarketingStrength(preset.input.marketing_strength);
    setProductReadiness(preset.input.product_readiness);
    setCompetitionIntensity(preset.input.competition_intensity);
    setError(null);
  }, []);

  React.useEffect(() => {
    if (!demoMode) return;
    applyPreset(selectedPreset);
  }, [applyPreset, demoMode, selectedPreset]);

  const handleBack = () => {
    if (fromRoute) {
      router.push(fromRoute);
      return;
    }

    router.push('/(tabs)/(home)');
  };

  const handleRunDemo = async () => {
    console.log('[Input] Guided demo button pressed', selectedPresetId);
    setError(null);
    setIsLoading(true);

    try {
      const { input, result } = evaluateDemoPreset(selectedPresetId);
      setLastInput(input);
      setResult(result);
      router.push('/(tabs)/(home)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to run the guided demo.';
      console.error('[Input] Guided demo failed', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180, paddingTop: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {fromRoute ? (
          <AnimatedPressable
            onPress={handleBack}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              paddingVertical: 6,
            }}
          >
            <ChevronLeft size={16} color={COLORS.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>Back</Text>
          </AnimatedPressable>
        ) : null}

        {demoMode ? (
          <DemoGuide preset={selectedPreset} onSelectPreset={setSelectedPresetId} />
        ) : null}

        <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
          <SectionHeader
            title="Evaluate Strategy"
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
          onPress={demoMode ? handleRunDemo : handleEvaluate}
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
            <PulsingText text={demoMode ? 'Loading guided demo...' : 'Evaluating strategy...'} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {demoMode ? 'Run guided demo' : 'Run evaluation'}
            </Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
