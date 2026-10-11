const DEFAULT_VALUES = [4, 8, 12, 19, 23, 31, 38, 44, 57, 65];

// The markers belong to the authoring format, not to the displayed program.
// Keeping markers on operations makes line highlighting survive code edits.
function annotated(raw) {
  const tags = {};
  const source = raw.trim().split('\n').map((line, index) =>
    line.replace(/\[\[(\w+)\]\]/g, (_, tag) => {
      (tags[tag] ||= []).push(index + 1);
      return '';
    })
  ).join('\n');
  return { source, tags };
}

// Name execution sites independently: a left-boundary update never highlights
// the mutually exclusive right-boundary update, nor another loop's comparison.
function siteAnnotations(raw, algorithm) {
  const sites = {
    binary: { move: ['moveLeft', 'moveRight'] },
    jump: {
      compare: ['blockCompare', 'scanCompare'],
      move: ['moveBlock', 'moveBlock', 'moveScan'],
    },
    interpolation: {
      compare: ['uniformCompare', 'compare'],
      move: ['moveLeft', 'moveRight'],
      found: ['uniformFound', 'found'],
      missing: ['missingUniform', 'missing'],
    },
    exponential: {
      compare: ['firstCompare', 'probeCompare', 'compare'],
      move: ['grow', 'startBinary', 'moveLeft', 'moveRight'],
      found: ['firstFound', 'found'],
      missing: ['missingEmpty', 'missing'],
    },
  }[algorithm] ?? {};
  const counts = {};
  return annotated(raw.replace(/\[\[(\w+)\]\]/g, (marker, tag) => {
    if (!sites[tag]) return marker;
    const index = counts[tag] ?? 0;
    counts[tag] = index + 1;
    if (!sites[tag][index]) throw new Error(`Unmapped search code site: ${algorithm}/${tag}/${index}`);
    return `[[${sites[tag][index]}]]`;
  }));
}

function prepare(input = {}, sort = false) {
  const values = (Array.isArray(input.values) ? input.values : DEFAULT_VALUES)
    .slice(0, 18).map(Number);
  if (sort) values.sort((a, b) => a - b);
  const target = Number(input.target ?? 31);
  const steps = [];
  let comparisons = 0;
  function step(tag, description, options = {}) {
    if (tag === 'compare' || tag.endsWith('Compare')) comparisons++;
    steps.push({
      tag,
      description,
      state: {
        type: 'array', values: [...values], active: [], secondary: [], sorted: [],
        target, ...options, metrics: { comparisons },
      },
    });
  }
  function finish(index, tag = index >= 0 ? 'found' : 'missing') {
    if (index >= 0) {
      step(tag, `找到目标 ${target}，在当前展示数组中的下标为 ${index}。`,
        { active: [index], sorted: [index], found: index });
    } else {
      step(tag, `搜索完成，数组中没有目标 ${target}。`, { found: -1 });
    }
    return { steps, result: index };
  }
  return { values, target, step, finish };
}

function linear(input) {
  const { values, target, step, finish } = prepare(input);
  step('init', `保留输入顺序，从下标 0 开始逐个寻找 ${target}。`);
  for (let i = 0; i < values.length; i++) {
    step('compare', `比较下标 ${i} 的值 ${values[i]} 与目标 ${target}。`, { active: [i] });
    if (values[i] === target) return finish(i);
    step('move', `${values[i]} 不是目标，继续检查下一个元素。`, { secondary: [i] });
  }
  return finish(-1);
}

function binary(input) {
  const { values, target, step, finish } = prepare(input, true);
  let left = 0, right = values.length - 1;
  step('init', `将输入副本升序排列，在有序数组中二分寻找 ${target}。`, { range: [left, right] });
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    step('compare', `区间 [${left}, ${right}] 的中点 ${mid}：比较 ${values[mid]} 与 ${target}。`,
      { active: [mid], secondary: [...new Set([left, right])], range: [left, right] });
    if (values[mid] === target) return finish(mid);
    if (values[mid] < target) {
      left = mid + 1;
      step('moveLeft', `${values[mid]} 小于目标，保留右半区间 [${left}, ${right}]。`, { range: [left, right] });
    } else {
      right = mid - 1;
      step('moveRight', `${values[mid]} 大于目标，保留左半区间 [${left}, ${right}]。`, { range: [left, right] });
    }
  }
  return finish(-1);
}

