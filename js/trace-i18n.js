// English narration is derived from each recorded operation and its snapshot.
// The original Chinese trace and numerical data remain unchanged.
const summaries = {
  bubble: 'Compare and swap adjacent elements so the largest remaining value reaches the end of each pass. A stable introduction to sorting.',
  selection: 'Repeatedly select the smallest remaining element and append it to the sorted prefix. Uses relatively few swaps.',
  insertion: 'Insert each new element into the sorted prefix, like arranging playing cards. Stable and effective for nearly sorted data.',
  merge: 'Recursively split the array, then merge sorted halves. Stable, with O(n log n) time regardless of the input order.',
  quick: 'Partition around the last element, then recursively sort both sides. Average O(n log n), worst O(n²); average recursion space O(log n).',
  heap: 'Build a max heap, then move its largest element to the end repeatedly. This demonstration uses recursive heap repair.',
  counting: 'Count integer frequencies and use prefix counts to place elements stably. Supports values 0–99; k is the value range.',
  shell: 'Perform insertion sort with successively halved gaps, finishing with gap 1. Move distant elements toward their final positions early.',
  linear: 'Check elements in the original input order. Works with any array and requires no sorting.',
  binary: 'Check the midpoint of a sorted range and discard the half that cannot contain the target. This demo sorts an input copy first.',
  jump: 'Jump through a sorted array in blocks of about √n elements, then scan the candidate block.',
  interpolation: 'Estimate the target index from its position between the endpoint values. Best suited to uniformly distributed sorted data.',
  exponential: 'Probe indices 1, 2, 4, 8 and so on to find a candidate range, then perform binary search.',
  bfs: 'Explore a graph layer by layer using a first-in, first-out queue. Useful for unweighted shortest paths and level traversal.',
  dfs: 'Explore a path deeply using a last-in, first-out stack, then return to explore other branches.',
  dijkstra: 'Settle the nearest unsettled vertex and relax its neighboring edges. Requires nonnegative edge weights.',
  topological: 'Remove zero-indegree vertices to produce an ordering that respects dependencies in a directed acyclic graph.',
  kruskal: 'Consider edges in ascending weight order and use disjoint sets to reject cycles while connecting all vertices.',
  prim: 'Grow a tree from one vertex by repeatedly selecting the lightest edge crossing from the tree to an unselected vertex.',
  fibonacci: 'Start with two base cases and build the sequence by adding the two preceding values.',
  knapsack: 'Maximize total value within a weight capacity, choosing each item at most once.',
  lcs: 'Compare prefixes of two strings to find the longest common subsequence while preserving character order.',
  'coin-change': 'Find the fewest coins needed for a target amount. Each coin denomination can be used repeatedly.',
  'edit-distance': 'Find the fewest insertions, deletions, and replacements needed to transform one string into another.',
};

export function algorithmName(algorithm, locale) {
  return locale === 'en' ? algorithm.nameEn ?? algorithm.name : algorithm.name;
}

export function algorithmSummary(algorithm, locale) {
  return locale === 'en' ? algorithm.summaryEn ?? summaries[algorithm.id] ?? algorithm.summary : algorithm.summary;
}

export function complexityText(text, locale) {
  if (locale !== 'en') return text;
  return String(text).replaceAll('最坏', 'worst').replaceAll('平均', 'average').replaceAll('最好', 'best');
}

const humanLabels = new Map([
  ['待插入值', 'Insertion key'], ['左子数组', 'Left subarray'], ['右子数组', 'Right subarray'],
  ['输出数组', 'Output array'], ['无物品', 'No items'], ['最少硬币', 'Fewest coins'],
  ['节点', 'Vertex'], ['最短距离', 'Shortest distance'], ['前驱', 'Predecessor'],
  ['当前入度', 'Current indegree'], ['边', 'Edge'], ['权重', 'Weight'],
  ['已选择', 'Selected'], ['未选择', 'Not selected'], ['已跳过', 'Skipped'],
  ['待检查', 'Pending'],
  ['选择', 'Select'], ['跳过', 'Skip'], ['候选', 'Candidate'], ['状态', 'State'],
]);

function translateLabel(value) {
  if (typeof value !== 'string') return value;
  if (humanLabels.has(value)) return humanLabels.get(value);
  const bucketLabel = value.match(/^计数 \/ 前缀 · 桶值：(.*)$/);
  if (bucketLabel) return `Counts / prefixes · bucket values: ${bucketLabel[1] === '空' ? 'empty' : bucketLabel[1]}`;
  return value.replace(/^间隔 (\d+) · 待插入值$/, 'Gap $1 · insertion key');
}

