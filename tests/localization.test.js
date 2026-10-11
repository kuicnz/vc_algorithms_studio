import test from 'node:test';
import assert from 'node:assert/strict';
import { algorithms } from '../js/catalog.js';
import { algorithmName, algorithmSummary, complexityText, localizeState, stepDescription } from '../js/trace-i18n.js';

const cjk = /[\u3400-\u9fff]/;
const byId = id => algorithms.find(algorithm => algorithm.id === id);

function assertEnglishTrace(algorithm, input) {
  const trace = algorithm.build(input);
  for (const step of trace.steps) {
    const before = structuredClone(step);
    const english = stepDescription(algorithm, step, 'en', input);
    assert.ok(english.length > 15, `${algorithm.id}/${step.tag}: missing narration`);
    assert.ok(!cjk.test(english), `${algorithm.id}/${step.tag}: ${english}`);
    assert.ok(!/undefined|NaN|Review the recorded/.test(english), `${algorithm.id}/${step.tag}: ${english}`);
    assert.equal(stepDescription(algorithm, step, 'zh', input), step.description);
    assert.equal(localizeState(algorithm, step.state, 'zh'), step.state);
    const localized = localizeState(algorithm, step.state, 'en');
    assert.notEqual(localized, step.state);
    const labels = [localized.rowLabels, localized.columnLabels, localized.matrix, localized.note,
      localized.aux?.map(item => [item.label, item.values]), localized.table?.columns,
      localized.table?.rows].filter(value => value !== undefined);
    assert.ok(!cjk.test(JSON.stringify(labels)), `${algorithm.id}/${step.tag}: untranslated labels ${JSON.stringify(labels)}`);
    assert.deepEqual(step, before, `${algorithm.id}/${step.tag}: localization mutated the recorded step`);
    assert.deepEqual(localized.values, step.state.values);
    assert.deepEqual(localized.matrix, step.state.matrixEn ?? step.state.matrix);
    assert.deepEqual(localized.nodes, step.state.nodes);
    assert.deepEqual(localized.edges, step.state.edges);
  }
  return trace;
}

for (const algorithm of algorithms) {
  test(`${algorithm.id}: English metadata and every default trace operation`, () => {
    assert.equal(algorithmName(algorithm, 'zh'), algorithm.name);
    assert.equal(algorithmName(algorithm, 'en'), algorithm.nameEn);
    assert.equal(algorithmSummary(algorithm, 'zh'), algorithm.summary);
    assert.ok(!cjk.test(algorithmSummary(algorithm, 'en')));
    assert.ok(algorithmSummary(algorithm, 'en').length > 20);
    for (const complexity of Object.values(algorithm.complexity)) {
      assert.equal(complexityText(complexity, 'zh'), complexity);
      assert.ok(!cjk.test(complexityText(complexity, 'en')));
    }
    assertEnglishTrace(algorithm, structuredClone(algorithm.defaults));
  });
}

test('English narration covers search boundary and alternative execution sites', () => {
  for (const id of ['linear', 'binary', 'jump', 'interpolation', 'exponential']) {
    const algorithm = byId(id);
    for (const values of [[], [4], [4, 4, 4], [-10, -3, 0, 2, 9], [3, 8, 12, 20, 40]]) {
      for (const target of [-99, 99, 4, 2, 12, ...values]) {
        assertEnglishTrace(algorithm, { values, target });
      }
    }
  }
});

test('English narration covers small and negative sorting inputs and dynamic boundaries', () => {
  for (const algorithm of algorithms.filter(item => item.category === 'sorting')) {
    for (const values of [[], [0], [4, 4, 4], [9, 4, 2, 0], [2, 8, 1, 5, 3]]) {
      assertEnglishTrace(algorithm, { values });
    }
    if (algorithm.id !== 'counting') assertEnglishTrace(algorithm, { values: [-7, 2, -3, 0] });
  }
  for (const n of [0, 1, 2]) assertEnglishTrace(byId('fibonacci'), { n });
  assertEnglishTrace(byId('knapsack'), { weights: [], values: [], capacity: 0 });
  for (const id of ['lcs', 'edit-distance']) {
    for (const [textA, textB] of [['', ''], ['', 'ABC'], ['ABC', 'ABC'], ['ABC', 'XYZ']]) {
      assertEnglishTrace(byId(id), { textA, textB });
    }
  }
  for (const [coins, amount] of [[[2], 3], [[1], 0], [[], 5]]) {
    assertEnglishTrace(byId('coin-change'), { coins, amount });
  }
});

test('English graph narration uses the selected start vertex and every reachable branch', () => {
  for (const id of ['bfs', 'dfs', 'dijkstra', 'topological', 'kruskal', 'prim']) {
    const algorithm = byId(id);
    for (const node of algorithm.graph.nodes) assertEnglishTrace(algorithm, { start: node.id });
  }
  const algorithm = byId('dijkstra');
  const step = algorithm.build({ start: 'F' }).steps[0];
  assert.match(stepDescription(algorithm, step, 'en', { start: 'F' }), /start F/);
});

test('narration preserves operation details and state labels use explicit English variants', () => {
  const bubble = byId('bubble');
  const comparison = bubble.build({ values: [7, -2] }).steps.find(step => step.tag === 'compare');
  assert.match(stepDescription(bubble, comparison, 'en'), /7 and -2.*0 and 1/);
  const state = {
    type: 'table', matrix: [[0, '选择']], rowLabels: ['无物品'], rowLabelsEn: ['No items'],
    columnLabels: ['物品'], columnLabelsEn: ['Item'], note: '中文说明', noteEn: 'English explanation',
    aux: [{ label: '中文标签', labelEn: 'English label', values: [1, '已选择'] }],
    table: { columns: ['中文列'], columnsEn: ['English column'], rows: [['已选择', 4]] },
  };
  const before = structuredClone(state);
  const translated = localizeState(bubble, state, 'en');
  assert.deepEqual(translated.rowLabels, ['No items']);
  assert.deepEqual(translated.columnLabels, ['Item']);
  assert.equal(translated.note, 'English explanation');
  assert.deepEqual(translated.aux, [{ label: 'English label', labelEn: 'English label', values: [1, 'Selected'] }]);
  assert.deepEqual(translated.table.columns, ['English column']);
  assert.deepEqual(translated.table.rows, [['Selected', 4]]);
  assert.deepEqual(translated.matrix, [[0, 'Select']]);
  assert.deepEqual(state, before);
  assert.equal(stepDescription(bubble, { description: '原始中文', descriptionEn: 'Recorded English narration' }, 'en'), 'Recorded English narration');
  assert.equal(complexityText('平均 O(n) · 最坏 O(n²)', 'en'), 'average O(n) · worst O(n²)');
});
