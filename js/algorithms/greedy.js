// § markers identify the exact displayed lines used by the animation.
function snippet(text) {
  const tags = {};
  const source = text.trim().split('\n').map((line, index) => {
    const match = line.match(/\s*§([\w,-]+)$/);
    if (!match) return line;
    for (const tag of match[1].split(',')) (tags[tag] ||= []).push(index + 1);
    return line.slice(0, match.index);
  }).join('\n');
  return { source, tags };
}

const codes = sources => Object.fromEntries(Object.entries(sources).map(([language, source]) => [language, snippet(source)]));

const activityCodes = codes({
  javascript: `function activitySelection(starts, ends) {
  const items = starts.map((start, index) => ({ start, end: ends[index], index }));
  items.sort((a, b) => a.end - b.end || a.index - b.index); §sort
  const selected = []; let lastEnd = -1; §init
  for (const item of items) {
    if (item.start >= lastEnd) { §inspect
      selected.push(item.index); lastEnd = item.end; §choose
    } else {
      continue; §skip
    }
  }
  return { selected, count: selected.length }; §result
}`,
  typescript: `function activitySelection(starts: number[], ends: number[]): { selected: number[]; count: number } {
  const items = starts.map((start, index) => ({ start, end: ends[index], index }));
  items.sort((a, b) => a.end - b.end || a.index - b.index); §sort
  const selected: number[] = []; let lastEnd = -1; §init
  for (const item of items) {
    if (item.start >= lastEnd) { §inspect
      selected.push(item.index); lastEnd = item.end; §choose
    } else {
      continue; §skip
    }
  }
  return { selected, count: selected.length }; §result
}`,
  python: `def activity_selection(starts, ends):
    items = [(s, ends[i], i) for i, s in enumerate(starts)]
    items.sort(key=lambda item: (item[1], item[2])) §sort
    selected, last_end = [], -1 §init
    for start, end, index in items:
        if start >= last_end: §inspect
            selected.append(index); last_end = end §choose
        else:
            continue §skip
    return {"selected": selected, "count": len(selected)} §result`,
  java: `import java.util.*;
// Place this method inside a class.
static Map<String, Object> activitySelection(int[] starts, int[] ends) {
    Integer[] order = new Integer[starts.length];
    for (int i = 0; i < order.length; i++) order[i] = i;
    Arrays.sort(order, Comparator.comparingInt((Integer i) -> ends[i]).thenComparingInt(i -> i)); §sort
    List<Integer> selected = new ArrayList<>(); int lastEnd = -1; §init
    for (int i : order) {
        if (starts[i] >= lastEnd) { §inspect
            selected.add(i); lastEnd = ends[i]; §choose
        } else {
            continue; §skip
        }
    }
    Map<String, Object> result = new HashMap<>();
    result.put("selected", selected); result.put("count", selected.size());
    return result; §result
}`,
  c: `#include <stdlib.h>
typedef struct { int start, end, index; } Activity;
typedef struct { int selected[8], count; } ActivityResult;
static int by_end(const void *a, const void *b) {
    const Activity *x = a, *y = b;
    return x->end != y->end ? x->end - y->end : x->index - y->index;
}
/* Demo input: 0 <= n <= 8; times are nonnegative. */
ActivityResult activity_selection(const int *starts, const int *ends, int n) {
    Activity items[8];
    for (int i = 0; i < n; i++) items[i] = (Activity){starts[i], ends[i], i};
    qsort(items, n, sizeof(Activity), by_end); §sort
    ActivityResult result = {0}; int last_end = -1; §init
    for (int i = 0; i < n; i++) {
        if (items[i].start >= last_end) { §inspect
            result.selected[result.count++] = items[i].index; last_end = items[i].end; §choose
        } else {
            continue; §skip
        }
    }
    return result; §result
}`,
  cpp: `#include <algorithm>
#include <numeric>
#include <vector>
struct ActivityResult { std::vector<int> selected; int count; };
ActivityResult activitySelection(const std::vector<int>& starts, const std::vector<int>& ends) {
    std::vector<int> order(starts.size());
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int a, int b) { return ends[a] != ends[b] ? ends[a] < ends[b] : a < b; }); §sort
    std::vector<int> selected; int lastEnd = -1; §init
    for (int i : order) {
        if (starts[i] >= lastEnd) { §inspect
            selected.push_back(i); lastEnd = ends[i]; §choose
        } else {
            continue; §skip
        }
    }
    return {selected, static_cast<int>(selected.size())}; §result
}`,
  csharp: `using System;
using System.Collections.Generic;
// Place this method inside a class.
static (List<int> selected, int count) ActivitySelection(int[] starts, int[] ends) {
    int[] order = new int[starts.Length];
    for (int i = 0; i < order.Length; i++) order[i] = i;
    Array.Sort(order, (a, b) => ends[a] != ends[b] ? ends[a].CompareTo(ends[b]) : a.CompareTo(b)); §sort
    var selected = new List<int>(); int lastEnd = -1; §init
    foreach (int i in order) {
        if (starts[i] >= lastEnd) { §inspect
            selected.Add(i); lastEnd = ends[i]; §choose
        } else {
            continue; §skip
        }
    }
    return (selected, selected.Count); §result
}`,
  go: `import "sort"
type ActivityResult struct { Selected []int; Count int }
func activitySelection(starts, ends []int) ActivityResult {
    order := make([]int, len(starts))
    for i := range order { order[i] = i }
    sort.Slice(order, func(a, b int) bool { i, j := order[a], order[b]; if ends[i] == ends[j] { return i < j }; return ends[i] < ends[j] }) §sort
    selected := []int{}; lastEnd := -1 §init
    for _, i := range order {
        if starts[i] >= lastEnd { §inspect
            selected = append(selected, i); lastEnd = ends[i] §choose
        } else {
            continue §skip
        }
    }
    return ActivityResult{selected, len(selected)} §result
}`,
  rust: `struct ActivityResult { selected: Vec<usize>, count: usize }
fn activity_selection(starts: &[i32], ends: &[i32]) -> ActivityResult {
    let mut order: Vec<usize> = (0..starts.len()).collect();
    order.sort_by_key(|&i| (ends[i], i)); §sort
    let mut selected = Vec::new(); let mut last_end = -1; §init
    for i in order {
        if starts[i] >= last_end { §inspect
            selected.push(i); last_end = ends[i]; §choose
        } else {
            continue; §skip
        }
    }
    let count = selected.len();
    ActivityResult { selected, count } §result
}`,
  swift: `func activitySelection(_ starts: [Int], _ ends: [Int]) -> (selected: [Int], count: Int) {
    let order = starts.indices.sorted { a, b in ends[a] != ends[b] ? ends[a] < ends[b] : a < b } §sort
    var selected: [Int] = []; var lastEnd = -1 §init
    for i in order {
        if starts[i] >= lastEnd { §inspect
            selected.append(i); lastEnd = ends[i] §choose
        } else {
            continue §skip
        }
    }
    return (selected, selected.count) §result
}`,
});