function jump(input) {
  const { values, target, step, finish } = prepare(input, true);
  const n = values.length, block = Math.max(1, Math.floor(Math.sqrt(n)));
  let start = 0, end = Math.min(block, n);
  step('init', `将输入副本升序排列，按 ${block} 个元素一组跳跃寻找 ${target}。`);
  while (start < n) {
    step('blockCompare', `检查当前块末尾下标 ${end - 1} 的值 ${values[end - 1]}。`,
      { active: [end - 1], secondary: [start], range: [start, end - 1] });
    if (values[end - 1] >= target) break;
    start = end;
    end = Math.min(end + block, n);
    step('moveBlock', `目标更大，跳到下一块 [${start}, ${end - 1}]。`, { range: [start, end - 1] });
  }
  for (let i = start; i < end; i++) {
    step('scanCompare', `在候选块内逐个比较：下标 ${i} 的值为 ${values[i]}。`,
      { active: [i], range: [start, end - 1] });
    if (values[i] === target) return finish(i);
    step('moveScan', `${values[i]} 不是目标，继续检查块内下一个元素。`, { secondary: [i], range: [start, end - 1] });
  }
  return finish(-1);
}

function interpolation(input) {
  const { values, target, step, finish } = prepare(input, true);
  let left = 0, right = values.length - 1;
  step('init', `将输入副本升序排列，根据目标值估计它的位置。`, { range: [left, right] });
  while (left <= right && target >= values[left] && target <= values[right]) {
    if (values[left] === values[right]) {
      step('uniformCompare', `区间内所有值相同，直接比较 ${values[left]} 与 ${target}。`,
        { active: [left], range: [left, right] });
      return finish(values[left] === target ? left : -1, values[left] === target ? 'uniformFound' : 'missingUniform');
    }
    const pos = left + Math.floor((target - values[left]) * (right - left) / (values[right] - values[left]));
    step('compare', `按值的比例估计下标 ${pos}，比较 ${values[pos]} 与 ${target}。`,
      { active: [pos], secondary: [...new Set([left, right])], range: [left, right] });
    if (values[pos] === target) return finish(pos);
    if (values[pos] < target) {
      left = pos + 1;
      step('moveLeft', `估计值偏小，将左边界移动到 ${left}。`, { range: [left, right] });
    } else {
      right = pos - 1;
      step('moveRight', `估计值偏大，将右边界移动到 ${right}。`, { range: [left, right] });
    }
  }
  return finish(-1);
}

function exponential(input) {
  const { values, target, step, finish } = prepare(input, true);
  const n = values.length;
  step('init', `将输入副本升序排列，先倍增探测边界，再进行二分搜索。`);
  if (!n) return finish(-1, 'missingEmpty');
  step('firstCompare', `先比较第一个值 ${values[0]} 与目标 ${target}。`, { active: [0] });
  if (values[0] === target) return finish(0, 'firstFound');
  let bound = 1;
  while (bound < n) {
    step('probeCompare', `探测下标 ${bound} 的值 ${values[bound]}。`, { active: [bound] });
    if (values[bound] >= target) break;
    bound *= 2;
    step('grow', `探测值小于目标，将边界倍增为 ${bound}。`,
      { range: [Math.floor(bound / 2), Math.min(bound, n - 1)] });
  }
  let left = Math.floor(bound / 2), right = Math.min(bound, n - 1);
  step('startBinary', `确定候选区间 [${left}, ${right}]，开始二分搜索。`, { range: [left, right] });
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    step('compare', `比较候选区间的中点 ${mid}：${values[mid]} 与 ${target}。`,
      { active: [mid], secondary: [...new Set([left, right])], range: [left, right] });
    if (values[mid] === target) return finish(mid);
    if (values[mid] < target) {
      left = mid + 1;
      step('moveLeft', `中点值偏小，将左边界移动到 ${left}。`, { range: [left, right] });
    } else {
      right = mid - 1;
      step('moveRight', `中点值偏大，将右边界移动到 ${right}。`, { range: [left, right] });
    }
  }
  return finish(-1);
}

