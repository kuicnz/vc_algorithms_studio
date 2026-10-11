import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { greedyAlgorithms } from '../js/algorithms/greedy.js';

const byId = id => greedyAlgorithms.find(algorithm => algorithm.id === id);
const languages = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'swift'];
const plain = value => JSON.parse(JSON.stringify(value));

function displayedFunction(algorithm) {
  const source = algorithm.codes.javascript.source;
  const name = source.match(/function\s+(\w+)\s*\(/)?.[1];
  assert.ok(name);
  return vm.runInNewContext(`${source}\n${name}`, {}, { timeout: 1000 });
}

function checkTrace(algorithm, input) {
  const before = structuredClone(input);
  const trace = algorithm.build(input);
  assert.deepEqual(input, before, 'Input must remain unchanged');
  assert.ok(trace.steps.length >= 3);
  assert.equal(trace.steps[0].tag, 'sort');
  assert.equal(trace.steps.at(-1).tag, 'result');
  for (const step of trace.steps) {
    assert.ok(step.description);
    assert.ok(step.descriptionEn);
    assert.equal(step.state.type, 'table');
    assert.equal(step.state.matrix.length, step.state.rowLabels.length);
    assert.equal(step.state.rowLabelsEn.length, step.state.rowLabels.length);
    assert.equal(step.state.columnLabelsEn.length, step.state.columnLabels.length);
    for (const row of step.state.matrix) assert.equal(row.length, step.state.columnLabels.length);
    for (const [row, col] of [...step.state.active, ...step.state.secondary, ...step.state.path]) {
      assert.ok(step.state.matrix[row]?.[col] !== undefined, `${algorithm.id}: cell ${row},${col} is missing`);
    }
    for (const language of languages) {
      const code = algorithm.codes[language];
      assert.ok(code?.source.length);
      assert.ok(!code.source.includes('§'));
      const lines = code.source.split('\n');
      assert.ok(code.tags[step.tag]?.length, `${algorithm.id}/${language}: unmapped ${step.tag}`);
      for (const line of code.tags[step.tag]) {
        assert.ok(Number.isInteger(line) && line > 0 && line <= lines.length);
        assert.ok(lines[line - 1].trim());
      }
    }
  }
  // Mutating a later snapshot cannot affect earlier snapshots or a new run.
  const saved = structuredClone(trace.steps[0]);
  const last = trace.steps.at(-1).state;
  if (last.matrix.length) last.matrix[0][0] = 'changed';
  if (last.matrixEn.length) last.matrixEn[0][0] = 'changed';
  if (last.rowLabels.length) last.rowLabels[0] = 'changed';
  if (last.columnLabels.length) last.columnLabels[0] = 'changed';
  last.metrics.selected = 999;
  if (last.path.length) last.path[0][0] = 999;
  assert.deepEqual(trace.steps[0], saved);
  algorithm.build(structuredClone(algorithm.defaults));
  assert.deepEqual(trace.steps[0], saved);
  return trace;
}

let seed = 30817;
const random = max => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % max; };

function maximumActivities(starts, ends) {
  let best = 0;
  for (let mask = 0; mask < 2 ** starts.length; mask++) {
    const subset = starts.map((_, i) => i).filter(i => mask & (1 << i)).sort((a, b) => starts[a] - starts[b]);
    if (subset.every((i, p) => p === 0 || starts[i] >= ends[subset[p - 1]])) best = Math.max(best, subset.length);
  }
  return best;
}

// A fractional-knapsack optimum is a vertex: every item is whole or absent,
// except possibly one fractional item. Enumerate those vertices independently.
function referenceFractional(weights, values, capacity) {
  let best = 0;
  for (let mask = 0; mask < 2 ** weights.length; mask++) {
    let used = 0, value = 0;
    for (let i = 0; i < weights.length; i++) if (mask & (1 << i)) { used += weights[i]; value += values[i]; }
    if (used > capacity) continue;
    best = Math.max(best, value);
    for (let i = 0; i < weights.length; i++) if (!(mask & (1 << i))) {
      best = Math.max(best, value + Math.min(1, (capacity - used) / weights[i]) * values[i]);
    }
  }
  return best;
}

function minimumCoins(coins, amount) {
  const distances = Array(amount + 1).fill(Infinity);
  distances[0] = 0;
  for (let target = 1; target <= amount; target++) {
    for (const coin of coins) if (coin <= target) distances[target] = Math.min(distances[target], distances[target - coin] + 1);
  }
  return distances[amount];
}

test('greedy catalog exposes three distinct bilingual algorithms and ten languages', () => {
  assert.deepEqual(greedyAlgorithms.map(algorithm => algorithm.id), ['activity-selection', 'fractional-knapsack', 'greedy-change']);
  for (const algorithm of greedyAlgorithms) {
    assert.equal(algorithm.category, 'greedy');
    assert.ok(algorithm.nameEn && algorithm.summaryEn);
    assert.deepEqual(Object.keys(algorithm.codes), languages);
    checkTrace(algorithm, structuredClone(algorithm.defaults));
  }
});