const fractionalCodes = codes({
  javascript: `function fractionalKnapsack(weights, values, capacity) {
  const order = weights.map((_, i) => i);
  order.sort((a, b) => values[b] / weights[b] - values[a] / weights[a] || a - b); §sort
  const fractions = weights.map(() => 0); let value = 0, remaining = capacity; §init
  for (const i of order) {
    if (remaining <= 0) { §inspect
      break; §stop
    }
    const fraction = Math.min(1, remaining / weights[i]); §choose
    fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i]; §choose
  }
  return { value, fractions }; §result
}`,
  typescript: `function fractionalKnapsack(weights: number[], values: number[], capacity: number): { value: number; fractions: number[] } {
  const order = weights.map((_, i) => i);
  order.sort((a, b) => values[b] / weights[b] - values[a] / weights[a] || a - b); §sort
  const fractions: number[] = weights.map(() => 0); let value = 0, remaining = capacity; §init
  for (const i of order) {
    if (remaining <= 0) { §inspect
      break; §stop
    }
    const fraction = Math.min(1, remaining / weights[i]); §choose
    fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i]; §choose
  }
  return { value, fractions }; §result
}`,
  python: `def fractional_knapsack(weights, values, capacity):
    order = list(range(len(weights)))
    order.sort(key=lambda i: (-values[i] / weights[i], i)) §sort
    fractions = [0.0] * len(weights); value = 0.0; remaining = capacity §init
    for i in order:
        if remaining <= 0: §inspect
            break §stop
        fraction = min(1.0, remaining / weights[i]) §choose
        fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i] §choose
    return {"value": value, "fractions": fractions} §result`,
  java: `import java.util.*;
// Place this method inside a class.
static Map<String, Object> fractionalKnapsack(int[] weights, int[] values, int capacity) {
    Integer[] order = new Integer[weights.length];
    for (int i = 0; i < order.length; i++) order[i] = i;
    Arrays.sort(order, Comparator.comparingDouble((Integer i) -> -(double) values[i] / weights[i]).thenComparingInt(i -> i)); §sort
    double[] fractions = new double[weights.length]; double value = 0, remaining = capacity; §init
    for (int i : order) {
        if (remaining <= 0) { §inspect
            break; §stop
        }
        double fraction = Math.min(1.0, remaining / weights[i]); §choose
        fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i]; §choose
    }
    Map<String, Object> result = new HashMap<>();
    result.put("value", value); result.put("fractions", fractions);
    return result; §result
}`,
  c: `#include <stdlib.h>
typedef struct { int weight, value, index; } Item;
typedef struct { double value, fractions[6]; } FractionalResult;
static int by_ratio(const void *a, const void *b) {
    const Item *x = a, *y = b;
    int difference = y->value * x->weight - x->value * y->weight;
    return difference ? difference : x->index - y->index;
}
/* Demo input: n <= 6, positive weights and values. */
FractionalResult fractional_knapsack(const int *weights, const int *values, int n, int capacity) {
    Item items[6];
    for (int i = 0; i < n; i++) items[i] = (Item){weights[i], values[i], i};
    qsort(items, n, sizeof(Item), by_ratio); §sort
    FractionalResult result = {0}; double remaining = capacity; §init
    for (int j = 0; j < n; j++) {
        if (remaining <= 0) { §inspect
            break; §stop
        }
        Item item = items[j];
        double fraction = remaining >= item.weight ? 1.0 : remaining / item.weight; §choose
        result.fractions[item.index] = fraction; result.value += fraction * item.value; remaining -= fraction * item.weight; §choose
    }
    return result; §result
}`,
  cpp: `#include <algorithm>
#include <numeric>
#include <vector>
struct FractionalResult { double value; std::vector<double> fractions; };
FractionalResult fractionalKnapsack(const std::vector<int>& weights, const std::vector<int>& values, int capacity) {
    std::vector<int> order(weights.size());
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&](int a, int b) { int left = values[a] * weights[b], right = values[b] * weights[a]; return left != right ? left > right : a < b; }); §sort
    std::vector<double> fractions(weights.size(), 0); double value = 0, remaining = capacity; §init
    for (int i : order) {
        if (remaining <= 0) { §inspect
            break; §stop
        }
        double fraction = std::min(1.0, remaining / weights[i]); §choose
        fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i]; §choose
    }
    return {value, fractions}; §result
}`,
  csharp: `using System;
// Place this method inside a class.
static (double value, double[] fractions) FractionalKnapsack(int[] weights, int[] values, int capacity) {
    int[] order = new int[weights.Length];
    for (int i = 0; i < order.Length; i++) order[i] = i;
    Array.Sort(order, (a, b) => { int difference = (values[b] * weights[a]).CompareTo(values[a] * weights[b]); return difference != 0 ? difference : a.CompareTo(b); }); §sort
    var fractions = new double[weights.Length]; double value = 0, remaining = capacity; §init
    foreach (int i in order) {
        if (remaining <= 0) { §inspect
            break; §stop
        }
        double fraction = Math.Min(1.0, remaining / weights[i]); §choose
        fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i]; §choose
    }
    return (value, fractions); §result
}`,
  go: `import "sort"
type FractionalResult struct { Value float64; Fractions []float64 }
func fractionalKnapsack(weights, values []int, capacity int) FractionalResult {
    order := make([]int, len(weights))
    for i := range order { order[i] = i }
    sort.Slice(order, func(a, b int) bool { i, j := order[a], order[b]; left, right := values[i]*weights[j], values[j]*weights[i]; if left == right { return i < j }; return left > right }) §sort
    fractions := make([]float64, len(weights)); value, remaining := 0.0, float64(capacity) §init
    for _, i := range order {
        if remaining <= 0 { §inspect
            break §stop
        }
        fraction := remaining / float64(weights[i]); if fraction > 1 { fraction = 1 } §choose
        fractions[i] = fraction; value += fraction * float64(values[i]); remaining -= fraction * float64(weights[i]) §choose
    }
    return FractionalResult{value, fractions} §result
}`,
  rust: `struct FractionalResult { value: f64, fractions: Vec<f64> }
fn fractional_knapsack(weights: &[i32], values: &[i32], capacity: i32) -> FractionalResult {
    let mut order: Vec<usize> = (0..weights.len()).collect();
    order.sort_by(|&a, &b| (values[b] * weights[a]).cmp(&(values[a] * weights[b])).then(a.cmp(&b))); §sort
    let mut fractions = vec![0.0; weights.len()]; let mut value = 0.0; let mut remaining = capacity as f64; §init
    for i in order {
        if remaining <= 0.0 { §inspect
            break; §stop
        }
        let fraction = (remaining / weights[i] as f64).min(1.0); §choose
        fractions[i] = fraction; value += fraction * values[i] as f64; remaining -= fraction * weights[i] as f64; §choose
    }
    FractionalResult { value, fractions } §result
}`,
  swift: `func fractionalKnapsack(_ weights: [Int], _ values: [Int], _ capacity: Int) -> (value: Double, fractions: [Double]) {
    let order = weights.indices.sorted { a, b in let left = values[a] * weights[b], right = values[b] * weights[a]; return left != right ? left > right : a < b } §sort
    var fractions = Array(repeating: 0.0, count: weights.count); var value = 0.0; var remaining = Double(capacity) §init
    for i in order {
        if remaining <= 0 { §inspect
            break §stop
        }
        let fraction = min(1.0, remaining / Double(weights[i])) §choose
        fractions[i] = fraction; value += fraction * Double(values[i]); remaining -= fraction * Double(weights[i]) §choose
    }
    return (value, fractions) §result
}`,
});

