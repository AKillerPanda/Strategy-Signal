import { EvaluateInput, StrategyResult } from './api';

export type DemoPresetId = 'ai-copilot' | 'creator-growth' | 'ops-marketplace';

export interface DemoPresetFeature {
  title: string;
  description: string;
}

export interface DemoPreset {
  id: DemoPresetId;
  title: string;
  subtitle: string;
  description: string;
  input: EvaluateInput;
  featureTour: DemoPresetFeature[];
  result: Omit<StrategyResult, 'evaluated_at'>;
}

const SHARED_FEATURE_TOUR: DemoPresetFeature[] = [
  {
    title: 'Dashboard',
    description: 'Shows the strategy score, launch posture, fragmentation risk, and top recommendation.',
  },
  {
    title: 'Feed',
    description: 'Loads prioritized recommendation cards so you can inspect the advice flow end-to-end.',
  },
  {
    title: 'Charts',
    description: 'Populates score, readiness, and market-pressure history so the chart interactions have real data.',
  },
  {
    title: 'Watchlist',
    description: 'Creates competitor threat rows with suggested responses for the watchlist tab.',
  },
];

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'ai-copilot',
    title: 'AI Copilot Launch',
    subtitle: 'B2B workflow assistant',
    description: 'A polished SaaS launch with strong product readiness and manageable competition.',
    input: {
      features: ['AI dashboard', 'workflow automation', 'team alerts'],
      channels: ['LinkedIn', 'SEO', 'partner webinars'],
      competitors: ['Notion AI', 'ClickUp AI', 'HubSpot AI'],
      milestones: ['Private beta', 'Pilot customers', 'Public launch'],
      marketing_strength: 74,
      product_readiness: 82,
      competition_intensity: 61,
    },
    featureTour: SHARED_FEATURE_TOUR,
    result: {
      strategy_score: 79,
      marketing_strength: 74,
      product_readiness: 82,
      competition_intensity: 61,
      fragmentation_risk: 34,
      best_launch_strategy: 'Focused pilot launch',
      top_recommendation: 'Turn pilot wins into proof points before widening the launch to larger teams.',
      recommendations: [
        {
          title: 'Lock in pilot references',
          description: 'Convert your first pilot accounts into public case studies so the sales motion compounds quickly.',
          priority: 'high',
          category: 'Go-To-Market',
        },
        {
          title: 'Protect onboarding simplicity',
          description: 'Keep the first-run flow short so buyers can understand the AI value before adding advanced automation.',
          priority: 'medium',
          category: 'Product',
        },
        {
          title: 'Differentiate on workflow depth',
          description: 'Compete against generic AI assistants by highlighting action automation rather than chat alone.',
          priority: 'medium',
          category: 'Competition',
        },
      ],
      competitors: [
        {
          name: 'Notion AI',
          threat_score: 72,
          suggested_response: 'Position around execution workflows and operational follow-through, not note-taking.',
        },
        {
          name: 'ClickUp AI',
          threat_score: 65,
          suggested_response: 'Lead with alerting and task automation for teams that need faster operational visibility.',
        },
        {
          name: 'HubSpot AI',
          threat_score: 54,
          suggested_response: 'Stay focused on internal workflow orchestration instead of CRM-heavy positioning.',
        },
      ],
      score_history: [61, 63, 65, 66, 68, 69, 71, 73, 75, 77, 78, 79],
      launch_readiness_history: [52, 55, 58, 60, 63, 65, 67, 69, 70, 72, 73, 74],
      product_readiness_history: [56, 58, 61, 64, 67, 70, 73, 75, 77, 79, 81, 82],
      market_pressure_history: [48, 50, 52, 53, 55, 56, 57, 58, 59, 60, 60, 61],
    },
  },
  {
    id: 'creator-growth',
    title: 'Creator Growth Suite',
    subtitle: 'Consumer growth preset',
    description: 'A high-marketing scenario with heavier competition pressure and sharper channel tradeoffs.',
    input: {
      features: ['Link-in-bio analytics', 'sponsorship tracking', 'creator CRM'],
      channels: ['TikTok', 'Instagram', 'creator referrals'],
      competitors: ['Beehiiv', 'ConvertKit', 'Stan'],
      milestones: ['Closed alpha', 'Referral loop', 'Paid creator plans'],
      marketing_strength: 86,
      product_readiness: 68,
      competition_intensity: 76,
    },
    featureTour: SHARED_FEATURE_TOUR,
    result: {
      strategy_score: 69,
      marketing_strength: 86,
      product_readiness: 68,
      competition_intensity: 76,
      fragmentation_risk: 47,
      best_launch_strategy: 'Audience-first niche launch',
      top_recommendation: 'Pick one creator segment first so your acquisition strength is not diluted by a broad product story.',
      recommendations: [
        {
          title: 'Focus on one creator segment',
          description: 'Own a narrow creator niche first, then expand once your referral loop and retention metrics stabilize.',
          priority: 'high',
          category: 'Positioning',
        },
        {
          title: 'Improve sponsor workflow depth',
          description: 'Product readiness is good enough to launch, but sponsor tracking needs clearer proof of ROI.',
          priority: 'medium',
          category: 'Product',
        },
        {
          title: 'Convert social reach into owned demand',
          description: 'Turn strong social channels into email and creator-community capture so growth is less platform-dependent.',
          priority: 'medium',
          category: 'Growth',
        },
      ],
      competitors: [
        {
          name: 'Beehiiv',
          threat_score: 70,
          suggested_response: 'Stand apart with cross-channel creator ops instead of newsletter growth alone.',
        },
        {
          name: 'ConvertKit',
          threat_score: 66,
          suggested_response: 'Emphasize sponsorship workflows and collaboration features beyond email automation.',
        },
        {
          name: 'Stan',
          threat_score: 62,
          suggested_response: 'Lead with analytics and sponsor operations for creators running a business, not just link pages.',
        },
      ],
      score_history: [58, 60, 61, 62, 63, 64, 65, 66, 66, 67, 68, 69],
      launch_readiness_history: [60, 64, 67, 70, 73, 75, 78, 80, 82, 84, 85, 86],
      product_readiness_history: [50, 52, 55, 57, 59, 61, 63, 64, 65, 66, 67, 68],
      market_pressure_history: [61, 63, 64, 66, 68, 69, 71, 72, 73, 74, 75, 76],
    },
  },
  {
    id: 'ops-marketplace',
    title: 'Ops Marketplace',
    subtitle: 'B2B marketplace preset',
    description: 'A balanced launch with stronger operational depth, useful for showing the watchlist and recommendation tabs.',
    input: {
      features: ['Vendor directory', 'route optimization', 'compliance dashboard'],
      channels: ['Industry events', 'outbound sales', 'channel partners'],
      competitors: ['Project44', 'Motive', 'ShipBob'],
      milestones: ['Regional pilot', 'Multi-city rollout', 'Enterprise contracts'],
      marketing_strength: 63,
      product_readiness: 78,
      competition_intensity: 58,
    },
    featureTour: SHARED_FEATURE_TOUR,
    result: {
      strategy_score: 74,
      marketing_strength: 63,
      product_readiness: 78,
      competition_intensity: 58,
      fragmentation_risk: 39,
      best_launch_strategy: 'Regional expansion launch',
      top_recommendation: 'Use the regional pilot to prove fulfillment reliability before expanding the marketplace footprint.',
      recommendations: [
        {
          title: 'Validate supplier reliability metrics',
          description: 'Operational trust is your wedge, so surface compliance and delivery reliability in every customer conversation.',
          priority: 'high',
          category: 'Operations',
        },
        {
          title: 'Strengthen outbound proof points',
          description: 'Marketing is serviceable, but outbound will convert better once the pilot has clearer ROI numbers.',
          priority: 'medium',
          category: 'Sales',
        },
        {
          title: 'Sequence expansion city by city',
          description: 'Avoid fragmentation by expanding only where supplier density and compliance data are both strong.',
          priority: 'medium',
          category: 'Expansion',
        },
      ],
      competitors: [
        {
          name: 'Project44',
          threat_score: 68,
          suggested_response: 'Compete on supplier coordination workflows rather than enterprise visibility breadth.',
        },
        {
          name: 'Motive',
          threat_score: 57,
          suggested_response: 'Differentiate with marketplace orchestration and compliance rollups for operators.',
        },
        {
          name: 'ShipBob',
          threat_score: 49,
          suggested_response: 'Lead with regional flexibility and vendor transparency instead of fulfillment-only messaging.',
        },
      ],
      score_history: [57, 59, 61, 63, 65, 66, 68, 69, 71, 72, 73, 74],
      launch_readiness_history: [49, 51, 53, 55, 57, 58, 59, 60, 61, 62, 62, 63],
      product_readiness_history: [58, 60, 62, 65, 67, 69, 71, 73, 74, 75, 77, 78],
      market_pressure_history: [44, 46, 47, 49, 50, 51, 53, 54, 55, 56, 57, 58],
    },
  },
];

export function getDemoPreset(id: string | undefined): DemoPreset | undefined {
  return DEMO_PRESETS.find((preset) => preset.id === id);
}

export function evaluateDemoPreset(presetId: DemoPresetId): { input: EvaluateInput; result: StrategyResult } {
  const preset = getDemoPreset(presetId) ?? DEMO_PRESETS[0];

  return {
    input: preset.input,
    result: {
      ...preset.result,
      evaluated_at: new Date().toISOString(),
    },
  };
}