export function localizeState(algorithm, state, locale) {
  if (locale !== 'en') return state;
  const localized = { ...state };
  if (state.rowLabels) localized.rowLabels = (state.rowLabelsEn ?? state.rowLabels).map(translateLabel);
  if (state.columnLabels) localized.columnLabels = (state.columnLabelsEn ?? state.columnLabels).map(translateLabel);
  if (state.matrix) localized.matrix = (state.matrixEn ?? state.matrix).map(row => row.map(translateLabel));
  if (state.note !== undefined) localized.note = state.noteEn ?? translateLabel(state.note);
  if (state.aux) localized.aux = state.aux.map(item => ({
    ...item,
    label: item.labelEn ?? translateLabel(item.label),
    values: (item.valuesEn ?? item.values).map(translateLabel),
  }));
  if (state.table) localized.table = {
    ...state.table,
    columns: (state.table.columnsEn ?? state.table.columns).map(translateLabel),
    rows: (state.table.rowsEn ?? state.table.rows).map(row => row.map(translateLabel)),
  };
  return localized;
}

const shown = value => value === Infinity || value === '∞' ? '∞' : String(value);
const numbersIn = text => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
const atIndex = (values, index) => `${shown(values[index])} at index ${index}`;
const rangeText = range => range ? `[${range.join(', ')}]` : 'the candidate range';
const candidateSum = value => value === '∞' || value === Infinity ? '∞' : Number(value) + 1;

function sortingDescription(algorithm, step) {
  const { tag, state: s, description } = step;
  const a = s.values, active = s.active ?? [], secondary = s.secondary ?? [];
  const i = active[0], j = active[1] ?? secondary[0];
  const value = a[i], other = a[j], key = s.aux?.[0]?.values[0];
  const n = numbersIn(description);
  if (tag === 'done') return `Sorting complete: [${a.join(', ')}] is in ascending order.`;
  const initial = {
    bubble: 'Begin at the left end and compare adjacent elements.',
    selection: 'Select the minimum of the unsorted suffix during each pass.',
    insertion: 'Treat the first element as sorted, then insert each following element into that prefix.',
    merge: 'Split the array recursively, then merge the sorted subarrays.',
    quick: 'Use the last element as the pivot and recursively partition the array.',
    heap: 'Build a max heap, then extract its largest element repeatedly.',
    counting: 'Create the frequency counts and an output array.',
    shell: 'Run insertion sort on gap-separated subsequences, reducing the gap each pass.',
  };
  if (tag === 'init') return initial[algorithm.id];
  switch (algorithm.id) {
    case 'bubble':
      return {
        compare: `Compare adjacent values ${value} and ${other} at indices ${i} and ${j}.`,
        swap: `Swap the adjacent values: ${value} is now left of ${other}, moving the larger value right.`,
        settled: `The largest value in this pass, ${value}, is settled at index ${i}.`,
      }[tag];
    case 'selection':
      return {
        select: `Use ${value} at index ${i} as the initial minimum for this pass.`,
        compare: `Compare candidate ${value} at index ${i} with the current minimum ${other} at index ${j}.`,
        minimum: `Update the minimum to ${value} at index ${i}.`,
        swap: `Place the minimum ${value} at index ${i}, exchanging it with index ${j}.`,
        settled: `Index ${i} is settled with value ${value}.`,
      }[tag];
    case 'insertion':
    case 'shell':
      return {
        gap: `Use gap ${n[0]} for this pass of gap-separated insertion sort.`,
        key: `Take insertion key ${key} from index ${i} and find its place in the ${algorithm.id === 'shell' ? 'gap-separated subsequence' : 'sorted prefix'}.`,
        compare: `Compare ${value} at index ${i} with insertion key ${key}.`,
        shift: `Move ${value} from index ${i} to index ${j}, making space for insertion key ${key}.`,
        insert: `Insert key ${key} at index ${i}.`,
      }[tag];
    case 'merge':
      return {
        divide: `Split indices ${active[0]}–${secondary.at(-1)} into left [${active.join(', ')}] and right [${secondary.join(', ')}] subarrays.`,
        copy: `Copy sorted halves [${s.aux?.[0]?.values.join(', ')}] and [${s.aux?.[1]?.values.join(', ')}] before merging.`,
        compare: `Compare the next left value ${n[0]} with the next right value ${n[1]}.`,
        writeleft: `Write the smaller left value ${value} to index ${i}.`,
        writeright: `Write the smaller right value ${value} to index ${i}.`,
        remainleft: `Copy the remaining left value ${value} to index ${i}.`,
        remainright: `Copy the remaining right value ${value} to index ${i}.`,
      }[tag];
    case 'quick':
      return {
        pivot: `Select ${value} at index ${i} as the pivot.`,
        compare: `Compare ${value} at index ${i} with pivot ${other} at index ${j}.`,
        swap: `Move a value no greater than pivot ${a[secondary[0]]} into the left partition by swapping indices ${i} and ${active[1]}.`,
        place: `Pivot ${value} reaches its final index ${i}; sort the partitions on either side.`,
      }[tag];
    case 'heap':
      return {
        compareleft: `Compare the current maximum ${value} at index ${i} with left child ${other} at index ${j}.`,
        compareright: `Compare the current maximum ${value} at index ${i} with right child ${other} at index ${j}.`,
        swap: `Swap parent and child at indices ${i} and ${j} to restore the max-heap property.`,
        build: `The subtree rooted at index ${i} now satisfies the max-heap property.`,
        extract: `Move the largest heap value ${other} to its final index ${j}.`,
      }[tag];
    case 'counting':
      return {
        count: `Increment the frequency count for input value ${value} at index ${i}.`,
        accumulate: `Accumulate prefix counts: ${n[1]} elements have values no greater than ${n[0]}.`,
        place: `Place value ${value} at output index ${n[1] - 1}, preserving the relative order of equal values.`,
        write: `Copy output value ${value} back to input index ${i}.`,
      }[tag];
  }
}