const javascript = {
  linear: `function linearSearch(values, target) {
  [[init]]const a = [...values];
  let i = 0;
  while (i < a.length) {
    [[compare]]if (a[i] === target) {
      [[found]]return i;
    }
    [[move]]i++;
  }
  [[missing]]return -1;
}`,
  binary: `function binarySearch(values, target) {
  [[init]]const a = [...values].sort((x, y) => x - y);
  let left = 0, right = a.length - 1;
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    [[compare]]if (a[mid] === target) {
      [[found]]return mid;
    }
    [[move]]if (a[mid] < target) left = mid + 1;
    [[move]]else right = mid - 1;
  }
  [[missing]]return -1;
}`,
  jump: `function jumpSearch(values, target) {
  [[init]]const a = [...values].sort((x, y) => x - y);
  const n = a.length, block = Math.max(1, Math.floor(Math.sqrt(n)));
  let start = 0, end = Math.min(block, n);
  while (start < n) {
    [[compare]]if (a[end - 1] >= target) break;
    [[move]]start = end;
    [[move]]end = Math.min(end + block, n);
  }
  let i = start;
  while (i < end) {
    [[compare]]if (a[i] === target) {
      [[found]]return i;
    }
    [[move]]i++;
  }
  [[missing]]return -1;
}`,
  interpolation: `function interpolationSearch(values, target) {
  [[init]]const a = [...values].sort((x, y) => x - y);
  let left = 0, right = a.length - 1;
  while (left <= right && target >= a[left] && target <= a[right]) {
    [[compare]]if (a[left] === a[right]) {
      [[found]]if (a[left] === target) return left;
      [[missing]]return -1;
    }
    const pos = left + Math.floor(
      (target - a[left]) * (right - left) / (a[right] - a[left]));
    [[compare]]if (a[pos] === target) {
      [[found]]return pos;
    }
    [[move]]if (a[pos] < target) left = pos + 1;
    [[move]]else right = pos - 1;
  }
  [[missing]]return -1;
}`,
  exponential: `function exponentialSearch(values, target) {
  [[init]]const a = [...values].sort((x, y) => x - y);
  const n = a.length;
  [[missing]]if (n === 0) return -1;
  [[compare]]if (a[0] === target) {
    [[found]]return 0;
  }
  let bound = 1;
  while (bound < n) {
    [[compare]]if (a[bound] >= target) break;
    [[move]]bound *= 2;
  }
  [[move]]let left = Math.floor(bound / 2), right = Math.min(bound, n - 1);
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    [[compare]]if (a[mid] === target) {
      [[found]]return mid;
    }
    [[move]]if (a[mid] < target) left = mid + 1;
    [[move]]else right = mid - 1;
  }
  [[missing]]return -1;
}`,
};

const python = {
  linear: `def linear_search(values, target):
    [[init]]a = list(values)
    i = 0
    while i < len(a):
        [[compare]]if a[i] == target:
            [[found]]return i
        [[move]]i += 1
    [[missing]]return -1`,
  binary: `def binary_search(values, target):
    [[init]]a = sorted(values)
    left, right = 0, len(a) - 1
    while left <= right:
        mid = left + (right - left) // 2
        [[compare]]if a[mid] == target:
            [[found]]return mid
        if a[mid] < target:
            [[move]]left = mid + 1
        else:
            [[move]]right = mid - 1
    [[missing]]return -1`,
  jump: `from math import isqrt

def jump_search(values, target):
    [[init]]a = sorted(values)
    n = len(a)
    block = max(1, isqrt(n))
    start, end = 0, min(block, n)
    while start < n:
        [[compare]]if a[end - 1] >= target:
            break
        [[move]]start = end
        [[move]]end = min(end + block, n)
    i = start
    while i < end:
        [[compare]]if a[i] == target:
            [[found]]return i
        [[move]]i += 1
    [[missing]]return -1`,
  interpolation: `def interpolation_search(values, target):
    [[init]]a = sorted(values)
    left, right = 0, len(a) - 1
    while left <= right and a[left] <= target <= a[right]:
        [[compare]]if a[left] == a[right]:
            [[found]]if a[left] == target:
                return left
            [[missing]]return -1
        pos = left + (target - a[left]) * (right - left) // (a[right] - a[left])
        [[compare]]if a[pos] == target:
            [[found]]return pos
        if a[pos] < target:
            [[move]]left = pos + 1
        else:
            [[move]]right = pos - 1
    [[missing]]return -1`,
  exponential: `def exponential_search(values, target):
    [[init]]a = sorted(values)
    n = len(a)
    [[missing]]if n == 0:
        return -1
    [[compare]]if a[0] == target:
        [[found]]return 0
    bound = 1
    while bound < n:
        [[compare]]if a[bound] >= target:
            break
        [[move]]bound *= 2
    [[move]]left, right = bound // 2, min(bound, n - 1)
    while left <= right:
        mid = left + (right - left) // 2
        [[compare]]if a[mid] == target:
            [[found]]return mid
        if a[mid] < target:
            [[move]]left = mid + 1
        else:
            [[move]]right = mid - 1
    [[missing]]return -1`,
};

