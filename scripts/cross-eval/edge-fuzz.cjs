// Hammer /evaluate with edge inputs that the UI could plausibly produce.
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8000';
const { evaluateStrategy } = require('./_build/out/api.js');

const cases = [
  { label: 'all empty arrays + zeros',     input: { features: [], channels: [], competitors: [], milestones: [], marketing_strength: 0, product_readiness: 0, competition_intensity: 0 } },
  { label: 'all empty arrays + max',       input: { features: [], channels: [], competitors: [], milestones: [], marketing_strength: 100, product_readiness: 100, competition_intensity: 100 } },
  { label: 'single feature, no others',    input: { features: ['solo'], channels: [], competitors: [], milestones: [], marketing_strength: 50, product_readiness: 50, competition_intensity: 50 } },
  { label: 'long unicode strings',         input: { features: ['🚀 AI 🤖'], channels: ['💬 chat'], competitors: ['αβγ Co.'], milestones: ['mile 一'], marketing_strength: 33, product_readiness: 77, competition_intensity: 44 } },
  { label: '20 of each',                   input: { features: Array.from({length:20},(_,i)=>`f${i}`), channels: Array.from({length:20},(_,i)=>`c${i}`), competitors: Array.from({length:20},(_,i)=>`x${i}`), milestones: Array.from({length:20},(_,i)=>`m${i}`), marketing_strength: 70, product_readiness: 65, competition_intensity: 55 } },
  { label: 'whitespace-only strings',      input: { features: ['   '], channels: [' '], competitors: ['\t'], milestones: ['\n'], marketing_strength: 25, product_readiness: 25, competition_intensity: 25 } },
];

let asserts = 0, fails = 0;
function assert(label, cond, detail) {
  asserts++;
  if (!cond) { fails++; console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
}

(async () => {
  console.log('=== Edge fuzz against /evaluate ===');
  for (const c of cases) {
    try {
      const r = await evaluateStrategy(c.input);
      console.log(`  ${c.label}: score=${r.strategy_score} frag=${r.fragmentation_risk} strat="${r.best_launch_strategy}"`);
      assert(`${c.label}: score finite`, Number.isFinite(r.strategy_score), `${r.strategy_score}`);
      assert(`${c.label}: score in 0..100`, r.strategy_score >= 0 && r.strategy_score <= 100, `${r.strategy_score}`);
      assert(`${c.label}: fragmentation_risk in 0..100`, r.fragmentation_risk >= 0 && r.fragmentation_risk <= 100, `${r.fragmentation_risk}`);
      assert(`${c.label}: has best_launch_strategy`, typeof r.best_launch_strategy === 'string' && r.best_launch_strategy.length > 0);
      assert(`${c.label}: top_recommendation non-empty`, typeof r.top_recommendation === 'string' && r.top_recommendation.length > 0);
      assert(`${c.label}: histories non-empty`, r.score_history.length > 0 && r.launch_readiness_history.length > 0);
    } catch (e) {
      assert(`${c.label}: did not throw`, false, e.message);
    }
  }
  console.log(`\nedge-fuzz: ${asserts - fails}/${asserts} passed, ${fails} failures`);
  process.exit(fails === 0 ? 0 : 1);
})();
