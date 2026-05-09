"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_BASE_URL = void 0;
exports.buildLocalStrategyResult = buildLocalStrategyResult;
exports.evaluateStrategy = evaluateStrategy;
const expo_constants_1 = __importDefault(require("expo-constants"));
const extra = (expo_constants_1.default.expoConfig?.extra ?? {});
const EXPLICIT_API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const CONFIGURED_API_BASE_URL = (extra.backendUrl || '').replace(/\/+$/, '');
const LOCAL_DEV_API_BASE_URL = (process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
exports.API_BASE_URL = EXPLICIT_API_BASE_URL || CONFIGURED_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_STRATEGYSIGNAL_API_KEY || extra.apiKey || '';
function isLocalWebPreview() {
    if (typeof globalThis.location === 'undefined') {
        return false;
    }
    return globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1';
}
function getApiBaseCandidates() {
    const candidates = [];
    if (EXPLICIT_API_BASE_URL) {
        candidates.push(EXPLICIT_API_BASE_URL);
    }
    else if (isLocalWebPreview() && LOCAL_DEV_API_BASE_URL) {
        candidates.push(LOCAL_DEV_API_BASE_URL);
    }
    if (CONFIGURED_API_BASE_URL && !candidates.includes(CONFIGURED_API_BASE_URL)) {
        candidates.push(CONFIGURED_API_BASE_URL);
    }
    return candidates;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function titleCase(value) {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}
function buildTrendSeries(target, spread, length = 12) {
    const start = clamp(target - spread, 5, 95);
    return Array.from({ length }, (_, index) => {
        const progress = length === 1 ? 1 : index / (length - 1);
        const oscillation = Math.sin(index * 1.15) * spread * 0.12;
        return clamp(Math.round(start + (target - start) * progress + oscillation), 0, 100);
    });
}
function buildCompetitorResponse(name, input, index) {
    const threatScore = clamp(Math.round(input.competition_intensity
        + 12
        - index * 7
        + input.marketing_strength * 0.08
        - input.product_readiness * 0.05), 22, 91);
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
function buildRecommendations(input, bestLaunchStrategy, fragmentationRisk) {
    const recommendations = [];
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
function buildLocalStrategyResult(input) {
    const featureCount = Math.max(input.features.length, 1);
    const channelCount = Math.max(input.channels.length, 1);
    const competitorCount = Math.max(input.competitors.length, 1);
    const milestoneCount = Math.max(input.milestones.length, 1);
    const fragmentationRisk = clamp(Math.round(18
        + input.competition_intensity * 0.26
        + Math.abs(featureCount - milestoneCount) * 5
        + Math.max(0, competitorCount - channelCount) * 4
        - input.product_readiness * 0.14), 18, 84);
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
    const strategyScore = clamp(Math.round(input.marketing_strength * 0.34
        + input.product_readiness * 0.42
        + (100 - input.competition_intensity) * 0.24
        + coverageBonus
        - fragmentationRisk * 0.08), 10, 96);
    const recommendations = buildRecommendations(input, bestLaunchStrategy, fragmentationRisk);
    const competitors = (input.competitors.length > 0
        ? input.competitors
        : ['Market leader', 'Emerging startup', 'Niche challenger']).map((name, index) => buildCompetitorResponse(titleCase(name), input, index));
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
function generateMockHistory(baseValue, length = 12) {
    return Array.from({ length }, () => Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * 20)));
}
function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) {
        headers['x-api-key'] = API_KEY;
    }
    return headers;
}
function buildRecommendationCards(recommendations) {
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
// Backend reports fragmentation on 0..1; UI expects 0..100. Scale up if it
// looks like a fraction so the dashboard's percentage rendering stays correct.
function toPercent(value) {
    if (!Number.isFinite(value))
        return 50;
    return value <= 1.5 ? clamp(Math.round(value * 100), 0, 100) : clamp(Math.round(value), 0, 100);
}
function normalizeBackendResult(raw, input) {
    const summary = raw.summary ?? {};
    const recommendationCards = raw.recommendations && raw.recommendations.length > 0
        ? raw.recommendations
        : buildRecommendationCards(raw.evaluation?.recommendations);
    const score = Number(summary.strategy_score ?? raw.strategy_score ?? 50);
    const rawFragmentation = Number(summary.fragmentation_risk ?? summary.fragmentation_score ?? raw.fragmentation_risk ?? 50);
    return {
        strategy_score: score,
        marketing_strength: Number(summary.marketing_strength ?? raw.marketing_strength ?? input.marketing_strength),
        product_readiness: Number(summary.product_readiness ?? raw.product_readiness ?? input.product_readiness),
        competition_intensity: Number(summary.competition_intensity ?? raw.competition_intensity ?? input.competition_intensity),
        fragmentation_risk: toPercent(rawFragmentation),
        best_launch_strategy: String(summary.best_launch_strategy ?? raw.best_launch_strategy ?? 'Focused Launch'),
        top_recommendation: String(summary.top_recommendation
            ?? raw.top_recommendation
            ?? recommendationCards[0]?.description
            ?? 'Evaluate your strategy to get recommendations.'),
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
}
async function evaluateStrategy(input) {
    const apiBaseCandidates = getApiBaseCandidates();
    if (apiBaseCandidates.length === 0) {
        console.warn('[API] Missing API base URL, using local evaluation fallback');
        return buildLocalStrategyResult(input);
    }
    console.log('[API] evaluateStrategy called', { input, apiBaseCandidates });
    for (const baseUrl of apiBaseCandidates) {
        try {
            const response = await fetch(`${baseUrl}/evaluate`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify(input),
            });
            if (!response.ok) {
                const text = await response.text();
                console.error('[API] evaluateStrategy error', { baseUrl, status: response.status, text });
                continue;
            }
            const raw = await response.json();
            console.log('[API] evaluateStrategy response', { baseUrl, raw });
            return normalizeBackendResult(raw, input);
        }
        catch (error) {
            console.error('[API] evaluateStrategy network failure', { baseUrl, error });
        }
    }
    console.warn('[API] Falling back to local evaluation after all backend candidates failed');
    return buildLocalStrategyResult(input);
}