const changeCodes = codes({
  javascript: `function greedyChange(coins, amount) {
  const order = [...new Set(coins)].sort((a, b) => b - a); §sort
  const selected = []; let count = 0, remaining = amount; §init
  for (const coin of order) {
    const quantity = Math.floor(remaining / coin); §inspect
    if (quantity > 0) {
      selected.push({ coin, count: quantity }); count += quantity; remaining -= coin * quantity; §choose
    } else {
      continue; §skip
    }
  }
  // Greedy need not minimize the count or find an existing combination.
  return { count, remaining, selected }; §result
}`,
  typescript: `function greedyChange(coins: number[], amount: number): { count: number; remaining: number; selected: { coin: number; count: number }[] } {
  const order = [...new Set(coins)].sort((a, b) => b - a); §sort
  const selected: { coin: number; count: number }[] = []; let count = 0, remaining = amount; §init
  for (const coin of order) {
    const quantity = Math.floor(remaining / coin); §inspect
    if (quantity > 0) {
      selected.push({ coin, count: quantity }); count += quantity; remaining -= coin * quantity; §choose
    } else {
      continue; §skip
    }
  }
  // Greedy need not minimize the count or find an existing combination.
  return { count, remaining, selected }; §result
}`,
  python: `def greedy_change(coins, amount):
    order = sorted(set(coins), reverse=True) §sort
    selected = []; count = 0; remaining = amount §init
    for coin in order:
        quantity = remaining // coin §inspect
        if quantity > 0:
            selected.append({"coin": coin, "count": quantity}); count += quantity; remaining -= coin * quantity §choose
        else:
            continue §skip
    # Greedy need not minimize the count or find an existing combination.
    return {"count": count, "remaining": remaining, "selected": selected} §result`,
  java: `import java.util.*;
// Place this method inside a class.
static Map<String, Object> greedyChange(int[] coins, int amount) {
    TreeSet<Integer> order = new TreeSet<>(Collections.reverseOrder());
    for (int coin : coins) order.add(coin); §sort
    List<Map<String, Integer>> selected = new ArrayList<>(); int count = 0, remaining = amount; §init
    for (int coin : order) {
        int quantity = remaining / coin; §inspect
        if (quantity > 0) {
            Map<String, Integer> part = new HashMap<>(); part.put("coin", coin); part.put("count", quantity);
            selected.add(part); count += quantity; remaining -= coin * quantity; §choose
        } else {
            continue; §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    Map<String, Object> result = new HashMap<>();
    result.put("count", count); result.put("remaining", remaining); result.put("selected", selected);
    return result; §result
}`,
  c: `#include <stdlib.h>
typedef struct { int coin, count; } CoinCount;
typedef struct { int count, remaining, size; CoinCount selected[6]; } ChangeResult;
static int descending(const void *a, const void *b) { return *(const int *)b - *(const int *)a; }
/* Demo input: n <= 6; positive, distinct denominations. */
ChangeResult greedy_change(const int *coins, int n, int amount) {
    int order[6]; for (int i = 0; i < n; i++) order[i] = coins[i];
    qsort(order, n, sizeof(int), descending); §sort
    ChangeResult result = {0}; result.remaining = amount; §init
    for (int i = 0; i < n; i++) {
        int coin = order[i], quantity = result.remaining / coin; §inspect
        if (quantity > 0) {
            result.selected[result.size++] = (CoinCount){coin, quantity}; result.count += quantity; result.remaining -= coin * quantity; §choose
        } else {
            continue; §skip
        }
    }
    /* Greedy need not minimize the count or find an existing combination. */
    return result; §result
}`,
  cpp: `#include <functional>
#include <set>
#include <vector>
struct CoinCount { int coin, count; };
struct ChangeResult { int count, remaining; std::vector<CoinCount> selected; };
ChangeResult greedyChange(const std::vector<int>& coins, int amount) {
    std::set<int, std::greater<int>> order(coins.begin(), coins.end()); §sort
    std::vector<CoinCount> selected; int count = 0, remaining = amount; §init
    for (int coin : order) {
        int quantity = remaining / coin; §inspect
        if (quantity > 0) {
            selected.push_back({coin, quantity}); count += quantity; remaining -= coin * quantity; §choose
        } else {
            continue; §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    return {count, remaining, selected}; §result
}`,
  csharp: `using System;
using System.Collections.Generic;
// Place this method inside a class.
static (int count, int remaining, List<(int coin, int count)> selected) GreedyChange(int[] coins, int amount) {
    var order = new SortedSet<int>(coins, Comparer<int>.Create((a, b) => b.CompareTo(a))); §sort
    var selected = new List<(int coin, int count)>(); int count = 0, remaining = amount; §init
    foreach (int coin in order) {
        int quantity = remaining / coin; §inspect
        if (quantity > 0) {
            selected.Add((coin, quantity)); count += quantity; remaining -= coin * quantity; §choose
        } else {
            continue; §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    return (count, remaining, selected); §result
}`,
  go: `import "sort"
type CoinCount struct { Coin, Count int }
type ChangeResult struct { Count, Remaining int; Selected []CoinCount }
func greedyChange(coins []int, amount int) ChangeResult {
    order := append([]int{}, coins...)
    sort.Sort(sort.Reverse(sort.IntSlice(order))) §sort
    selected := []CoinCount{}; count, remaining := 0, amount §init
    for _, coin := range order {
        quantity := remaining / coin §inspect
        if quantity > 0 {
            selected = append(selected, CoinCount{coin, quantity}); count += quantity; remaining -= coin * quantity §choose
        } else {
            continue §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    return ChangeResult{count, remaining, selected} §result
}`,
  rust: `struct CoinCount { coin: i32, count: i32 }
struct ChangeResult { count: i32, remaining: i32, selected: Vec<CoinCount> }
fn greedy_change(coins: &[i32], amount: i32) -> ChangeResult {
    let mut order = coins.to_vec();
    order.sort_by(|a, b| b.cmp(a)); order.dedup(); §sort
    let mut selected = Vec::new(); let mut count = 0; let mut remaining = amount; §init
    for coin in order {
        let quantity = remaining / coin; §inspect
        if quantity > 0 {
            selected.push(CoinCount { coin, count: quantity }); count += quantity; remaining -= coin * quantity; §choose
        } else {
            continue; §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    ChangeResult { count, remaining, selected } §result
}`,
  swift: `func greedyChange(_ coins: [Int], _ amount: Int) -> (count: Int, remaining: Int, selected: [(coin: Int, count: Int)]) {
    let order = Set(coins).sorted(by: >) §sort
    var selected: [(coin: Int, count: Int)] = []; var count = 0; var remaining = amount §init
    for coin in order {
        let quantity = remaining / coin §inspect
        if quantity > 0 {
            selected.append((coin, quantity)); count += quantity; remaining -= coin * quantity §choose
        } else {
            continue §skip
        }
    }
    // Greedy need not minimize the count or find an existing combination.
    return (count, remaining, selected) §result
}`,
});