// These templates share control flow, while every generated program uses the
// actual types, copying, sorting, arithmetic, and standard library of its language.
function braceCode(language, algorithm) {
  const snakeName = `${algorithm}_search`;
  const camelName = `${algorithm}Search`;
  const sorted = algorithm !== 'linear';
  const shapes = {
    java: {
      head: `import java.util.Arrays;\n\nclass Search {\nstatic int ${camelName}(int[] values, int target) {`,
      init: 'int[] a = Arrays.copyOf(values, values.length);',
      sort: 'Arrays.sort(a);', size: 'a.length', close: '\n}',
      block: '(int) Math.sqrt(n)', max: 'Math.max', min: 'Math.min',
      pos: 'left + (int) (((double) target - a[left]) * (right - left) / ((double) a[right] - a[left]))',
    },
    csharp: {
      head: `using System;\n\nclass Search {\npublic static int ${camelName}(int[] values, int target) {`,
      init: 'int[] a = (int[]) values.Clone();',
      sort: 'Array.Sort(a);', size: 'a.Length', close: '\n}',
      block: '(int) Math.Sqrt(n)', max: 'Math.Max', min: 'Math.Min',
      pos: 'left + (int) (((double) target - a[left]) * (right - left) / ((double) a[right] - a[left]))',
    },
    cpp: {
      head: `#include <algorithm>\n#include <cmath>\n#include <vector>\n\nint ${camelName}(const std::vector<int>& values, int target) {`,
      init: 'std::vector<int> a = values;',
      sort: 'std::sort(a.begin(), a.end());', size: 'static_cast<int>(a.size())', close: '',
      block: 'static_cast<int>(std::sqrt(n))', max: 'std::max', min: 'std::min',
      pos: 'left + static_cast<int>((static_cast<double>(target) - a[left]) * (right - left) / (static_cast<double>(a[right]) - a[left]))',
    },
    c: {
      head: `#include <stdlib.h>\n#include <math.h>\n\n${sorted ? 'static int compare_ints(const void *x, const void *y) {\n  int a = *(const int *)x, b = *(const int *)y;\n  return (a > b) - (a < b);\n}\n\n' : ''}int ${snakeName}(const int values[], int n, int target) {`,
      init: 'int a[n > 0 ? n : 1];\n  for (int i = 0; i < n; i++) a[i] = values[i];',
      sort: 'qsort(a, (size_t) n, sizeof(int), compare_ints);', size: null, close: '',
      block: '(int) sqrt((double) n)', max: null, min: null,
      pos: 'left + (int) (((double) target - a[left]) * (right - left) / ((double) a[right] - a[left]))',
    },
  };
  const s = shapes[language];
  const min = (x, y) => s.min ? `${s.min}(${x}, ${y})` : `((${x}) < (${y}) ? (${x}) : (${y}))`;
  const init = `  [[init]]${s.init}\n${sorted ? `  [[init]]${s.sort}\n` : ''}${s.size ? `  int n = ${s.size};\n` : ''}`;
  const bodies = {
    linear: `  int i = 0;
  while (i < n) {
    [[compare]]if (a[i] == target) {
      [[found]]return i;
    }
    [[move]]i++;
  }
  [[missing]]return -1;`,
    binary: `  int left = 0, right = n - 1;
  while (left <= right) {
    int mid = left + (right - left) / 2;
    [[compare]]if (a[mid] == target) {
      [[found]]return mid;
    }
    [[move]]if (a[mid] < target) left = mid + 1;
    [[move]]else right = mid - 1;
  }
  [[missing]]return -1;`,
    jump: `  int block = ${s.block};
  if (block < 1) block = 1;
  int start = 0, end = ${min('block', 'n')};
  while (start < n) {
    [[compare]]if (a[end - 1] >= target) break;
    [[move]]start = end;
    [[move]]end = ${min('end + block', 'n')};
  }
  int i = start;
  while (i < end) {
    [[compare]]if (a[i] == target) {
      [[found]]return i;
    }
    [[move]]i++;
  }
  [[missing]]return -1;`,
    interpolation: `  int left = 0, right = n - 1;
  while (left <= right && target >= a[left] && target <= a[right]) {
    [[compare]]if (a[left] == a[right]) {
      [[found]]if (a[left] == target) return left;
      [[missing]]return -1;
    }
    int pos = ${s.pos};
    [[compare]]if (a[pos] == target) {
      [[found]]return pos;
    }
    [[move]]if (a[pos] < target) left = pos + 1;
    [[move]]else right = pos - 1;
  }
  [[missing]]return -1;`,
    exponential: `  [[missing]]if (n == 0) return -1;
  [[compare]]if (a[0] == target) {
    [[found]]return 0;
  }
  int bound = 1;
  while (bound < n) {
    [[compare]]if (a[bound] >= target) break;
    [[move]]bound *= 2;
  }
  [[move]]int left = bound / 2, right = ${min('bound', 'n - 1')};
  while (left <= right) {
    int mid = left + (right - left) / 2;
    [[compare]]if (a[mid] == target) {
      [[found]]return mid;
    }
    [[move]]if (a[mid] < target) left = mid + 1;
    [[move]]else right = mid - 1;
  }
  [[missing]]return -1;`,
  };
  return `${s.head}\n${init}${bodies[algorithm]}\n}${s.close}`;
}

