// Bridges the cross-eval harness to the live backend so the SAME normalizer
// the app uses (utils/api.ts → evaluateStrategy) is exercised end-to-end.

process.env.EXPO_PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

const { evaluateStrategy, buildLocalStrategyResult } = require('./_build/out/api.js');
const { DEMO_PRESETS } = require('./_build/out/demoPresets.js');

let totalAsserts = 0;
let totalFails = 0;
function assert(label, cond, detail) {
  totalAsserts++;
  if (!cond) {
    totalFails++;
    console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return cond;
}

(async () => {
  console.log('=== Backend cross-validation ===');
  console.log(`Backend: ${process.env.EXPO_PUBLIC_API_BASE_URL}`);

  // 1. /health probe
  let health = null;
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/health`);
    health = await res.json();
    assert('health endpoint returns 200', res.status === 200, `status=${res.status}`);
    assert('health.status === "ok"', health.status === 'ok', JSON.stringify(health));
  } catch (e) {
    assert('health endpoint reachable', false, e.message);
  }

  // 2. Run /evaluate via the real evaluateStrategy() for each demo preset and
  //    cross-validate against buildLocalStrategyResult() for the same input.
  for (const preset of DEMO_PRESETS) {
    const remote = await evaluateStrategy(preset.input);
    const local = buildLocalStrategyResult(preset.input);

    console.log(`\n  preset="${preset.id}"`);
    console.log(`    remote: score=${remote.strategy_score} frag=${remote.fragmentation_risk} strat="${remote.best_launch_strategy}"`);
    console.log(`    local:  score=${local.strategy_score} frag=${local.fragmentation_risk} strat="${local.best_launch_strategy}"`);

    // Shape parity
    assert(`${preset.id}: remote has same keys as local`, Object.keys(remote).sort().join(',') === Object.keys(local).sort().join(','),
      `\n      remote=${Object.keys(remote).sort().join(',')}\n      local =${Object.keys(local).sort().join(',')}`);

    // Both finite, in 0..100
    assert(`${preset.id}: remote score in 0..100`, remote.strategy_score >= 0 && remote.strategy_score <= 100, `${remote.strategy_score}`);
    assert(`${preset.id}: remote fragmentation_risk in 0..100`, remote.fragmentation_risk >= 0 && remote.fragmentation_risk <= 100, `${remote.fragmentation_risk}`);

    // Recommendations populated
    assert(`${preset.id}: remote has ≥1 recommendation`, remote.recommendations.length >= 1, `got ${remote.recommendations.length}`);
    assert(`${preset.id}: remote has top_recommendation`, !!remote.top_recommendation && remote.top_recommendation.length > 5);

    // Histories populated for charts
    assert(`${preset.id}: remote score_history non-empty`, remote.score_history.length > 0);
    assert(`${preset.id}: remote launch_readiness_history non-empty`, remote.launch_readiness_history.length > 0);

    // Competitors fall back to synthesized when backend doesn't supply
    assert(`${preset.id}: competitors filled in`, remote.competitors.length >= 1);
  }

  // 3. Idempotence — calling /evaluate twice with same input yields same headline numbers
  const a = await evaluateStrategy(DEMO_PRESETS[0].input);
  const b = await evaluateStrategy(DEMO_PRESETS[0].input);
  assert('backend idempotent: strategy_score', a.strategy_score === b.strategy_score, `${a.strategy_score} vs ${b.strategy_score}`);
  assert('backend idempotent: best_launch_strategy', a.best_launch_strategy === b.best_launch_strategy);
  assert('backend idempotent: fragmentation_risk', a.fragmentation_risk === b.fragmentation_risk);

  console.log(`\nbackend-bridge: ${totalAsserts - totalFails}/${totalAsserts} passed, ${totalFails} failures`);
  process.exit(totalFails === 0 ? 0 : 1);
})();