function tableTrace(matrix, rowLabels, columnLabels, rowLabelsEn, columnLabelsEn) {
  const steps = [];
  function emit(tag, description, descriptionEn, { active = [], secondary = [], path = [], metrics = {}, note = '', noteEn = '', matrixEn = matrix } = {}) {
    steps.push({ tag, description, descriptionEn, state: {
      type: 'table', matrix: matrix.map(row => [...row]), matrixEn: matrixEn.map(row => [...row]),
      rowLabels: [...rowLabels], columnLabels: [...columnLabels], rowLabelsEn: [...rowLabelsEn], columnLabelsEn: [...columnLabelsEn],
      active: active.map(cell => [...cell]), secondary: secondary.map(cell => [...cell]), path: path.map(cell => [...cell]),
      metrics: { ...metrics }, note, noteEn,
    } });
  }
  return { steps, emit };
}

const clamp = (value, minimum, maximum, fallback) => Number.isFinite(Number(value)) ? Math.min(maximum, Math.max(minimum, Math.floor(Number(value)))) : fallback;
const rounded = number => Math.round(number * 10000) / 10000;
const label = (index, english = false) => `${english ? 'Item' : '物品'} ${index + 1}`;

function activityBuild(input = {}) {
  const starts = Array.isArray(input.starts) ? input.starts : [1, 3, 0, 5, 8, 5];
  const ends = Array.isArray(input.ends) ? input.ends : [2, 4, 6, 7, 9, 9];
  const items = starts.slice(0, Math.min(8, ends.length)).map((start, index) => ({ start: Number(start), end: Number(ends[index]), index }));
  items.sort((a, b) => a.end - b.end || a.index - b.index);
  const matrix = items.map(item => [item.start, item.end, '待检查']);
  const matrixEn = items.map(item => [item.start, item.end, 'pending']);
  const { steps, emit } = tableTrace(matrix, items.map(item => `活动 ${item.index + 1}`), ['开始', '结束', '状态'], items.map(item => `Activity ${item.index + 1}`), ['Start', 'End', 'Status']);
  const selected = [], path = [];
  let lastEnd = -1;
  const emitRow = (tag, zh, en, active = []) => emit(tag, zh, en, { active, path, matrixEn, metrics: { selected: selected.length }, note: lastEnd < 0 ? '尚未选择活动' : `上次结束：${lastEnd}`, noteEn: lastEnd < 0 ? 'No activity selected yet' : `Last end: ${lastEnd}` });
  emitRow('sort', '按结束时间升序排列活动；结束时间相同时保留原始次序。', 'Sort activities by finish time, keeping their original order on ties.');
  emitRow('init', '初始化空选择集合。每次优先选择最早结束的兼容活动。', 'Start with no selected activities. Always prefer the compatible activity that finishes earliest.');
  for (let row = 0; row < items.length; row++) {
    const item = items[row];
    emitRow('inspect', `检查活动 ${item.index + 1}：开始 ${item.start} 是否不早于上次结束 ${lastEnd < 0 ? '（无）' : lastEnd}？`, `Check activity ${item.index + 1}: does start ${item.start} come at or after the last end ${lastEnd < 0 ? '(none)' : lastEnd}?`, [[row, 0], [row, 1]]);
    if (item.start >= lastEnd) {
      selected.push(item.index); lastEnd = item.end;
      matrix[row][2] = '选择'; matrixEn[row][2] = 'selected'; path.push([row, 2]);
      emitRow('choose', `选择活动 ${item.index + 1}，将结束边界更新为 ${lastEnd}。`, `Select activity ${item.index + 1} and move the finish boundary to ${lastEnd}.`, [[row, 2]]);
    } else {
      matrix[row][2] = '跳过'; matrixEn[row][2] = 'skipped';
      emitRow('skip', `活动 ${item.index + 1} 与已选活动重叠，跳过。`, `Activity ${item.index + 1} overlaps a selected activity; skip it.`, [[row, 2]]);
    }
  }
  emitRow('result', `共选择 ${selected.length} 个互不重叠的活动。最早结束优先策略保证活动数量最多。`, `Selected ${selected.length} non-overlapping activities. Choosing the earliest finish guarantees the maximum number of activities.`);
  return { steps, result: { selected, count: selected.length } };
}