test('activity selection maximizes cardinality against exhaustive subsets', () => {
  const algorithm = byId('activity-selection');
  const run = displayedFunction(algorithm);
  const samples = [algorithm.defaults, { starts: [], ends: [] }, { starts: [0], ends: [24] }, { starts: [0, 1, 2], ends: [1, 2, 3] }, { starts: [0, 0, 0], ends: [2, 2, 2] }];
  for (let trial = 0; trial < 75; trial++) {
    const starts = Array.from({ length: random(8) + 1 }, () => random(23));
    const ends = starts.map(start => start + random(24 - start) + 1);
    samples.push({ starts, ends });
  }
  for (const input of samples) {
    const { result } = checkTrace(algorithm, structuredClone(input));
    assert.equal(result.count, maximumActivities(input.starts, input.ends));
    assert.equal(result.selected.length, result.count);
    assert.equal(new Set(result.selected).size, result.count);
    for (let i = 1; i < result.selected.length; i++) assert.ok(input.starts[result.selected[i]] >= input.ends[result.selected[i - 1]]);
    assert.deepEqual(plain(run(input.starts, input.ends)), result);
  }
  assert.deepEqual(algorithm.build(algorithm.defaults).result, { selected: [0, 1, 3, 4], count: 4 });
});

test('fractional knapsack matches independent vertex enumeration and capacity boundaries', () => {
  const algorithm = byId('fractional-knapsack');
  const run = displayedFunction(algorithm);
  const samples = [algorithm.defaults, { weights: [10, 20, 30], values: [60, 100, 120], capacity: 0 }, { weights: [1, 1], values: [1, 1], capacity: 100 }, { weights: [], values: [], capacity: 10 }, { weights: [50], values: [200], capacity: 1 }];
  for (let trial = 0; trial < 65; trial++) {
    const weights = Array.from({ length: random(6) + 1 }, () => random(50) + 1);
    const values = weights.map(() => random(200) + 1);
    samples.push({ weights, values, capacity: random(101) });
  }
  for (const input of samples) {
    const { result } = checkTrace(algorithm, structuredClone(input));
    assert.ok(Math.abs(result.value - referenceFractional(input.weights, input.values, input.capacity)) < 1e-8);
    assert.equal(result.fractions.length, input.weights.length);
    assert.ok(result.fractions.every(fraction => fraction >= 0 && fraction <= 1));
    assert.ok(result.fractions.reduce((sum, fraction, i) => sum + fraction * input.weights[i], 0) <= input.capacity + 1e-8);
    assert.deepEqual(plain(run(input.weights, input.values, input.capacity)), result);
  }
  assert.deepEqual(algorithm.build(algorithm.defaults).result, { value: 240, fractions: [1, 1, 2 / 3] });
});

test('greedy coin change exposes nonoptimal and failed reachable choices honestly', () => {
  const algorithm = byId('greedy-change');
  const run = displayedFunction(algorithm);
  const counterexample = algorithm.build({ coins: [1, 3, 4], amount: 6 });
  assert.deepEqual(counterexample.result, { count: 3, remaining: 0, selected: [{ coin: 4, count: 1 }, { coin: 1, count: 2 }] });
  assert.equal(minimumCoins([1, 3, 4], 6), 2);
  assert.match(counterexample.steps.at(-1).descriptionEn, /does not guarantee/);
  const reachableFailure = algorithm.build({ coins: [3, 4], amount: 6 });
  assert.equal(reachableFailure.result.remaining, 2);
  assert.equal(minimumCoins([3, 4], 6), 2);
  assert.match(reachableFailure.steps.at(-1).descriptionEn, /does not prove/);
  const samples = [algorithm.defaults, { coins: [1, 3, 4], amount: 6 }, { coins: [3, 4], amount: 6 }, { coins: [2], amount: 3 }, { coins: [2, 5], amount: 0 }, { coins: [], amount: 4 }, { coins: [1], amount: 100 }, { coins: [50], amount: 100 }];
  for (let trial = 0; trial < 65; trial++) samples.push({ coins: [...new Set(Array.from({ length: random(6) + 1 }, () => random(50) + 1))], amount: random(101) });
  for (const input of samples) {
    const { result } = checkTrace(algorithm, structuredClone(input));
    assert.equal(result.selected.reduce((sum, part) => sum + part.count, 0), result.count);
    assert.equal(result.selected.reduce((sum, part) => sum + part.coin * part.count, 0) + result.remaining, input.amount);
    assert.ok(result.remaining >= 0);
    assert.ok(result.selected.every(part => input.coins.includes(part.coin) && part.count > 0));
    assert.deepEqual(plain(run(input.coins, input.amount)), result);
  }
  assert.deepEqual(algorithm.build(algorithm.defaults).result, { count: 6, remaining: 0, selected: [{ coin: 25, count: 2 }, { coin: 10, count: 1 }, { coin: 1, count: 3 }] });
});

test('English table snapshots translate statuses, labels, caveats, and final descriptions', () => {
  for (const algorithm of greedyAlgorithms) {
    const { steps } = algorithm.build(algorithm.defaults);
    for (const step of steps) {
      assert.ok(!/[\u3400-\u9fff]/.test(step.descriptionEn));
      assert.ok(!/[\u3400-\u9fff]/.test(step.state.noteEn));
      assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(step.state.rowLabelsEn)));
      assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(step.state.columnLabelsEn)));
      assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(step.state.matrixEn)));
    }
  }
  const final = byId('activity-selection').build(byId('activity-selection').defaults).steps.at(-1).state;
  assert.ok(final.matrixEn.some(row => row[2] === 'selected'));
  assert.ok(final.matrixEn.some(row => row[2] === 'skipped'));
  assert.ok(final.matrix.every(row => row[2] !== '待检查'));
});
