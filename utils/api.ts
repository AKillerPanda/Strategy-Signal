export const API_BASE_URL = 'PASTE_YOUR_DEPLOYED_API_URL_HERE';

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

export async function evaluateStrategy(input: EvaluateInput): Promise<StrategyResult> {
  console.log('[API] evaluateStrategy called', { input });
  const response = await fetch(`${API_BASE_URL}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[API] evaluateStrategy error', { status: response.status, text });
    throw new Error(`API error: ${response.status} — ${text.slice(0, 200)}`);
  }

  const raw = await response.json() as Partial<StrategyResult>;
  console.log('[API] evaluateStrategy response', raw);

  const score = Number(raw.strategy_score ?? 50);

  const result: StrategyResult = {
    strategy_score: score,
    marketing_strength: Number(raw.marketing_strength ?? input.marketing_strength),
    product_readiness: Number(raw.product_readiness ?? input.product_readiness),
    competition_intensity: Number(raw.competition_intensity ?? input.competition_intensity),
    fragmentation_risk: Number(raw.fragmentation_risk ?? 50),
    best_launch_strategy: String(raw.best_launch_strategy ?? 'Focused Launch'),
    top_recommendation: String(raw.top_recommendation ?? 'Evaluate your strategy to get recommendations.'),
    recommendations: raw.recommendations && raw.recommendations.length > 0
      ? raw.recommendations
      : raw.top_recommendation
        ? [{ title: 'Top Recommendation', description: String(raw.top_recommendation), priority: 'high', category: 'Strategy' }]
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
      : generateMockHistory(Number(raw.marketing_strength ?? input.marketing_strength)),
    product_readiness_history: raw.product_readiness_history && raw.product_readiness_history.length > 0
      ? raw.product_readiness_history
      : generateMockHistory(Number(raw.product_readiness ?? input.product_readiness)),
    market_pressure_history: raw.market_pressure_history && raw.market_pressure_history.length > 0
      ? raw.market_pressure_history
      : generateMockHistory(Number(raw.competition_intensity ?? input.competition_intensity)),
    evaluated_at: raw.evaluated_at ?? new Date().toISOString(),
  };

  return result;
}