function fractionalBuild(input = {}) {
  const weights = (Array.isArray(input.weights) ? input.weights : [10, 20, 30]).slice(0, 6);
  const values = (Array.isArray(input.values) ? input.values : [60, 100, 120]).slice(0, weights.length);
  const capacity = clamp(input.capacity ?? 50, 0, 100, 50);
  const order = weights.map((_, index) => index).sort((a, b) => values[b] / weights[b] - values[a] / weights[a] || a - b);
  const matrix = order.map(i => [weights[i], values[i], rounded(values[i] / weights[i]), 0]);
  const { steps, emit } = tableTrace(matrix, order.map(i => label(i)), ['重量', '价值', '价值 / 重量', '选取比例'], order.map(i => label(i, true)), ['Weight', 'Value', 'Value / weight', 'Fraction']);
  const fractions = weights.map(() => 0), path = [];
  let value = 0, remaining = capacity;
  const emitRow = (tag, zh, en, active = []) => emit(tag, zh, en, { active, path, metrics: { totalValue: rounded(value), remaining: rounded(remaining) }, note: `剩余容量：${rounded(remaining)} / ${capacity}；物品可分割`, noteEn: `Capacity left: ${rounded(remaining)} / ${capacity}; items are divisible` });
  emitRow('sort', '按单位重量的价值从高到低排列，优先选取价值密度最高的物品。', 'Sort by decreasing value per unit weight, preferring the highest-value density.');
  emitRow('init', `初始化剩余容量 ${capacity} 和总价值 0。每件物品允许只取一部分。`, `Initialize capacity ${capacity} and total value 0. Any item may be taken in part.`);
  for (let row = 0; row < order.length; row++) {
    const i = order[row];
    emitRow('inspect', `检查剩余容量 ${rounded(remaining)}，准备处理物品 ${i + 1}。`, `Check remaining capacity ${rounded(remaining)} before processing item ${i + 1}.`, [[row, 2]]);
    if (remaining <= 0) {
      emitRow('stop', '背包已满，停止选择物品。', 'The knapsack is full; stop selecting items.', [[row, 3]]);
      break;
    }
    const fraction = Math.min(1, remaining / weights[i]);
    fractions[i] = fraction; value += fraction * values[i]; remaining -= fraction * weights[i];
    matrix[row][3] = rounded(fraction); path.push([row, 3]);
    emitRow('choose', `取物品 ${i + 1} 的 ${rounded(fraction * 100)}%，增加价值 ${rounded(fraction * values[i])}，总价值 ${rounded(value)}。`, `Take ${rounded(fraction * 100)}% of item ${i + 1}, adding value ${rounded(fraction * values[i])}; total value is ${rounded(value)}.`, [[row, 3]]);
  }
  emitRow('result', `最大总价值为 ${rounded(value)}。此贪心策略适用于可分割背包，不能用于 0/1 背包。`, `The maximum total value is ${rounded(value)}. This greedy strategy applies to divisible items, not to the 0/1 knapsack.`);
  return { steps, result: { value, fractions } };
}

