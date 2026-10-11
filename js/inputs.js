function integer(value, name, min, max) {
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) throw new Error(`${name}必须是整数。`);
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${name}需要在 ${min} 到 ${max} 之间。`);
  return number;
}

function numbers(value, name, min, max, length = 18) {
  const parts = String(value).trim().split(/[\s,，]+/).filter(Boolean);
  if (!parts.length || parts.length > length) throw new Error(`${name}需要 1–${length} 个整数，用逗号或空格分隔。`);
  return parts.map(part => integer(part, name, min, max));
}

export function parseInput(algorithm, fields) {
  switch (algorithm.inputType) {
    case 'array':
      return { values: numbers(fields.values, '数组', algorithm.id.includes('counting') ? 0 : -99, 99) };
    case 'search':
      return { values: numbers(fields.values, '数组', -99, 99), target: integer(fields.target, '目标值', -999, 999) };
    case 'graph':
      if (!algorithm.graph.nodes.some(node => node.id === fields.start)) throw new Error('请选择图中存在的起点。');
      return { start: fields.start };
    case 'fibonacci':
      return { n: integer(fields.n, 'n', 0, 20) };
    case 'knapsack': {
      const weights = numbers(fields.weights, '物品重量', 1, 16, 6);
      const values = numbers(fields.values, '物品价值', 0, 99, 6);
      if (weights.length !== values.length) throw new Error('重量与价值必须有相同数量的元素。');
      return { weights, values, capacity: integer(fields.capacity, '背包容量', 0, 16) };
    }
    case 'strings': {
      const textA = String(fields.textA);
      const textB = String(fields.textB);
      if (![textA, textB].every(text => /^[\x20-\x7E]{0,10}$/.test(text))) throw new Error('每个字符串最多 10 个英文字母、数字或 ASCII 符号，支持空字符串。');
      return { textA, textB };
    }
    case 'coins':
      return { coins: [...new Set(numbers(fields.coins, '硬币面额', 1, 20, 6))], amount: integer(fields.amount, '目标金额', 0, 20) };
    default:
      throw new Error('无法识别该算法的输入格式。');
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
    case 'fibonacci': return { n: roll(5, 12) };
    case 'knapsack': return { weights: Array.from({ length: 4 }, () => roll(1, 5)), values: Array.from({ length: 4 }, () => roll(2, 12)), capacity: roll(5, 12) };
    case 'strings': {
      const words = ['ALGORITHM', 'LOGARITHM', 'STUDIO', 'HELLO', 'WORLD', 'DYNAMIC', 'CLASSIC', 'MAGIC'];
      return { textA: words[roll(0, words.length - 1)], textB: words[roll(0, words.length - 1)] };
    }
    case 'coins': return { coins: [1, roll(2, 4), roll(5, 8)], amount: roll(7, 18) };
  }
}
