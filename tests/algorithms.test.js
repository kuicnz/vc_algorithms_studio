import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { algorithms, languages, categories, filterAlgorithms } from '../js/catalog.js';
import { parseInput } from '../js/inputs.js';
import { escapeHTML, highlightSource, renderArray, renderGraph, renderTable } from '../js/renderers.js';

const byId = id => algorithms.find(algorithm => algorithm.id === id);
const plain = value => JSON.parse(JSON.stringify(value));
let seed = 739;
const random = maximum => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % maximum; };

function validateTrace(algorithm, input) {
  const before = structuredClone(input);
  const trace = algorithm.build(input);
  assert.deepEqual(input, before, `${algorithm.id}: input was mutated`);
  assert.ok(trace.steps.length >= 2, `${algorithm.id}: missing initial/final steps`);
  const oldSnapshot = structuredClone(trace.steps[0]);
  for (const step of trace.steps) {
    assert.ok(step.description.length > 0);
    assert.equal(step.state.type, { array: 'array', graph: 'graph', table: 'table' }[algorithm.kind]);
    for (const language of languages) {
      const code = algorithm.codes[language.id];
      assert.ok(code?.source.length > 0, `${algorithm.id}: missing ${language.id}`);
      const lines = code.source.split('\n');
      const mapping = code.tags[step.tag];
      assert.ok(mapping?.length, `${algorithm.id}/${language.id}: missing ${step.tag}`);
      for (const line of mapping) {
        assert.ok(Number.isInteger(line) && line > 0 && line <= lines.length, `${algorithm.id}/${language.id}/${step.tag}: invalid line ${line}`);
        assert.ok(lines[line - 1].trim().length, 'Highlight must reference nonempty code');
      }
    }
    if (step.state.type === 'array') {
      for (const index of [...(step.state.active ?? []), ...(step.state.secondary ?? []), ...(step.state.sorted ?? [])]) {
        assert.ok(index >= 0 && index < step.state.values.length, `${algorithm.id}: invalid array index ${index}`);
      }
    } else if (step.state.type === 'table') {
      assert.equal(step.state.matrix.length, step.state.rowLabels.length);
      for (const row of step.state.matrix) assert.equal(row.length, step.state.columnLabels.length);
      for (const [row, column] of [...(step.state.active ?? []), ...(step.state.secondary ?? [])]) assert.ok(step.state.matrix[row]?.[column] !== undefined);
    } else {
      const nodes = new Set(step.state.nodes.map(node => node.id));
      for (const node of [...step.state.active, ...step.state.visited, ...step.state.frontier]) assert.ok(nodes.has(node));
    }
  }
  // Building a second trace must not change already-produced snapshots.
  algorithm.build(structuredClone(algorithm.defaults));
  assert.deepEqual(trace.steps[0], oldSnapshot);
  assert.notEqual(trace.steps[0].state, trace.steps[1].state);
  return trace;
}