const changeCaveat = '贪心策略不保证最少硬币；留下余数也不代表不存在其他组合。';
const changeCaveatEn = 'Greedy does not guarantee the fewest coins; a remainder does not prove that no other combination exists.';

function changeBuild(input = {}) {
  const coins = [...new Set((Array.isArray(input.coins) ? input.coins : [1, 5, 10, 25]).map(Number).filter(coin => Number.isInteger(coin) && coin >= 1 && coin <= 50))].slice(0, 6).sort((a, b) => b - a);
  const amount = clamp(input.amount ?? 63, 0, 100, 63);
  const matrix = coins.map(coin => [coin, 0, '·']);
  const { steps, emit } = tableTrace(matrix, coins.map(coin => `面值 ${coin}`), ['面值', '数量', '剩余金额'], coins.map(coin => `Coin ${coin}`), ['Coin', 'Count', 'Remainder']);
  const selected = [], path = [];
  let count = 0, remaining = amount;
  const emitRow = (tag, zh, en, active = []) => emit(tag, zh, en, { active, path, metrics: { coins: count, remaining }, note: changeCaveat, noteEn: changeCaveatEn });
  emitRow('sort', '按面值从大到小排列硬币，尽可能先使用最大面值。', 'Sort denominations from largest to smallest, always trying the largest coin first.');
  emitRow('init', `初始化金额 ${amount} 和硬币数量 0。这是局部选择的演示，不保证最优。`, `Initialize amount ${amount} and coin count 0. This demonstrates local choices without an optimality guarantee.`);
  for (let row = 0; row < coins.length; row++) {
    const coin = coins[row], quantity = Math.floor(remaining / coin);
    emitRow('inspect', `剩余 ${remaining}：面值 ${coin} 最多可取 ${quantity} 枚。`, `With ${remaining} remaining, take at most ${quantity} coin(s) of denomination ${coin}.`, [[row, 0]]);
    if (quantity > 0) {
      selected.push({ coin, count: quantity }); count += quantity; remaining -= coin * quantity;
      matrix[row][1] = quantity; matrix[row][2] = remaining; path.push([row, 1]);
      emitRow('choose', `选择 ${quantity} 枚面值 ${coin}，累计 ${count} 枚，剩余 ${remaining}。`, `Choose ${quantity} coin(s) of ${coin}; used ${count} coins in total with ${remaining} remaining.`, [[row, 1], [row, 2]]);
    } else {
      matrix[row][2] = remaining;
      emitRow('skip', `面值 ${coin} 大于剩余金额 ${remaining}，跳过。`, `Denomination ${coin} exceeds the remaining amount ${remaining}; skip it.`, [[row, 2]]);
    }
  }
  emitRow('result', remaining === 0 ? `贪心方案用了 ${count} 枚硬币。${changeCaveat}例如 [1, 3, 4] 凑 6，贪心用 3 枚，而 3 + 3 只需 2 枚。` : `贪心方案用了 ${count} 枚，尚余 ${remaining}，未凑齐金额。${changeCaveat}`, remaining === 0 ? `Greedy used ${count} coins. ${changeCaveatEn} For [1, 3, 4] and amount 6, greedy uses 3 coins while 3 + 3 uses only 2.` : `Greedy used ${count} coins and left ${remaining} unpaid. ${changeCaveatEn}`);
  return { steps, result: { count, remaining, selected } };
}

