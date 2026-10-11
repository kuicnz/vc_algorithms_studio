import { translate } from './i18n.js';

export class InputError extends Error {
  constructor(key, params = {}) {
    const name = params.nameKey ? translate('zh', params.nameKey) : 'n';
    super(translate('zh', key, { ...params, name }));
    this.key = key;
    this.params = params;
  }
  localized(locale) {
    return translate(locale, this.key, { ...this.params, name: this.params.nameKey ? translate(locale, this.params.nameKey) : 'n' });
  }
}
function integer(value, nameKey, min, max) {
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) throw new InputError('error.integer', { nameKey });
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new InputError('error.range', { nameKey, min, max });
  return number;
}
function numbers(value, nameKey, min, max, length = 18) {
  const parts = String(value).trim().split(/[\s,，]+/).filter(Boolean);
  if (!parts.length || parts.length > length) throw new InputError('error.arrayCount', { nameKey, length });
  return parts.map(part => integer(part, nameKey, min, max));
}
export function parseInput(algorithm, fields) {
  switch (algorithm.inputType) {
    case 'array': return { values: numbers(fields.values, 'field.values', algorithm.id.includes('counting') ? 0 : -99, 99) };
    case 'search': return { values: numbers(fields.values, 'field.values', -99, 99), target: integer(fields.target, 'field.target', -999, 999) };
    case 'graph':
    case 'pathfinding': {
      if (!algorithm.graph.nodes.some(node => node.id === fields.start)) throw new InputError('error.start');
      if (algorithm.inputType === 'pathfinding') {
        if (!algorithm.graph.nodes.some(node => node.id === fields.goal)) throw new InputError('error.goal');
        return { start: fields.start, goal: fields.goal };
      }
      return { start: fields.start };
    }
    case 'fibonacci': return { n: integer(fields.n, null, 0, 20) };
    case 'knapsack':
    case 'fractional': {
      const fractional = algorithm.inputType === 'fractional';
      const weights = numbers(fields.weights, 'field.weights', 1, fractional ? 50 : 16, 6);
      const values = numbers(fields.values, 'field.itemValues', fractional ? 1 : 0, fractional ? 200 : 99, 6);
      if (weights.length !== values.length) throw new InputError('error.itemLengths');
      return { weights, values, capacity: integer(fields.capacity, 'field.capacity', 0, fractional ? 100 : 16) };
    }
    case 'activities': {
      const starts = numbers(fields.starts, 'field.starts', 0, 24, 8);
      const ends = numbers(fields.ends, 'field.ends', 0, 24, 8);
      if (starts.length !== ends.length || starts.some((start, index) => start >= ends[index])) throw new InputError('error.activities');
      return { starts, ends };
    }
    case 'strings': {
      const textA = String(fields.textA), textB = String(fields.textB);
      if (![textA, textB].every(text => /^[\x20-\x7E]{0,10}$/.test(text))) throw new InputError('error.strings');
      return { textA, textB };
    }
    case 'coins':
    case 'greedy-coins': {
      const greedy = algorithm.inputType === 'greedy-coins';
      return { coins: [...new Set(numbers(fields.coins, 'field.coins', 1, greedy ? 50 : 20, 6))], amount: integer(fields.amount, 'field.amount', 0, greedy ? 100 : 20) };
    }
    default: throw new InputError('error.type');
  }
}
export function randomInput(algorithm) {
  const roll = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  switch (algorithm.inputType) {
    case 'array': return { values: Array.from({ length: 9 }, () => roll(4, 85)) };
    case 'search': {
      const values = Array.from({ length: 10 }, () => roll(1, 85));
      return { values, target: values[roll(0, values.length - 1)] };
    }
    case 'graph': return { start: algorithm.graph.nodes[roll(0, algorithm.graph.nodes.length - 1)].id };
    case 'pathfinding': return { start: algorithm.graph.nodes[roll(0, algorithm.graph.nodes.length - 1)].id, goal: algorithm.graph.nodes[roll(0, algorithm.graph.nodes.length - 1)].id };
    case 'fibonacci': return { n: roll(5, 12) };
    case 'knapsack': return { weights: Array.from({ length: 4 }, () => roll(1, 5)), values: Array.from({ length: 4 }, () => roll(2, 12)), capacity: roll(5, 12) };
    case 'fractional': return { weights: Array.from({ length: 4 }, () => roll(5, 25)), values: Array.from({ length: 4 }, () => roll(20, 100)), capacity: roll(20, 60) };
    case 'activities': {
      const starts = Array.from({ length: 6 }, () => roll(0, 16));
      return { starts, ends: starts.map(start => start + roll(1, 7)) };
    }
    case 'strings': {
      const words = ['ALGORITHM', 'LOGARITHM', 'STUDIO', 'HELLO', 'WORLD', 'DYNAMIC', 'PIXEL', 'MAGIC'];
      return { textA: words[roll(0, words.length - 1)], textB: words[roll(0, words.length - 1)] };
    }
    case 'coins': return { coins: [1, roll(2, 4), roll(5, 8)], amount: roll(7, 18) };
    case 'greedy-coins': return { coins: [1, roll(3, 6), roll(10, 25)], amount: roll(15, 80) };
  }
}
