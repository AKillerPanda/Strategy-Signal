import Constants from 'expo-constants';

type BackendResponse = Partial<StrategyResult> & {
  summary?: {
    strategy_score?: number;
    marketing_strength?: number;
    product_readiness?: number;
    competition_intensity?: number;
    fragmentation_score?: number;
    fragmentation_risk?: number;
    best_launch_strategy?: string;
    top_recommendation?: string | null;
  };
  evaluation?: {
    recommendations?: string[];
  };
};

type ExtraConfig = {
  backendUrl?: string;
  apiKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || extra.backendUrl || '').replace(/\/+$/, '');
const API_KEY = process.env.EXPO_PUBLIC_STRATEGYSIGNAL_API_KEY || extra.apiKey || '';

export interface EvaluateInput {
  features: string[];
  channels: string[];
  competitors: string[];
  milestones: string[];
  marketing_strength: number;
  product_readiness: number;
  competition_intensity: number;
}

export interface StrategyResult {
  strategy_score: number;
  marketing_strength: number;
  product_readiness: number;
  competition_intensity: number;
  fragmentation_risk: number;
  best_launch_strategy: string;
  top_recommendation: string;
  recommendations: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }[];
  competitors: {
    name: string;
    threat_score: number;
    suggested_response: string;
  }[];
  score_history: number[];
  launch_readiness_history: number[];
  product_readiness_history: number[];
  market_pressure_history: number[];
  evaluated_at: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildTrendSeries(target: number, spread: number, length = 12): number[] {
  const start = clamp(target - spread, 5, 95);
  return Array.from({ length }, (_, index) => {
    const progress = length === 1 ? 1 : index / (length - 1);
    const oscillation = Math.sin(index * 1.15) * spread * 0.12;
    return clamp(Math.round(start + (target - start) * progress + oscillation), 0, 100);
  });
}

function buildCompetitorResponse(name: string, input: EvaluateInput, index: number): StrategyResult['competitors'][number] {
  const threatScore = clamp(
    Math.round(
      input.competition_intensity
      + 12
      - index * 7
      + input.marketing_strength * 0.08
      - input.product_readiness * 0.05
    ),
    22,
    91
  );

  const suggestedResponse = threatScore >= 70
    ? `Differentiate ${name} with a narrower wedge built around ${input.features[0] ?? 'your strongest feature'}.`
    : threatScore >= 45
      ? `Keep ${name} in view and reinforce the launch with stronger proof points in ${input.channels[0] ?? 'your acquisition channel'}.`
      : `Monitor ${name}, but keep the focus on execution speed and product clarity.`;

  return {
    name,
    threat_score: threatScore,
    suggested_response: suggestedResponse,
  };
}

function buildRecommendations(input: EvaluateInput, bestLaunchStrategy: string, fragmentationRisk: number): StrategyResult['recommendations'] {
  const recommendations: StrategyResult['recommendations'] = [];

  if (input.product_readiness < 70) {
    recommendations.push({
      title: 'Tighten the MVP before scaling',
      description: 'Product readiness is still the limiting factor, so reduce launch scope and improve reliability before pushing harder on growth.',
      priority: 'high',
      category: 'Product',
    });
  }

  if (input.marketing_strength < 70) {
    recommendations.push({
      title: 'Strengthen one acquisition loop',
      description: `Double down on ${input.channels[0] ?? 'your best channel'} so the launch is driven by one repeatable growth motion instead of scattered experiments.`,
      priority: input.marketing_strength < 55 ? 'high' : 'medium',
      category: 'Growth',
    });
  }

  if (input.competition_intensity >= 65) {
    recommendations.push({
      title: 'Sharpen the market positioning',
      description: `Competition is high, so the pitch should be anchored around ${input.features[0] ?? 'a single differentiator'} rather than a broad feature list.`,
      priority: 'medium',
      category: 'Competition',
    });
  }

  if (fragmentationRisk >= 45) {
    recommendations.push({
      title: 'Reduce execution fragmentation',
      description: 'Your milestones, channels, and product story are not fully aligned yet. Sequence the launch more tightly before adding more moving parts.',
      priority: 'medium',
      category: 'Operations',
    });
  }

  recommendations.push({
    title: 'Lean into the best launch posture',
    description: `The current signals favor a ${bestLaunchStrategy.toLowerCase()}, so align pricing, messaging, and rollout timing around that path.`,
    priority: 'low',
    category: 'Strategy',
  });

  return recommendations.slice(0, 4);
}