function displayedFunction(algorithm) {
  const source = algorithm.codes.javascript.source;
  const name = source.match(/function\s+(\w+)\s*\(/)?.[1];
  assert.ok(name, `No displayed JS function for ${algorithm.id}`);
  return vm.runInNewContext(`${source}\n${name}`, {}, { timeout: 1000 });
}

test('catalog contains 24 unique algorithms, 4 categories, and 10 languages', () => {
  assert.equal(algorithms.length, 24);
  assert.equal(new Set(algorithms.map(algorithm => algorithm.id)).size, 24);
  assert.equal(languages.length, 10);
  for (const category of categories.slice(1)) assert.ok(algorithms.some(algorithm => algorithm.category === category.id));
  assert.equal(filterAlgorithms('sorting', '').length, 8);
  assert.deepEqual(filterAlgorithms('all', 'BINARY').map(algorithm => algorithm.id), ['binary']);
  assert.equal(filterAlgorithms('all', '图算法').length, 6);
  assert.equal(filterAlgorithms('all', 'nothing matches').length, 0);
});

for (const algorithm of algorithms) {
  test(`${algorithm.id}: default trace, snapshots, and all 10 language mappings`, () => validateTrace(algorithm, structuredClone(algorithm.defaults)));
}

for (const algorithm of algorithms.filter(item => item.category === 'sorting')) {
  test(`${algorithm.id}: boundary and randomized sorting, displayed JavaScript agrees`, () => {
    const samples = [[], [0], [2, 2, 2], [1, 2, 3, 4], [9, 7, 5, 3, 1], [0, 99, 0, 1]];
    if (algorithm.id !== 'counting') samples.push([-9, 0, 4, -1, 4, -9]);
    for (let i = 0; i < 25; i++) samples.push(Array.from({ length: random(18) + 1 }, () => random(100) - (algorithm.id === 'counting' ? 0 : 50)));
    const runCode = displayedFunction(algorithm);
    for (const values of samples) {
      const trace = validateTrace(algorithm, { values: [...values] });
      const expected = [...values].sort((a, b) => a - b);
      assert.deepEqual(trace.result, expected);
      assert.deepEqual(trace.steps.at(-1).state.values, expected);
      const argument = [...values];
      const result = runCode(argument);
      assert.deepEqual(plain(result ?? argument), expected, `${algorithm.id}: displayed code diverges`);
    }
  });
}

for (const algorithm of algorithms.filter(item => item.category === 'searching')) {
  test(`${algorithm.id}: absent, duplicate, uniform, negative, and randomized targets`, () => {
    const runCode = displayedFunction(algorithm);
    const samples = [[], [4], [4, 4, 4], [-8, 5, 2, 0, -8], [1, 2, 3, 4, 5]];
    for (let i = 0; i < 20; i++) samples.push(Array.from({ length: random(18) + 1 }, () => random(30) - 15));
    for (const values of samples) {
      for (const target of [-999, 999, 0, ...values]) {
        const trace = validateTrace(algorithm, { values: [...values], target });
        const displayed = trace.steps[0].state.values;
        if (values.includes(target)) {
          assert.ok(trace.result >= 0);
          assert.equal(displayed[trace.result], target);
        } else assert.equal(trace.result, -1);
        assert.equal(runCode([...values], target), trace.result);
      }
    }
  });
}

test('dynamic programming results match independent references and boundaries', () => {
  const fib = n => n < 2 ? n : fib(n - 1) + fib(n - 2);
  for (const n of [0, 1, 2, 8, 12]) {
    const algorithm = byId('fibonacci');
    assert.equal(validateTrace(algorithm, { n }).result, fib(n));
    assert.equal(displayedFunction(algorithm)(n), fib(n));
  }
  for (let trial = 0; trial < 20; trial++) {
    const weights = Array.from({ length: 4 }, () => random(5) + 1);
    const values = Array.from({ length: 4 }, () => random(10));
    const capacity = random(12);
    let expected = 0;
    for (let mask = 0; mask < 16; mask++) {
      let weight = 0, value = 0;
      for (let i = 0; i < 4; i++) if (mask & (1 << i)) { weight += weights[i]; value += values[i]; }
      if (weight <= capacity) expected = Math.max(expected, value);
    }
    const algorithm = byId('knapsack');
    assert.equal(validateTrace(algorithm, { weights, values, capacity }).result, expected);
    assert.equal(displayedFunction(algorithm)(weights, values, capacity), expected);
  }
  for (const [textA, textB, lcs, edit] of [['', '', 0, 0], ['', 'ABC', 0, 3], ['ABC', 'ABC', 3, 0], ['ABC', 'XYZ', 0, 3], ['ABC', 'AC', 2, 1], ['KITTEN', 'SITTING', 4, 3]]) {
    for (const [id, expected] of [['lcs', lcs], ['edit-distance', edit]]) {
      const algorithm = byId(id);
      assert.equal(validateTrace(algorithm, { textA, textB }).result, expected);
      assert.equal(displayedFunction(algorithm)(textA, textB), expected);
    }
  }
  for (const [coins, amount, expected] of [[[1, 3, 4], 6, 2], [[2], 3, -1], [[2, 5], 0, 0], [[2, 5], 9, 3], [[1], 20, 20]]) {
    const algorithm = byId('coin-change');
    assert.equal(validateTrace(algorithm, { coins, amount }).result, expected);
    assert.equal(displayedFunction(algorithm)(coins, amount), expected);
  }
});

test('graph traversals, shortest paths, topological order, and spanning trees', () => {
  for (const algorithm of algorithms.filter(item => item.category === 'graphs')) {
    const ids = algorithm.graph.nodes.map(node => node.id);
    const adjacent = Object.fromEntries(ids.map(id => [id, []]));
    const weighted = Object.fromEntries(ids.map(id => [id, []]));
    for (const edge of algorithm.graph.edges) {
      adjacent[edge.from].push(edge.to);
      weighted[edge.from].push({ to: edge.to, weight: edge.weight });
      if (!algorithm.graph.directed) { adjacent[edge.to].push(edge.from); weighted[edge.to].push({ to: edge.from, weight: edge.weight }); }
    }
    Object.values(adjacent).forEach(neighbors => neighbors.sort());
    Object.values(weighted).forEach(neighbors => neighbors.sort((a, b) => a.to.localeCompare(b.to)));
    const runCode = displayedFunction(algorithm);
    for (const start of ids) {
      const trace = validateTrace(algorithm, { start });
      if (['bfs', 'dfs'].includes(algorithm.id)) {
        assert.equal(new Set(trace.result).size, ids.length);
        assert.equal(trace.result[0], start);
        assert.deepEqual(plain(runCode(adjacent, start)), trace.result);
      } else if (algorithm.id === 'topological') {
        assert.equal(new Set(trace.result).size, ids.length);
        for (const edge of algorithm.graph.edges) assert.ok(trace.result.indexOf(edge.from) < trace.result.indexOf(edge.to));
        assert.deepEqual(plain(runCode(adjacent)), trace.result);
      } else if (algorithm.id === 'dijkstra') {
        // Bellman–Ford is an independent reference for the scan-based Dijkstra.
        const distances = Object.fromEntries(ids.map(id => [id, Infinity]));
        distances[start] = 0;
        for (let i = 1; i < ids.length; i++) for (const edge of algorithm.graph.edges) {
          distances[edge.to] = Math.min(distances[edge.to], distances[edge.from] + edge.weight);
          distances[edge.from] = Math.min(distances[edge.from], distances[edge.to] + edge.weight);
        }
        assert.deepEqual(trace.result.distances, distances);
        assert.deepEqual(plain(runCode(weighted, start)), distances);
      } else {
        assert.equal(trace.result.totalWeight, 13);
        assert.equal(trace.result.edges.length, ids.length - 1);
        const codeResult = runCode(ids, algorithm.graph.edges, start);
        assert.equal(codeResult.totalWeight, 13);
        assert.equal(codeResult.edges.length, ids.length - 1);
      }
    }
  }
});

test('input validation preserves explicit limits and rejects malformed inputs', () => {
  assert.deepEqual(parseInput(byId('bubble'), { values: '8， -1  0, 9' }), { values: [8, -1, 0, 9] });
  assert.throws(() => parseInput(byId('counting'), { values: '-1,2' }));
  assert.throws(() => parseInput(byId('bubble'), { values: '1.2, 3' }));
  assert.throws(() => parseInput(byId('bubble'), { values: Array(19).fill(1).join(',') }));
  assert.throws(() => parseInput(byId('fibonacci'), { n: '' }));
  assert.throws(() => parseInput(byId('fibonacci'), { n: '21' }));
  assert.throws(() => parseInput(byId('knapsack'), { weights: '1,2', values: '3', capacity: '4' }));
  assert.deepEqual(parseInput(byId('lcs'), { textA: '', textB: '' }), { textA: '', textB: '' });
  assert.throws(() => parseInput(byId('lcs'), { textA: '中文', textB: 'ABC' }));
  assert.deepEqual(parseInput(byId('coin-change'), { coins: '1,1,3', amount: '0' }), { coins: [1, 3], amount: 0 });
});

test('renderers escape text and retain source code, zero values, and negative bars', () => {
  assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
  const highlighted = highlightSource('const value = "<img src=x onerror=alert(1)>";');
  assert.ok(!highlighted.includes('<img'));
  assert.ok(highlighted.includes('&lt;img'));
  assert.ok(renderArray({ values: [-4, 0, 5], active: [0], sorted: [], secondary: [] }).includes('negative'));
  assert.ok(renderTable({ matrix: [[0, '∞']], rowLabels: ['<b>'], columnLabels: ['0', '1'], active: [] }).includes('&lt;b&gt;'));
  assert.ok(renderGraph(byId('bfs').build({ start: 'A' }).steps[0].state).includes('<svg'));
});