function searchingDescription(algorithm, step) {
  const { tag, state: s } = step;
  const i = s.active?.[0], previous = s.secondary?.[0], target = s.target;
  const item = atIndex(s.values, i), range = rangeText(s.range);
  if (['found', 'uniformFound', 'firstFound'].includes(tag)) return `Found target ${target} at index ${s.found} in the displayed array.`;
  if (['missing', 'missingEmpty', 'missingUniform'].includes(tag)) return `${s.values.length ? 'Search complete' : 'The array is empty'}: target ${target} is absent. Return -1.`;
  if (tag === 'init') return {
    linear: `Keep the input order and search for ${target} beginning at index 0.`,
    binary: `Sort an input copy and search for ${target} by halving range ${range}.`,
    jump: `Sort an input copy and search for ${target} in blocks of ${Math.max(1, Math.floor(Math.sqrt(s.values.length)))} elements.`,
    interpolation: `Sort an input copy and estimate the index of ${target} from the endpoint values.`,
    exponential: `Sort an input copy, double the probe index to locate ${target}, then search by halving the range.`,
  }[algorithm.id];
  return {
    compare: algorithm.id === 'linear' ? `Compare ${item} with target ${target}.`
      : algorithm.id === 'interpolation' ? `Estimate index ${i} by interpolation, then compare ${s.values[i]} with target ${target}.`
        : `Check midpoint ${i} in ${range}: compare ${s.values[i]} with target ${target}.`,
    move: `${s.values[previous]} at index ${previous} differs from ${target}; continue with the next element.`,
    moveLeft: `The checked value is below ${target}; move the left boundary to ${s.range?.[0]} and keep range ${range}.`,
    moveRight: `The checked value is above ${target}; move the right boundary to ${s.range?.[1]} and keep range ${range}.`,
    blockCompare: `Check block endpoint ${item} against target ${target}, for block ${range}.`,
    moveBlock: `The block endpoint is below ${target}; jump to the next block ${range}.`,
    scanCompare: `Scan candidate block ${range}: compare ${item} with target ${target}.`,
    moveScan: `${s.values[previous]} at index ${previous} differs from ${target}; check the next element in this block.`,
    uniformCompare: `Both range endpoints equal ${s.values[i]}; compare that value directly with target ${target}.`,
    firstCompare: `Compare first value ${s.values[i]} with target ${target}.`,
    probeCompare: `Probe ${item} to find an upper bound for target ${target}.`,
    grow: `The probe is below ${target}; double the probe index to ${numbersIn(step.description)[0]}. Candidate range: ${range}.`,
    startBinary: `The candidate range is ${range}; begin binary search for ${target}.`,
  }[tag];
}