const go = {
  linear: `package main

func linearSearch(values []int, target int) int {
    [[init]]a := append([]int(nil), values...)
    i := 0
    for i < len(a) {
        [[compare]]if a[i] == target {
            [[found]]return i
        }
        [[move]]i++
    }
    [[missing]]return -1
}`,
  binary: `package main

import "sort"

func binarySearch(values []int, target int) int {
    [[init]]a := append([]int(nil), values...)
    [[init]]sort.Ints(a)
    left, right := 0, len(a)-1
    for left <= right {
        mid := left + (right-left)/2
        [[compare]]if a[mid] == target {
            [[found]]return mid
        }
        if a[mid] < target {
            [[move]]left = mid + 1
        } else {
            [[move]]right = mid - 1
        }
    }
    [[missing]]return -1
}`,
  jump: `package main

import (
    "math"
    "sort"
)

func jumpSearch(values []int, target int) int {
    [[init]]a := append([]int(nil), values...)
    [[init]]sort.Ints(a)
    n := len(a)
    block := int(math.Sqrt(float64(n)))
    if block < 1 { block = 1 }
    start, end := 0, block
    if end > n { end = n }
    for start < n {
        [[compare]]if a[end-1] >= target { break }
        [[move]]start = end
        [[move]]end += block
        if end > n { end = n }
    }
    i := start
    for i < end {
        [[compare]]if a[i] == target {
            [[found]]return i
        }
        [[move]]i++
    }
    [[missing]]return -1
}`,
  interpolation: `package main

import "sort"

func interpolationSearch(values []int, target int) int {
    [[init]]a := append([]int(nil), values...)
    [[init]]sort.Ints(a)
    left, right := 0, len(a)-1
    for left <= right && target >= a[left] && target <= a[right] {
        [[compare]]if a[left] == a[right] {
            [[found]]if a[left] == target { return left }
            [[missing]]return -1
        }
        pos := left + int((float64(target)-float64(a[left])) * float64(right-left) /
            (float64(a[right])-float64(a[left])))
        [[compare]]if a[pos] == target {
            [[found]]return pos
        }
        if a[pos] < target {
            [[move]]left = pos + 1
        } else {
            [[move]]right = pos - 1
        }
    }
    [[missing]]return -1
}`,
  exponential: `package main

import "sort"

func exponentialSearch(values []int, target int) int {
    [[init]]a := append([]int(nil), values...)
    [[init]]sort.Ints(a)
    n := len(a)
    [[missing]]if n == 0 { return -1 }
    [[compare]]if a[0] == target {
        [[found]]return 0
    }
    bound := 1
    for bound < n {
        [[compare]]if a[bound] >= target { break }
        [[move]]bound *= 2
    }
    [[move]]left, right := bound/2, bound
    if right >= n { right = n-1 }
    for left <= right {
        mid := left + (right-left)/2
        [[compare]]if a[mid] == target {
            [[found]]return mid
        }
        if a[mid] < target {
            [[move]]left = mid + 1
        } else {
            [[move]]right = mid - 1
        }
    }
    [[missing]]return -1
}`,
};

