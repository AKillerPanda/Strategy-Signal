/* eslint-disable no-console */
// Cross-evaluation harness for StrategySignal app pure logic.
// Runs 10 distinct passes, each emitting real metrics. Exits non-zero on any FAIL.

const path = require('path');
const fs = require('fs');

const api = require('./_build/out/api.js');
const demo = require('./_build/out/demoPresets.js');

const { buildLocalStrategyResult } = api;
const { DEMO_PRESETS, evaluateDemoPreset, getDemoPreset } = demo;

const results = [];
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

function pass(name, fn) {
  console.log(`\n=== Pass ${name} ===`);
  const startedAsserts = totalAsserts;
  const startedFails = totalFails;
  const t0 = Date.now();
  let metrics = {};
  try {
    metrics = fn() || {};
  } catch (e) {
    totalFails++;
    console.log(`    FAIL  threw: ${e && e.stack ? e.stack.split('\n')[0] : e}`);
  }
  const dt = Date.now() - t0;
  const localAsserts = totalAsserts - startedAsserts;
  const localFails = totalFails - startedFails;
  const status = localFails === 0 ? 'PASS' : 'FAIL';
  console.log(`    ${status} (${localAsserts - localFails}/${localAsserts} asserts, ${dt}ms)`);
  if (Object.keys(metrics).length) {
    for (const [k, v] of Object.entries(metrics)) {
      const out = typeof v === 'object' ? JSON.stringify(v) : String(v);
      console.log(`      • ${k}: ${out}`);
    }
  }
  results.push({ name, status, asserts: localAsserts, fails: localFails, ms: dt, metrics });
}

const baseInput = (over = {}) => ({
  features: ['feat-a', 'feat-b'],
  channels: ['ch-a', 'ch-b'],
  competitors: ['comp-a', 'comp-b'],
  milestones: ['mile-a', 'mile-b'],
  marketing_strength: 60,
  product_readiness: 60,
  competition_intensity: 50,
  ...over,
});

// --- Pass 1: Output shape ---------------------------------------------------
pass('1: Output shape & required fields', () => {
  const r = buildLocalStrategyResult(baseInput());
  const required = [
    'strategy_score', 'marketing_strength', 'product_readiness', 'competition_intensity',
    'fragmentation_risk', 'best_launch_strategy', 'top_recommendation',
    'recommendations', 'competitors',
    'score_history', 'launch_readiness_history', 'product_readiness_history', 'market_pressure_history',
    'evaluated_at',
  ];
  for (const f of required) assert(`field "${f}"`, f in r, `missing on result`);
  assert('recommendations is array', Array.isArray(r.recommendations));
  assert('competitors is array', Array.isArray(r.competitors));
  assert('score_history length 12', r.score_history.length === 12, `got ${r.score_history.length}`);
  return {
    score: r.strategy_score,
    fragmentation_risk: r.fragmentation_risk,
    rec_count: r.recommendations.length,
    competitor_count: r.competitors.length,
  };
});

// --- Pass 2: Score bounds & history clamping --------------------------------
pass('2: Score bounds (0..100) across 1000 random inputs', () => {
  let outOfBounds = 0;
  let nanCount = 0;
  let scoreMin = Infinity, scoreMax = -Infinity;
  for (let i = 0; i < 1000; i++) {
    const inp = baseInput({
      marketing_strength: Math.floor(Math.random() * 101),
      product_readiness: Math.floor(Math.random() * 101),
      competition_intensity: Math.floor(Math.random() * 101),
      features: Array.from({ length: 1 + Math.floor(Math.random() * 6) }, (_, k) => `f${k}`),
      channels: Array.from({ length: 1 + Math.floor(Math.random() * 6) }, (_, k) => `c${k}`),
      competitors: Array.from({ length: 1 + Math.floor(Math.random() * 6) }, (_, k) => `x${k}`),
      milestones: Array.from({ length: 1 + Math.floor(Math.random() * 6) }, (_, k) => `m${k}`),
    });
    const r = buildLocalStrategyResult(inp);
    if (Number.isNaN(r.strategy_score)) nanCount++;
    if (r.strategy_score < 0 || r.strategy_score > 100) outOfBounds++;
    scoreMin = Math.min(scoreMin, r.strategy_score);
    scoreMax = Math.max(scoreMax, r.strategy_score);
    for (const arr of [r.score_history, r.launch_readiness_history, r.product_readiness_history, r.market_pressure_history]) {
      if (arr.some((v) => Number.isNaN(v) || v < 0 || v > 100)) outOfBounds++;
    }
  }
  assert('no NaN scores', nanCount === 0, `got ${nanCount}`);
  assert('no out-of-bounds in score+histories', outOfBounds === 0, `got ${outOfBounds}`);
  return { score_min: scoreMin, score_max: scoreMax, n: 1000 };
});