function graphDescription(algorithm, step, input) {
  const { tag, state: s } = step;
  const current = s.active?.[0], neighbor = s.active?.[1];
  const edge = s.activeEdges?.[0];
  const from = Array.isArray(edge) ? edge[0] : edge?.from;
  const to = Array.isArray(edge) ? edge[1] : edge?.to;
  const weight = s.edges.find(e => e.from === from && e.to === to || !s.directed && e.from === to && e.to === from)?.weight;
  const start = input?.start ?? Object.entries(s.distances ?? {}).find(([, distance]) => distance === 0)?.[0] ?? algorithm.defaults?.start;
  const order = s.order?.join(' → ');
  const total = s.metrics?.totalWeight;
  switch (algorithm.id) {
    case 'bfs':
    case 'dfs': {
      const bfs = algorithm.id === 'bfs';
      return {
        init: `Push start vertex ${s.frontier[0]} into a ${bfs ? 'first-in, first-out queue and mark it discovered' : 'last-in, first-out stack; the display runs from bottom to top'}.`,
        visit: `${bfs ? 'Remove from the queue front' : 'Pop from the stack top and visit'} vertex ${current}; append it to the traversal order.`,
        inspect: `Inspect ${bfs ? '' : 'in reverse order '}${current}'s neighbor ${neighbor}, along edge ${from} → ${to}.`,
        enqueue: bfs ? `Discover ${current}, mark it, and append it to the queue back.` : `Push ${current} onto the stack to explore it later.`,
        skip: `${current} is already discovered; avoid adding it to the queue again.`,
        skipVisited: `${current} is already visited; discard this duplicate stack entry.`,
        skipNeighbor: `${current} is already visited; do not push it onto the stack.`,
        finish: `${bfs ? 'Breadth' : 'Depth'}-first traversal complete: ${order}.`,
      }[tag];
    }
    case 'dijkstra':
      return {
        init: `Set distance to start ${start} to 0 and all other distances to ∞. Every edge weight is nonnegative.`,
        select: `Select unsettled vertex ${current} with the smallest tentative distance, ${s.distances?.[current]}.`,
        inspect: `Try path ${from} → ${to}: ${s.distances?.[from]} + ${weight} = ${Number(s.distances?.[from]) + weight}; compare with current distance ${s.distances?.[to]}.`,
        relax: `This path is shorter: update distance to ${current} to ${s.distances?.[current]} and its predecessor to ${from}.`,
        settle: `Settle vertex ${current}; its shortest distance is ${s.distances?.[current]}.`,
        finish: `Shortest distances from ${start} are complete: ${Object.entries(s.distances ?? {}).map(([node, distance]) => `${node}: ${distance}`).join(', ')}.`,
      }[tag];
    case 'topological':
      return {
        init: 'Count the incoming edges of each vertex. Topological ordering requires a directed acyclic graph.',
        ready: `Enqueue the zero-indegree vertices: ${s.frontier.join(', ')}.`,
        select: `Remove ${current} from the queue and append it to the ordering; all its prerequisites are processed.`,
        inspect: `Remove the effect of edge ${from} → ${to}; the indegree of ${to} becomes ${s.table?.rows.find(row => row[0] === to)?.[1]}.`,
        enqueue: `The indegree of ${current} is now 0; append it to the queue.`,
        finish: s.order.length === s.nodes.length ? `Topological ordering complete: ${order}.` : 'A cycle prevents a complete topological ordering.',
      }[tag];
    case 'kruskal':
    case 'prim': {
      const kruskal = algorithm.id === 'kruskal';
      return {
        init: kruskal ? 'Sort edges by ascending weight. Initially, each vertex is a separate disjoint set.' : `Start the spanning tree at ${current}; repeatedly select the lightest edge crossing its boundary.`,
        inspect: kruskal ? `Check edge ${from}–${to} with weight ${weight}.` : `Check whether edge ${from}–${to} (weight ${weight}) crosses the selected vertex set.`,
        reject: kruskal ? `Reject edge ${from}–${to}: both endpoints are in the same component, so this edge would create a cycle.` : `Reject edge ${from}–${to}: it does not connect a selected vertex to an unselected vertex.`,
        accept: kruskal ? `Merge the components and select ${from}–${to}; total tree weight is ${total}.` : `Select the lightest crossing edge ${from}–${to} and add vertex ${current}; total tree weight is ${total}.`,
        finish: `Minimum spanning tree complete: ${s.selectedEdges.length} edges, total weight ${total}.`,
      }[tag];
    }
  }
}