export const greedyAlgorithms = [
  {
    id: 'activity-selection', name: '活动选择', nameEn: 'Activity Selection', category: 'greedy',
    summary: '每次选择最早结束的兼容活动，得到数量最多的不重叠活动集合。',
    summaryEn: 'Choose the earliest-finishing compatible activity to maximize the number of non-overlapping activities.',
    complexity: { time: 'O(n log n)', space: 'O(n)' }, kind: 'table', inputType: 'activities',
    defaults: { starts: [1, 3, 0, 5, 8, 5], ends: [2, 4, 6, 7, 9, 9] }, build: activityBuild, codes: activityCodes,
  },
  {
    id: 'fractional-knapsack', name: '分数背包', nameEn: 'Fractional Knapsack', category: 'greedy',
    summary: '物品可分割时，按单位重量的价值优先选择，求容量限制内的最大价值。',
    summaryEn: 'For divisible items, take the highest value per unit weight first to maximize value within capacity.',
    complexity: { time: 'O(n log n)', space: 'O(n)' }, kind: 'table', inputType: 'fractional',
    defaults: { weights: [10, 20, 30], values: [60, 100, 120], capacity: 50 }, build: fractionalBuild, codes: fractionalCodes,
  },
  {
    id: 'greedy-change', name: '贪心找零', nameEn: 'Greedy Coin Change', category: 'greedy',
    summary: '每次尽量使用最大面值，观察局部选择；对任意面值不保证最少硬币或凑齐金额。',
    summaryEn: 'Take the largest denomination first and observe local choices. Arbitrary denominations may yield too many coins or a remainder.',
    complexity: { time: 'O(k log k)', space: 'O(k)' }, kind: 'table', inputType: 'greedy-coins',
    defaults: { coins: [1, 5, 10, 25], amount: 63 }, build: changeBuild, codes: changeCodes,
  },
];
