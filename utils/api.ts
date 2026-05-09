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
    throw new Error('Missing StrategySignal API URL. Set EXPO_PUBLIC_API_BASE_URL or expo.extra.backendUrl in app.json.');
  }

  console.log('[API] evaluateStrategy called', { input });
  const response = await fetch(`${API_BASE_URL}/evaluate`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[API] evaluateStrategy error', { status: response.status, text });
    throw new Error(`API error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const raw = await response.json() as BackendResponse;
  console.log('[API] evaluateStrategy response', raw);

  const summary = raw.summary ?? raw;
  const recommendationCards = raw.recommendations && raw.recommendations.length > 0
    ? raw.recommendations
    : buildRecommendationCards(raw.evaluation?.recommendations);
  const score = Number(summary.strategy_score ?? raw.strategy_score ?? 50);

  const result: StrategyResult = {
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
      : input.competitors.map((name, i) => ({
          name,
          threat_score: Math.max(20, Math.min(90, 60 + (i % 3) * 10 - 10)),
          suggested_response: 'Monitor closely and differentiate on key features.',
        })),
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

  return result;
}