function dynamicDescription(algorithm, step) {
  const { tag, state: s, description } = step;
  const [row, column] = s.active?.[0] ?? [0, 0];
  const value = s.matrix[row]?.[column];
  const cell = ([r, c]) => s.matrix[r]?.[c];
  const previous = (s.secondary ?? []).map(cell);
  switch (algorithm.id) {
    case 'fibonacci':
      return {
        init: `Set base case F(0) = 0${s.columnLabels.length > 1 ? ' and F(1) = 1' : ''}.`,
        iterate: `Compute F(${column}) by reading F(${column - 2}) = ${previous[0]} and F(${column - 1}) = ${previous[1]}.`,
        write: `Write F(${column}) = ${previous[1]} + ${previous[0]} = ${value}.`,
        result: `Return F(${column}) = ${value}.`,
      }[tag];
    case 'knapsack': {
      const item = s.rowLabels[row]?.match(/w(\d+)\/v(\d+)/);
      const weight = Number(item?.[1]), itemValue = Number(item?.[2]);
      return {
        init: 'Create a table of available items versus capacity. With no items, the attainable value is 0.',
        inspect: `Item ${row} has weight ${weight} and value ${itemValue}; inspect capacity ${column}.`,
        choose: `Skipping yields ${previous[0]}; taking yields ${itemValue} + ${previous[1]} = ${itemValue + Number(previous[1])}. Keep value ${value}.`,
        skip: `Capacity ${column} cannot hold weight ${weight}; copy the preceding row's value ${value}.`,
        result: `The maximum 0/1 knapsack value for capacity ${column} is ${value}; each item can be taken at most once.`,
      }[tag];
    }
    case 'lcs':
    case 'edit-distance': {
      const edit = algorithm.id === 'edit-distance';
      const a = s.rowLabels[row], b = s.columnLabels[column];
      const deletion = Number(s.matrix[row - 1]?.[column]) + 1;
      const insertion = Number(s.matrix[row]?.[column - 1]) + 1;
      const replacement = Number(s.matrix[row - 1]?.[column - 1]) + (a === b ? 0 : 1);
      return {
        init: edit ? 'Initialize empty-string boundaries: inserting or deleting i characters costs i operations.' : 'Initialize empty-string boundaries: the common subsequence length with an empty string is 0.',
        compare: `Compare character ${row} (“${a}”) with character ${column} (“${b}”): they ${a === b ? 'match' : 'differ'}.`,
        match: `Matching characters extend the diagonal subsequence: ${previous[0]} + 1 = ${value}.`,
        choose: `Characters differ; take the larger of the upper value ${previous[0]} and left value ${previous[1]}: ${value}.`,
        write: `Deletion costs ${deletion}, insertion ${insertion}, and ${a === b ? 'matching' : 'replacement'} ${replacement}. Write the minimum cost ${value}.`,
        result: edit ? `The minimum edit distance is ${value} insertions, deletions, or replacements.` : `The longest common subsequence has length ${value}; its characters need not be contiguous.`,
      }[tag];
    }
    case 'coin-change': {
      const smallerAmount = s.secondary?.[0]?.[1];
      const candidate = candidateSum(previous[0]);
      const coin = description.match(/面值 (\d+)/)?.[1];
      return {
        init: 'Amount 0 requires 0 coins; initialize every other amount as unreachable (∞).',
        inspect: `For amount ${column}, try denomination ${coin}${Number(coin) > column ? '; it is too large, so skip it' : ''}.`,
        compare: `Compare current count ${value} with the best count for amount ${smallerAmount} plus 1 (${candidate}).`,
        improve: `Candidate ${candidate} is better; update the minimum coin count for amount ${column} to ${value}.`,
        keep: `Candidate ${candidate} is no better; retain current count ${value} for amount ${column}.`,
        result: s.metrics?.result < 0 ? `These denominations cannot form amount ${column}; return -1.` : `The minimum number of coins for amount ${column} is ${value}.`,
      }[tag];
    }
  }
}

export function stepDescription(algorithm, step, locale, input) {
  if (locale !== 'en') return step.description;
  if (step.descriptionEn) return step.descriptionEn;
  const description = algorithm.category === 'sorting' ? sortingDescription(algorithm, step)
    : algorithm.category === 'searching' ? searchingDescription(algorithm, step)
      : algorithm.category === 'graphs' ? graphDescription(algorithm, step, input)
        : algorithm.category === 'dynamic' ? dynamicDescription(algorithm, step) : undefined;
  // New algorithms can record their own English narration without changing this file.
  return description ?? `Review the recorded ${algorithmName(algorithm, locale)} state.`;
}