const rust = {
  linear: `fn linear_search(values: &[i32], target: i32) -> isize {
    [[init]]let a = values.to_vec();
    let mut i = 0;
    while i < a.len() {
        [[compare]]if a[i] == target {
            [[found]]return i as isize;
        }
        [[move]]i += 1;
    }
    [[missing]]-1
}`,
  binary: `fn binary_search(values: &[i32], target: i32) -> isize {
    [[init]]let mut a = values.to_vec();
    [[init]]a.sort_unstable();
    let (mut left, mut right) = (0_isize, a.len() as isize - 1);
    while left <= right {
        let mid = (left + (right - left) / 2) as usize;
        [[compare]]if a[mid] == target {
            [[found]]return mid as isize;
        }
        if a[mid] < target {
            [[move]]left = mid as isize + 1;
        } else {
            [[move]]right = mid as isize - 1;
        }
    }
    [[missing]]-1
}`,
  jump: `fn jump_search(values: &[i32], target: i32) -> isize {
    [[init]]let mut a = values.to_vec();
    [[init]]a.sort_unstable();
    let n = a.len();
    let block = ((n as f64).sqrt() as usize).max(1);
    let (mut start, mut end) = (0, block.min(n));
    while start < n {
        [[compare]]if a[end - 1] >= target { break; }
        [[move]]start = end;
        [[move]]end = (end + block).min(n);
    }
    let mut i = start;
    while i < end {
        [[compare]]if a[i] == target {
            [[found]]return i as isize;
        }
        [[move]]i += 1;
    }
    [[missing]]-1
}`,
  interpolation: `fn interpolation_search(values: &[i32], target: i32) -> isize {
    [[init]]let mut a = values.to_vec();
    [[init]]a.sort_unstable();
    let (mut left, mut right) = (0_isize, a.len() as isize - 1);
    while left <= right && target >= a[left as usize] && target <= a[right as usize] {
        let (lo, hi) = (left as usize, right as usize);
        [[compare]]if a[lo] == a[hi] {
            [[found]]if a[lo] == target { return left; }
            [[missing]]return -1;
        }
        let pos = lo + (((target as f64 - a[lo] as f64) * (right - left) as f64) /
            (a[hi] as f64 - a[lo] as f64)) as usize;
        [[compare]]if a[pos] == target {
            [[found]]return pos as isize;
        }
        if a[pos] < target {
            [[move]]left = pos as isize + 1;
        } else {
            [[move]]right = pos as isize - 1;
        }
    }
    [[missing]]-1
}`,
  exponential: `fn exponential_search(values: &[i32], target: i32) -> isize {
    [[init]]let mut a = values.to_vec();
    [[init]]a.sort_unstable();
    let n = a.len();
    [[missing]]if n == 0 { return -1; }
    [[compare]]if a[0] == target {
        [[found]]return 0;
    }
    let mut bound = 1;
    while bound < n {
        [[compare]]if a[bound] >= target { break; }
        [[move]]bound *= 2;
    }
    [[move]]let (mut left, mut right) = ((bound / 2) as isize, bound.min(n - 1) as isize);
    while left <= right {
        let mid = (left + (right - left) / 2) as usize;
        [[compare]]if a[mid] == target {
            [[found]]return mid as isize;
        }
        if a[mid] < target {
            [[move]]left = mid as isize + 1;
        } else {
            [[move]]right = mid as isize - 1;
        }
    }
    [[missing]]-1
}`,
};