// --- Pass 3: Monotonicity in product_readiness ------------------------------
pass('3: Monotonicity — product_readiness ↑ should not lower strategy_score', () => {
  let violations = 0;
  let totalDelta = 0;
  let cmps = 0;
  for (let trial = 0; trial < 200; trial++) {
    const m = Math.floor(Math.random() * 101);
    const c = Math.floor(Math.random() * 101);
    let prevScore = -1;
    for (let p = 0; p <= 100; p += 10) {
      const r = buildLocalStrategyResult(baseInput({
        marketing_strength: m, competition_intensity: c, product_readiness: p,
      }));
      if (prevScore !== -1) {
        cmps++;
        if (r.strategy_score < prevScore) violations++;
        totalDelta += r.strategy_score - prevScore;
      }
      prevScore = r.strategy_score;
    }
  }
  assert('no monotonicity violations', violations === 0, `${violations}/${cmps} violations`);
  return { comparisons: cmps, avg_delta_per_step: (totalDelta / cmps).toFixed(3) };
});

// --- Pass 4: Anti-monotonicity in competition_intensity ---------------------
pass('4: Anti-monotonicity — competition_intensity ↑ should not raise strategy_score', () => {
  let violations = 0;
  let cmps = 0;
  let totalDelta = 0;
  for (let trial = 0; trial < 200; trial++) {
    const m = Math.floor(Math.random() * 101);
    const p = Math.floor(Math.random() * 101);
    let prevScore = -1;
    for (let c = 0; c <= 100; c += 10) {
      const r = buildLocalStrategyResult(baseInput({
        marketing_strength: m, product_readiness: p, competition_intensity: c,
      }));
      if (prevScore !== -1) {
        cmps++;
        if (r.strategy_score > prevScore) violations++;
        totalDelta += r.strategy_score - prevScore;
      }
      prevScore = r.strategy_score;
    }
  }
  assert('no anti-monotonicity violations', violations === 0, `${violations}/${cmps} violations`);
  return { comparisons: cmps, avg_delta_per_step: (totalDelta / cmps).toFixed(3) };
});

// --- Pass 5: Determinism ----------------------------------------------------
pass('5: Determinism — same input → same score & fragmentation_risk', () => {
  let mismatches = 0;
  for (let i = 0; i < 50; i++) {
    const inp = baseInput({
      marketing_strength: 50 + i, product_readiness: 30 + (i * 1.5), competition_intensity: 90 - i,
    });
    const a = buildLocalStrategyResult(inp);
    const b = buildLocalStrategyResult(inp);
    if (a.strategy_score !== b.strategy_score) mismatches++;
    if (a.fragmentation_risk !== b.fragmentation_risk) mismatches++;
    if (a.best_launch_strategy !== b.best_launch_strategy) mismatches++;
  }
  assert('deterministic core fields', mismatches === 0, `${mismatches} mismatches`);
  return { trials: 50 };
});

// --- Pass 6: Edge cases (empty arrays, extremes) ----------------------------
pass('6: Edge cases — empty arrays, 0/100 extremes', () => {
  const cases = [
    { label: 'all empty arrays + zeros', input: { features: [], channels: [], competitors: [], milestones: [], marketing_strength: 0, product_readiness: 0, competition_intensity: 0 } },
    { label: 'all empty arrays + max', input: { features: [], channels: [], competitors: [], milestones: [], marketing_strength: 100, product_readiness: 100, competition_intensity: 100 } },
    { label: 'tons of milestones', input: baseInput({ milestones: Array.from({ length: 50 }, (_, i) => `m${i}`) }) },
  ];
  let okBest = 0;
  for (const c of cases) {
    const r = buildLocalStrategyResult(c.input);
    assert(`${c.label} score finite`, Number.isFinite(r.strategy_score), `got ${r.strategy_score}`);
    assert(`${c.label} score in [10,96]`, r.strategy_score >= 10 && r.strategy_score <= 96, `got ${r.strategy_score}`);
    assert(`${c.label} frag in [18,84]`, r.fragmentation_risk >= 18 && r.fragmentation_risk <= 84, `got ${r.fragmentation_risk}`);
    assert(`${c.label} has best_launch_strategy`, typeof r.best_launch_strategy === 'string' && r.best_launch_strategy.length > 0);
    if (typeof r.best_launch_strategy === 'string') okBest++;
    assert(`${c.label} synthesizes ≥1 competitor when none provided`, c.input.competitors.length > 0 || r.competitors.length >= 1);
    assert(`${c.label} ≤4 recommendations`, r.recommendations.length <= 4, `got ${r.recommendations.length}`);
  }
  return { cases_ok: okBest, cases_total: cases.length };
});

