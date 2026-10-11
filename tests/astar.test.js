import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { astarAlgorithms } from '../js/algorithms/astar.js';

const algorithm = astarAlgorithms[0];
const graph = algorithm.graph;
const ids = graph.nodes.map(node => node.id);
const tags = ['init', 'select', 'found', 'path', 'done', 'inspect', 'skipClosed', 'relax', 'keep', 'close', 'noPath'];
const runSource = vm.runInNewContext(`${algorithm.codes.javascript.source}\nastar`);
const plain = value => JSON.parse(JSON.stringify(value));

function argumentsFor(customGraph, start, goal) {
  const nodes = customGraph.nodes;
  const index = id => nodes.findIndex(node => node.id === id);
  const adj = nodes.map(() => []);
  for (const edge of customGraph.edges) {
    adj[index(edge.from)].push([index(edge.to), edge.weight]);
    if (!customGraph.directed) adj[index(edge.to)].push([index(edge.from), edge.weight]);
  }
  for (const edges of adj) edges.sort((a, b) => a[0] - b[0]);
  const target = nodes[index(goal)];
  const h = nodes.map(node => Math.abs(node.column - target.column) + Math.abs(node.row - target.row));
  return [adj, h, index(start), index(goal)];
}

// Independent Dijkstra reference does not use A*'s heuristic or open set.
function shortestCost(customGraph, start, goal) {
  const distances = Object.fromEntries(customGraph.nodes.map(node => [node.id, Infinity]));
  const settled = new Set();
  distances[start] = 0;
  for (let iteration = 0; iteration < customGraph.nodes.length; iteration++) {
    const candidates = Object.keys(distances).filter(id => !settled.has(id));
    candidates.sort((a, b) => distances[a] - distances[b]);
    const current = candidates[0];
    if (distances[current] === Infinity) break;
    settled.add(current);
    for (const edge of customGraph.edges) {
      const neighbor = edge.from === current ? edge.to : !customGraph.directed && edge.to === current ? edge.from : null;
      if (neighbor !== null) distances[neighbor] = Math.min(distances[neighbor], distances[current] + edge.weight);
    }
  }
  return distances[goal];
}

function validatePath(result, customGraph, start, goal) {
  if (!Number.isFinite(result.cost)) {
    assert.deepEqual(result.path, []);
    return;
  }
  assert.equal(result.path[0], start);
  assert.equal(result.path.at(-1), goal);
  assert.equal(new Set(result.path).size, result.path.length);
  let cost = 0;
  for (let index = 1; index < result.path.length; index++) {
    const from = result.path[index - 1], to = result.path[index];
    const edge = customGraph.edges.find(edge => edge.from === from && edge.to === to || !customGraph.directed && edge.to === from && edge.from === to);
    assert.ok(edge, `Path contains absent edge ${from} → ${to}`);
    cost += edge.weight;
  }
  assert.equal(cost, result.cost);
}

test('A*: all 64 source/goal pairs match Dijkstra and displayed JavaScript', () => {
  for (const start of ids) for (const goal of ids) {
    const input = { start, goal };
    const before = structuredClone(input);
    const trace = algorithm.build(input);
    assert.deepEqual(input, before);
    assert.equal(trace.result.cost, shortestCost(graph, start, goal));
    validatePath(trace.result, graph, start, goal);
    const displayed = runSource(...argumentsFor(graph, start, goal));
    assert.equal(displayed.cost, trace.result.cost);
    assert.deepEqual(plain(displayed.path).map(index => ids[index]), trace.result.path);
    assert.equal(trace.steps.at(-1).tag, 'done');
    assert.equal(trace.steps.at(-1).state.metrics.pathCost, trace.result.cost);
  }
});

test('A*: consistent Manhattan heuristic and center obstacle', () => {
  assert.ok(!ids.includes('E'));
  for (const goal of ids) {
    const [, h] = argumentsFor(graph, 'A', goal);
    assert.equal(h[ids.indexOf(goal)], 0);
    for (const edge of graph.edges) {
      const from = ids.indexOf(edge.from), to = ids.indexOf(edge.to);
      assert.ok(h[from] <= edge.weight + h[to]);
      assert.ok(h[to] <= edge.weight + h[from]);
    }
    for (const start of ids) assert.ok(h[ids.indexOf(start)] <= shortestCost(graph, start, goal));
  }
});