const swift = {
  linear: `func linearSearch(_ values: [Int], target: Int) -> Int {
    [[init]]let a = values
    var i = 0
    while i < a.count {
        [[compare]]if a[i] == target {
            [[found]]return i
        }
        [[move]]i += 1
    }
    [[missing]]return -1
}`,
  binary: `func binarySearch(_ values: [Int], target: Int) -> Int {
    [[init]]let a = values.sorted()
    var left = 0, right = a.count - 1
    while left <= right {
        let mid = left + (right - left) / 2
        [[compare]]if a[mid] == target {
            [[found]]return mid
        }
        if a[mid] < target {
            [[move]]left = mid + 1
        } else {
            [[move]]right = mid - 1
        }
    }
    [[missing]]return -1
}`,
  jump: `func jumpSearch(_ values: [Int], target: Int) -> Int {
    [[init]]let a = values.sorted()
    let n = a.count
    let block = max(1, Int(Double(n).squareRoot()))
    var start = 0, end = min(block, n)
    while start < n {
        [[compare]]if a[end - 1] >= target { break }
        [[move]]start = end
        [[move]]end = min(end + block, n)
    }
    var i = start
    while i < end {
        [[compare]]if a[i] == target {
            [[found]]return i
        }
        [[move]]i += 1
    }
    [[missing]]return -1
}`,
  interpolation: `func interpolationSearch(_ values: [Int], target: Int) -> Int {
    [[init]]let a = values.sorted()
    var left = 0, right = a.count - 1
    while left <= right && target >= a[left] && target <= a[right] {
        [[compare]]if a[left] == a[right] {
            [[found]]if a[left] == target { return left }
            [[missing]]return -1
        }
        let pos = left + Int((Double(target) - Double(a[left])) * Double(right - left) /
            (Double(a[right]) - Double(a[left])))
        [[compare]]if a[pos] == target {
            [[found]]return pos
        }
        if a[pos] < target {
            [[move]]left = pos + 1
        } else {
            [[move]]right = pos - 1
        }
    }
    [[missing]]return -1
}`,
  exponential: `func exponentialSearch(_ values: [Int], target: Int) -> Int {
    [[init]]let a = values.sorted()
    let n = a.count
    [[missing]]if n == 0 { return -1 }
    [[compare]]if a[0] == target {
        [[found]]return 0
    }
    var bound = 1
    while bound < n {
        [[compare]]if a[bound] >= target { break }
        [[move]]bound *= 2
    }
    [[move]]var left = bound / 2, right = min(bound, n - 1)
    while left <= right {
        let mid = left + (right - left) / 2
        [[compare]]if a[mid] == target {
            [[found]]return mid
        }
        if a[mid] < target {
            [[move]]left = mid + 1
        } else {
            [[move]]right = mid - 1
        }
    }
    [[missing]]return -1
}`,
};

function codesFor(id) {
  const mark = raw => siteAnnotations(raw, id);
  return {
    javascript: mark(javascript[id]),
    typescript: mark(javascript[id].replace(
      '(values, target)', '(values: number[], target: number): number')),
    python: mark(python[id]),
    java: mark(braceCode('java', id)),
    c: mark(braceCode('c', id)),
    cpp: mark(braceCode('cpp', id)),
    csharp: mark(braceCode('csharp', id)),
    go: mark(go[id]),
    rust: mark(rust[id]),
    swift: mark(swift[id]),
  };
}

const definitions = [
  {
    id: 'linear', name: '顺序搜索', nameEn: 'Linear Search',
    summary: '按输入顺序逐个检查元素，适用于任何数组，无需预先排序。',
    complexity: { time: 'O(n)', space: 'O(1)' }, build: linear,
  },
  {
    id: 'binary', name: '二分搜索', nameEn: 'Binary Search',
    summary: '每次检查有序区间的中点，并排除不可能包含目标的一半。演示先排序副本。',
    complexity: { time: 'O(log n)', space: 'O(1)' }, build: binary,
  },
  {
    id: 'jump', name: '跳跃搜索', nameEn: 'Jump Search',
    summary: '在有序数组上按 √n 大小的块跳跃，再在候选块内逐个查找。',
    complexity: { time: 'O(√n)', space: 'O(1)' }, build: jump,
  },
  {
    id: 'interpolation', name: '插值搜索', nameEn: 'Interpolation Search',
    summary: '根据目标值在两端数值之间的比例估计下标，适合分布均匀的有序数据。',
    complexity: { time: '平均 O(log log n) · 最坏 O(n)', space: 'O(1)' }, build: interpolation,
  },
  {
    id: 'exponential', name: '指数搜索', nameEn: 'Exponential Search',
    summary: '以 1、2、4、8 的倍增下标确定候选区间，再使用二分搜索。',
    complexity: { time: 'O(log n)', space: 'O(1)' }, build: exponential,
  },
];

export const searchAlgorithms = definitions.map(definition => ({
  ...definition,
  category: 'searching',
  kind: 'array',
  inputType: 'search',
  defaults: { values: [...DEFAULT_VALUES], target: 31 },
  codes: codesFor(definition.id),
}));