// --- Pass 7: Demo presets — internal consistency ----------------------------
pass('7: Demo presets — referenced ids resolve & output shape OK', () => {
  assert('≥3 presets defined', DEMO_PRESETS.length >= 3, `got ${DEMO_PRESETS.length}`);
  for (const preset of DEMO_PRESETS) {
    assert(`getDemoPreset("${preset.id}") resolves`, !!getDemoPreset(preset.id));
    const out = evaluateDemoPreset(preset.id);
    assert(`${preset.id}: input.features non-empty`, out.input.features.length > 0);
    assert(`${preset.id}: result has recommendations`, out.result.recommendations.length > 0);
    assert(`${preset.id}: result.score_history length 12`, out.result.score_history.length === 12);
    assert(`${preset.id}: evaluated_at is ISO`, !Number.isNaN(Date.parse(out.result.evaluated_at)));
    // sanity: score in 0..100
    assert(`${preset.id}: strategy_score in 0..100`, out.result.strategy_score >= 0 && out.result.strategy_score <= 100);
    // competitors threat scores bounded
    for (const c of out.result.competitors) {
      assert(`${preset.id}: ${c.name} threat_score in 0..100`, c.threat_score >= 0 && c.threat_score <= 100);
    }
  }
  // unknown id falls back to first
  const unknown = evaluateDemoPreset('does-not-exist');
  assert('unknown preset id falls back gracefully', unknown && unknown.input && unknown.result);
  return {
    preset_ids: DEMO_PRESETS.map((p) => p.id).join(','),
  };
});

// --- Pass 8: Recommendation priority distribution --------------------------
pass('8: Recommendation priorities — produced when triggers met', () => {
  // Low product readiness should produce a 'high' priority recommendation
  const r1 = buildLocalStrategyResult(baseInput({ product_readiness: 30, marketing_strength: 30 }));
  const hasHigh = r1.recommendations.some((rec) => rec.priority === 'high');
  assert('low readiness → at least one high-priority rec', hasHigh, `priorities=${r1.recommendations.map((r) => r.priority).join(',')}`);

  // Very strong scenario should still emit at least one (low) rec
  const r2 = buildLocalStrategyResult(baseInput({
    marketing_strength: 95, product_readiness: 95, competition_intensity: 10,
  }));
  assert('strong scenario emits ≥1 recommendation', r2.recommendations.length >= 1);

  // Each recommendation has required fields & valid priority
  let badShape = 0;
  for (const rec of [...r1.recommendations, ...r2.recommendations]) {
    if (!rec.title || !rec.description || !rec.category) badShape++;
    if (!['high', 'medium', 'low'].includes(rec.priority)) badShape++;
  }
  assert('all recommendations well-formed', badShape === 0, `${badShape} malformed`);
  return {
    weak_priorities: r1.recommendations.map((r) => r.priority).join(','),
    strong_priorities: r2.recommendations.map((r) => r.priority).join(','),
  };
});

// --- Pass 9: Competitor ranking (higher index → lower threat) --------------
pass('9: Competitor ranking — first competitor is highest threat', () => {
  const inp = baseInput({ competitors: ['Alpha', 'Beta', 'Gamma', 'Delta'] });
  const r = buildLocalStrategyResult(inp);
  let monotone = true;
  for (let i = 1; i < r.competitors.length; i++) {
    if (r.competitors[i].threat_score > r.competitors[i - 1].threat_score) {
      monotone = false; break;
    }
  }
  assert('threat scores non-increasing in input order', monotone,
    r.competitors.map((c) => `${c.name}=${c.threat_score}`).join(' '));
  // Each competitor has suggested_response
  let missing = 0;
  for (const c of r.competitors) {
    if (!c.suggested_response || typeof c.suggested_response !== 'string') missing++;
  }
  assert('every competitor has suggested_response', missing === 0, `${missing} missing`);
  return { threats: r.competitors.map((c) => c.threat_score).join(',') };
});

// --- Pass 10: Performance — 1000 evaluations should be fast ----------------
pass('10: Performance — 1000 evaluations under 500ms', () => {
  const inputs = Array.from({ length: 1000 }, () => baseInput({
    marketing_strength: Math.floor(Math.random() * 101),
    product_readiness: Math.floor(Math.random() * 101),
    competition_intensity: Math.floor(Math.random() * 101),
  }));
  const t0 = Date.now();
  let acc = 0;
  for (const inp of inputs) acc += buildLocalStrategyResult(inp).strategy_score;
  const dt = Date.now() - t0;
  assert('1000 evaluations < 500ms', dt < 500, `took ${dt}ms`);
  return { ms_for_1000: dt, mean_score: (acc / 1000).toFixed(2) };
});

// --- Summary ---------------------------------------------------------------
console.log('\n=== Cross-eval Summary ===');
let passes = 0, fails = 0;
for (const r of results) {
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'}  Pass ${r.name}  (${r.asserts - r.fails}/${r.asserts} ok, ${r.ms}ms)`);
  if (r.status === 'PASS') passes++; else fails++;
}
console.log(`\nTOTALS: ${passes}/${results.length} passes, ${totalAsserts - totalFails}/${totalAsserts} assertions, ${totalFails} failures`);

const reportPath = path.join(__dirname, 'last-run.json');
fs.writeFileSync(reportPath, JSON.stringify({ when: new Date().toISOString(), totals: { passes, fails, asserts: totalAsserts, failed_asserts: totalFails }, results }, null, 2));
console.log(`Wrote ${reportPath}`);

process.exit(totalFails === 0 ? 0 : 1);