test('A*: start equals goal and unreachable goal have separate terminal branches', () => {
  const same = algorithm.build({ start: 'F', goal: 'F' });
  assert.deepEqual(same.result, { path: ['F'], cost: 0 });
  assert.deepEqual(same.steps.map(step => step.tag), ['init', 'select', 'found', 'path', 'done']);
  const isolated = { ...structuredClone(graph), edges: [] };
  const missing = algorithm.build({ start: 'A', goal: 'I', graph: isolated });
  assert.deepEqual(missing.result, { path: [], cost: Infinity });
  assert.equal(missing.steps.at(-1).tag, 'noPath');
  assert.equal(missing.result.cost, shortestCost(isolated, 'A', 'I'));
  const displayed = runSource(...argumentsFor(isolated, 'A', 'I'));
  assert.equal(displayed.cost, Infinity);
  assert.deepEqual(plain(displayed.path), []);
});

test('A*: removing grid edges still produces optimal detours or reports no path', () => {
  for (let mask = 0; mask < 256; mask += 7) {
    const customGraph = { ...structuredClone(graph), edges: graph.edges.filter((_, index) => (mask >> index) & 1) };
    for (const [start, goal] of [['A', 'I'], ['D', 'C'], ['G', 'B']]) {
      const trace = algorithm.build({ start, goal, graph: customGraph });
      assert.equal(trace.result.cost, shortestCost(customGraph, start, goal));
      validatePath(trace.result, customGraph, start, goal);
      const displayed = runSource(...argumentsFor(customGraph, start, goal));
      assert.equal(displayed.cost, trace.result.cost);
      assert.deepEqual(plain(displayed.path).map(index => ids[index]), trace.result.path);
    }
  }
});

test('A*: all branch tags map to nonempty real lines in all 10 languages', () => {
  assert.equal(Object.keys(algorithm.codes).length, 10);
  const seen = new Set();
  const traces = [algorithm.build(algorithm.defaults), algorithm.build({ start: 'A', goal: 'I', graph: { ...graph, edges: [] } })];
  for (const trace of traces) for (const step of trace.steps) {
    seen.add(step.tag);
    assert.ok(step.description && step.descriptionEn);
    assert.equal(step.state.type, 'graph');
    for (const node of [...step.state.active, ...step.state.visited, ...step.state.frontier]) assert.ok(ids.includes(node));
    for (const [language, code] of Object.entries(algorithm.codes)) {
      const lines = code.source.split('\n');
      assert.ok(code.tags[step.tag]?.length, `${language}: no mapping for ${step.tag}`);
      for (const line of code.tags[step.tag]) {
        assert.ok(Number.isInteger(line) && line > 0 && line <= lines.length);
        assert.ok(lines[line - 1].trim());
      }
    }
  }
  assert.deepEqual([...seen].sort(), [...tags].sort());
  for (const code of Object.values(algorithm.codes)) {
    assert.ok(!code.source.includes('@'));
    for (const [left, right] of [['relax', 'keep'], ['done', 'noPath'], ['close', 'found']]) {
      assert.ok(code.tags[left].every(line => !code.tags[right].includes(line)));
    }
  }
});

test('A*: trace snapshots, input graph, and reconstructed result are isolated', () => {
  const input = { ...algorithm.defaults, graph: structuredClone(graph) };
  const before = structuredClone(input);
  const trace = algorithm.build(input);
  assert.deepEqual(input, before);
  const original = structuredClone(trace);
  algorithm.build({ start: 'I', goal: 'A' });
  assert.deepEqual(trace, original);
  trace.steps[0].state.nodes[0].id = 'changed';
  trace.steps[0].state.table.rows[0][1] = 999;
  assert.deepEqual(trace.steps[1], original.steps[1]);
  assert.equal(graph.nodes[0].id, 'A');
  assert.equal(input.graph.nodes[0].id, 'A');
  trace.result.path[0] = 'changed';
  assert.equal(trace.steps.at(-1).state.active[0], 'A');
});