export function buildLocalStrategyResult(input: EvaluateInput): StrategyResult {
  const featureCount = Math.max(input.features.length, 1);
  const channelCount = Math.max(input.channels.length, 1);
  const competitorCount = Math.max(input.competitors.length, 1);
  const milestoneCount = Math.max(input.milestones.length, 1);

  const fragmentationRisk = clamp(
    Math.round(
      18
      + input.competition_intensity * 0.26
      + Math.abs(featureCount - milestoneCount) * 5
      + Math.max(0, competitorCount - channelCount) * 4
      - input.product_readiness * 0.14
    ),
    18,
    84
  );

  const aggressiveLaunch = input.marketing_strength * 0.5 + input.product_readiness * 0.24 - input.competition_intensity * 0.16 + channelCount * 2.2;
  const focusedLaunch = input.product_readiness * 0.44 + (100 - input.competition_intensity) * 0.24 + milestoneCount * 2.5 + featureCount * 1.4;
  const nicheLaunch = input.marketing_strength * 0.18 + input.product_readiness * 0.3 + (100 - input.competition_intensity) * 0.34 + competitorCount * 1.5;

  const strategyScores = [
    { name: 'Aggressive launch', score: aggressiveLaunch },
    { name: 'Focused pilot launch', score: focusedLaunch },
    { name: 'Niche positioning launch', score: nicheLaunch },
  ];

  const bestLaunchStrategy = strategyScores.sort((left, right) => right.score - left.score)[0].name;
  const coverageBonus = Math.min((featureCount + channelCount + milestoneCount) * 1.4, 16);
  const strategyScore = clamp(
    Math.round(
      input.marketing_strength * 0.34
      + input.product_readiness * 0.42
      + (100 - input.competition_intensity) * 0.24
      + coverageBonus
      - fragmentationRisk * 0.08
    ),
    10,
    96
  );

  const recommendations = buildRecommendations(input, bestLaunchStrategy, fragmentationRisk);
  const competitors = (input.competitors.length > 0
    ? input.competitors
    : ['Market leader', 'Emerging startup', 'Niche challenger']
  ).map((name, index) => buildCompetitorResponse(titleCase(name), input, index));

  return {
    strategy_score: strategyScore,
    marketing_strength: input.marketing_strength,
    product_readiness: input.product_readiness,
    competition_intensity: input.competition_intensity,
    fragmentation_risk: fragmentationRisk,
    best_launch_strategy: bestLaunchStrategy,
    top_recommendation: recommendations[0]?.description ?? 'Refine the launch plan and test one clear wedge first.',
    recommendations,
    competitors,
    score_history: buildTrendSeries(strategyScore, 18),
    launch_readiness_history: buildTrendSeries(input.marketing_strength, 16),
    product_readiness_history: buildTrendSeries(input.product_readiness, 14),
    market_pressure_history: buildTrendSeries(input.competition_intensity, 12),
    evaluated_at: new Date().toISOString(),
  };
}

function generateMockHistory(baseValue: number, length = 12): number[] {
  return Array.from({ length }, () =>
    Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * 20))
  );
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return headers;
}

function buildRecommendationCards(recommendations: string[] | undefined): StrategyResult['recommendations'] {
  if (!recommendations || recommendations.length === 0) {
    return [];
  }

  return recommendations.map((description, index) => ({
    title: index === 0 ? 'Top Recommendation' : `Recommendation ${index + 1}`,
    description,
    priority: index === 0 ? 'high' : 'medium',
    category: 'Strategy',
  }));
}

export async function evaluateStrategy(input: EvaluateInput): Promise<StrategyResult> {
  if (!API_BASE_URL) {
    console.warn('[API] Missing API base URL, using local evaluation fallback');
    return buildLocalStrategyResult(input);
  }

  console.log('[API] evaluateStrategy called', { input });

  try {
    const response = await fetch(`${API_BASE_URL}/evaluate`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[API] evaluateStrategy error', { status: response.status, text });
      console.warn('[API] Falling back to local evaluation after API error');
      return buildLocalStrategyResult(input);
    }

    const raw = await response.json() as BackendResponse;
    console.log('[API] evaluateStrategy response', raw);

    const summary = raw.summary ?? raw;
    const recommendationCards = raw.recommendations && raw.recommendations.length > 0
      ? raw.recommendations
      : buildRecommendationCards(raw.evaluation?.recommendations);
    const score = Number(summary.strategy_score ?? raw.strategy_score ?? 50);

    return {
      strategy_score: score,
      marketing_strength: Number(summary.marketing_strength ?? raw.marketing_strength ?? input.marketing_strength),
      product_readiness: Number(summary.product_readiness ?? raw.product_readiness ?? input.product_readiness),
      competition_intensity: Number(summary.competition_intensity ?? raw.competition_intensity ?? input.competition_intensity),
      fragmentation_risk: Number(summary.fragmentation_risk ?? summary.fragmentation_score ?? raw.fragmentation_risk ?? 50),
      best_launch_strategy: String(summary.best_launch_strategy ?? raw.best_launch_strategy ?? 'Focused Launch'),
      top_recommendation: String(
        summary.top_recommendation
        ?? raw.top_recommendation
        ?? recommendationCards[0]?.description
        ?? 'Evaluate your strategy to get recommendations.'
      ),
      recommendations: recommendationCards.length > 0
        ? recommendationCards
        : summary.top_recommendation
          ? [{ title: 'Top Recommendation', description: String(summary.top_recommendation), priority: 'high', category: 'Strategy' }]
          : [],
      competitors: raw.competitors && raw.competitors.length > 0
        ? raw.competitors
        : input.competitors.map((name, index) => buildCompetitorResponse(titleCase(name), input, index)),
      score_history: raw.score_history && raw.score_history.length > 0
        ? raw.score_history
        : generateMockHistory(score),
      launch_readiness_history: raw.launch_readiness_history && raw.launch_readiness_history.length > 0
        ? raw.launch_readiness_history
        : generateMockHistory(Number(summary.marketing_strength ?? raw.marketing_strength ?? input.marketing_strength)),
      product_readiness_history: raw.product_readiness_history && raw.product_readiness_history.length > 0
        ? raw.product_readiness_history
        : generateMockHistory(Number(summary.product_readiness ?? raw.product_readiness ?? input.product_readiness)),
      market_pressure_history: raw.market_pressure_history && raw.market_pressure_history.length > 0
        ? raw.market_pressure_history
        : generateMockHistory(Number(summary.competition_intensity ?? raw.competition_intensity ?? input.competition_intensity)),
      evaluated_at: raw.evaluated_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('[API] evaluateStrategy network failure', error);
    console.warn('[API] Falling back to local evaluation after network failure');
    return buildLocalStrategyResult(input);
  }
}
