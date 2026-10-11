// Source annotations are stripped after recording their 1-based display lines.
function annotated(source) {
  const tags = {};
  const lines = source.trim().split('\n').map((line, index) =>
    line.replace(/§([a-z,]+)§/g, (_, names) => {
      for (const name of names.split(',')) (tags[name] ??= []).push(index + 1);
      return '';
    }),
  );
  return { source: lines.join('\n'), tags };
}

function sources(templates) {
  return Object.fromEntries(Object.entries(templates).map(([language, source]) => [language, annotated(source)]));
}

function recorder(input) {
  const values = [...input.values];
  const steps = [];
  const metrics = { comparisons: 0, writes: 0 };
  function emit(tag, description, options = {}) {
    steps.push({ tag, description, state: {
      type: 'array', values: [...values], active: [...(options.active ?? [])],
      secondary: [...(options.secondary ?? [])], sorted: [...(options.sorted ?? [])],
      ...(options.aux ? { aux: options.aux.map(row => ({ label: row.label, values: [...row.values] })) } : {}),
      metrics: { ...metrics },
    } });
  }
  const finish = () => {
    emit('done', '排序完成：所有元素已按从小到大的顺序排列。', { sorted: values.map((_, i) => i) });
    return { steps, result: [...values] };
  };
  return { values, steps, metrics, emit, finish };
}

function bubble(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  const sorted = [];
  emit('init', '从数组左端开始，比较相邻元素。');
  for (let end = a.length - 1; end > 0; end--) {
    for (let j = 0; j < end; j++) {
      metrics.comparisons++;
      emit('compare', `比较 ${a[j]} 和 ${a[j + 1]}。`, { active: [j, j + 1], sorted });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        metrics.writes += 2;
        emit('swap', '交换相邻元素，将较大的元素向右移动。', { active: [j, j + 1], sorted });
      }
    }
    sorted.push(end);
    emit('settled', `本轮最大值 ${a[end]} 已到达最终位置。`, { active: [end], sorted });
  }
  return finish();
}

function selection(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  const sorted = [];
  emit('init', '每轮在未排序部分选择最小元素。');
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    emit('select', `先将 ${a[min]} 作为本轮最小值。`, { active: [i], secondary: [min], sorted });
    for (let j = i + 1; j < a.length; j++) {
      metrics.comparisons++;
      emit('compare', `比较候选值 ${a[j]} 与当前最小值 ${a[min]}。`, { active: [j], secondary: [min], sorted });
      if (a[j] < a[min]) {
        min = j;
        emit('minimum', `更新最小值为 ${a[min]}。`, { active: [j], secondary: [min], sorted });
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      metrics.writes += 2;
      emit('swap', '将最小元素放到未排序部分的起点。', { active: [i, min], sorted });
    }
    sorted.push(i);
    emit('settled', `位置 ${i + 1} 已确定。`, { active: [i], sorted });
  }
  return finish();
}

function insertion(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  emit('init', '将第一个元素视为有序区，依次插入后续元素。', { sorted: a.length ? [0] : [] });
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    const sorted = Array.from({ length: i }, (_, index) => index);
    const aux = [{ label: '待插入值', values: [key] }];
    emit('key', `取出 ${key}，寻找它在有序区的位置。`, { active: [i], sorted, aux });
    while (j >= 0) {
      metrics.comparisons++;
      emit('compare', `比较 ${a[j]} 与待插入值 ${key}。`, { active: [j], secondary: [j + 1], sorted, aux });
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      metrics.writes++;
      emit('shift', `将 ${a[j]} 向右移动一格。`, { active: [j, j + 1], aux });
      j--;
    }
    a[j + 1] = key;
    metrics.writes++;
    emit('insert', `将 ${key} 插入位置 ${j + 2}。`, { active: [j + 1], sorted: [...sorted, i], aux });
  }
  return finish();
}

function merge(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  emit('init', '递归拆分数组，再合并两个有序子数组。');
  function sort(lo, hi) {
    if (hi - lo <= 1) return;
    const mid = Math.floor((lo + hi) / 2);
    emit('divide', `将位置 ${lo + 1}–${hi} 分成两个子数组。`, {
      active: Array.from({ length: mid - lo }, (_, i) => lo + i),
      secondary: Array.from({ length: hi - mid }, (_, i) => mid + i),
    });
    sort(lo, mid);
    sort(mid, hi);
    const left = a.slice(lo, mid), right = a.slice(mid, hi);
    const aux = [{ label: '左子数组', values: left }, { label: '右子数组', values: right }];
    emit('copy', '复制两个有序子数组，准备合并。', { active: [lo], secondary: [mid], aux });
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      metrics.comparisons++;
      emit('compare', `比较左侧 ${left[i]} 和右侧 ${right[j]}。`, { active: [lo + i], secondary: [mid + j], aux });
      const fromLeft = left[i] <= right[j];
      a[k] = fromLeft ? left[i++] : right[j++];
      metrics.writes++;
      emit(fromLeft ? 'writeleft' : 'writeright', `将较小值 ${a[k]} 写入位置 ${k + 1}。`, { active: [k], aux });
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++]; metrics.writes++;
      emit('remainleft', `写入左侧剩余元素 ${a[k]}。`, { active: [k], aux }); k++;
    }
    while (j < right.length) {
      a[k] = right[j++]; metrics.writes++;
      emit('remainright', `写入右侧剩余元素 ${a[k]}。`, { active: [k], aux }); k++;
    }
  }
  sort(0, a.length);
  return finish();
}

function quick(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  const sorted = new Set();
  emit('init', '选择末尾元素作为基准，递归划分数组。');
  function sort(lo, hi) {
    if (lo >= hi) { if (lo === hi) sorted.add(lo); return; }
    const pivot = a[hi];
    let i = lo - 1;
    emit('pivot', `选择 ${pivot} 作为基准值。`, { active: [hi], sorted: [...sorted] });
    for (let j = lo; j < hi; j++) {
      metrics.comparisons++;
      emit('compare', `比较 ${a[j]} 与基准 ${pivot}。`, { active: [j], secondary: [hi], sorted: [...sorted] });
      if (a[j] <= pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        metrics.writes += 2;
        emit('swap', '将不大于基准的元素移入左分区。', { active: [i, j], secondary: [hi], sorted: [...sorted] });
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    metrics.writes += 2;
    sorted.add(i + 1);
    emit('place', `基准 ${pivot} 到达最终位置 ${i + 2}。`, { active: [i + 1, hi], sorted: [...sorted] });
    sort(lo, i); sort(i + 2, hi);
  }
  sort(0, a.length - 1);
  return finish();
}

function heap(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  const sorted = [];
  emit('init', '将数组构造成最大堆，依次取出最大元素。');
  function sift(n, root) {
    let largest = root;
    const left = root * 2 + 1, right = left + 1;
    if (left < n) {
      metrics.comparisons++;
      emit('compareleft', `比较父节点 ${a[largest]} 与左子节点 ${a[left]}。`, { active: [largest, left], sorted });
      if (a[left] > a[largest]) largest = left;
    }
    if (right < n) {
      metrics.comparisons++;
      emit('compareright', `比较当前最大值 ${a[largest]} 与右子节点 ${a[right]}。`, { active: [largest, right], sorted });
      if (a[right] > a[largest]) largest = right;
    }
    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]];
      metrics.writes += 2;
      emit('swap', '交换父子节点，维护最大堆。', { active: [root, largest], sorted });
      sift(n, largest);
    }
  }
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
    sift(a.length, i);
    emit('build', `以位置 ${i + 1} 为根的子树已满足最大堆性质。`, { active: [i], sorted });
  }
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    metrics.writes += 2;
    sorted.push(end);
    emit('extract', `将最大值 ${a[end]} 放到位置 ${end + 1}。`, { active: [0, end], sorted });
    sift(end, 0);
  }
  return finish();
}

function counting(input) {
  if (input.values.some(value => !Number.isInteger(value) || value < 0 || value > 99)) {
    throw new RangeError('计数排序仅支持 0–99 的整数。');
  }
  const { values: a, metrics, emit, finish } = recorder(input);
  const counts = Array(Math.max(0, ...a) + 1).fill(0), output = Array(a.length).fill(0);
  const bucketValues = [...new Set(a)].sort((x, y) => x - y);
  const aux = current => {
    const visible = current === undefined || bucketValues.includes(current)
      ? bucketValues : [...bucketValues, current].sort((x, y) => x - y);
    return [{ label: `计数 / 前缀 · 桶值：${visible.join(' · ') || '空'}`, values: visible.map(value => counts[value]) },
      { label: '输出数组', values: output }];
  };
  emit('init', '建立计数数组与输出数组。', { aux: aux() });
  for (let i = 0; i < a.length; i++) {
    counts[a[i]]++; metrics.writes++;
    emit('count', `记录数值 ${a[i]} 的出现次数。`, { active: [i], aux: aux() });
  }
  for (let i = 1; i < counts.length; i++) {
    counts[i] += counts[i - 1]; metrics.writes++;
    emit('accumulate', `累计不大于 ${i} 的元素数量：${counts[i]}。`, { aux: aux(i) });
  }
  for (let i = a.length - 1; i >= 0; i--) {
    const position = --counts[a[i]];
    output[position] = a[i]; metrics.writes += 2;
    emit('place', `将 ${a[i]} 放到输出位置 ${position + 1}，保持相同值的相对顺序。`, { active: [i], aux: aux() });
  }
  for (let i = 0; i < a.length; i++) {
    a[i] = output[i]; metrics.writes++;
    emit('write', `将输出位置 ${i + 1} 复制回原数组。`, { active: [i], sorted: Array.from({ length: i + 1 }, (_, j) => j), aux: aux() });
  }
  return finish();
}

function shell(input) {
  const { values: a, metrics, emit, finish } = recorder(input);
  emit('init', '逐步缩小间隔，对每个间隔子序列执行插入排序。');
  for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    emit('gap', `本轮间隔为 ${gap}。`, { active: Array.from({ length: Math.ceil(a.length / gap) }, (_, i) => i * gap).filter(i => i < a.length) });
    for (let i = gap; i < a.length; i++) {
      const key = a[i];
      let j = i;
      const aux = [{ label: `间隔 ${gap} · 待插入值`, values: [key] }];
      emit('key', `取出 ${key}，在间隔子序列中寻找插入位置。`, { active: [i], aux });
      while (j >= gap) {
        metrics.comparisons++;
        emit('compare', `比较 ${a[j - gap]} 与 ${key}。`, { active: [j - gap], secondary: [j], aux });
        if (a[j - gap] <= key) break;
        a[j] = a[j - gap]; metrics.writes++;
        emit('shift', `将 ${a[j]} 向右移动 ${gap} 个位置。`, { active: [j - gap, j], aux });
        j -= gap;
      }
      a[j] = key; metrics.writes++;
      emit('insert', `将 ${key} 插入位置 ${j + 1}。`, { active: [j], aux });
    }
  }
  return finish();
}

// These six languages share C-style control flow; retain each language's
// actual declarations, array API, integer division, and swap syntax.
function cStyleSource(language, algorithm) {
  const names = { bubble: 'bubbleSort', selection: 'selectionSort', insertion: 'insertionSort', shell: 'shellSort' };
  const name = names[algorithm];
  const dynamic = language === 'javascript' || language === 'typescript';
  const declaration = dynamic ? 'let' : 'int';
  const half = value => dynamic ? `Math.floor(${value} / 2)` : `${value} / 2`;
  const headers = {
    javascript: `function ${name}(a) {`,
    typescript: `function ${name}(a: number[]): number[] {`,
    java: `static int[] ${name}(int[] a) {`,
    c: `void ${algorithm}_sort(int a[], int n) {`,
    cpp: `#include <vector>\n#include <utility>\n\nstd::vector<int> ${name}(std::vector<int> a) {`,
    csharp: `static int[] ${name[0].toUpperCase() + name.slice(1)}(int[] a) {`,
  };
  const n = language === 'c' ? '' : `  §init§${dynamic ? 'const' : 'int'} n = ${language === 'cpp' ? 'static_cast<int>(a.size())' : language === 'csharp' ? 'a.Length' : 'a.length'};\n`;
  const swap = (x, y, indent) => {
    if (dynamic) return `${indent}§swap§[a[${x}], a[${y}]] = [a[${y}], a[${x}]];`;
    if (language === 'cpp') return `${indent}§swap§std::swap(a[${x}], a[${y}]);`;
    return `${indent}§swap§int temp = a[${x}];\n${indent}§swap§a[${x}] = a[${y}];\n${indent}§swap§a[${y}] = temp;`;
  };
  const bodies = {
    bubble: `  §init§${declaration} end = n - 1;
  while (end > 0) {
    for (${declaration} j = 0; j < end; j++) {
      §compare§if (a[j] > a[j + 1]) {
${swap('j', 'j + 1', '        ')}
      }
    }
    §settled§end--;
  }`,
    selection: `  §init§${declaration} i = 0;
  while (i < n - 1) {
    §select§${declaration} min = i;
    for (${declaration} j = i + 1; j < n; j++) {
      §compare§if (a[j] < a[min]) {
        §minimum§min = j;
      }
    }
    if (min != i) {
${swap('i', 'min', '      ')}
    }
    §settled§i++;
  }`,
    insertion: `  §init§for (${declaration} i = 1; i < n; i++) {
    §key§${declaration} key = a[i];
    ${declaration} j = i - 1;
    §compare§while (j >= 0 && a[j] > key) {
      §shift§a[j + 1] = a[j];
      j--;
    }
    §insert§a[j + 1] = key;
  }`,
    shell: `  §init,gap§for (${declaration} gap = ${half('n')}; gap > 0; gap = ${half('gap')}) {
    for (${declaration} i = gap; i < n; i++) {
      §key§${declaration} key = a[i];
      ${declaration} j = i;
      §compare§while (j >= gap && a[j - gap] > key) {
        §shift§a[j] = a[j - gap];
        j -= gap;
      }
      §insert§a[j] = key;
    }
  }`,
  };
  return `${headers[language]}\n${n}${bodies[algorithm]}\n  §done§return${language === 'c' ? '' : ' a'};\n}`;
}

const simpleTemplates = {
  bubble: {
    python: `def bubble_sort(a):
    §init§end = len(a) - 1
    while end > 0:
        for j in range(end):
            §compare§if a[j] > a[j + 1]:
                §swap§a[j], a[j + 1] = a[j + 1], a[j]
        §settled§end -= 1
    §done§return a`,
    go: `func bubbleSort(a []int) []int {
    §init§end := len(a) - 1
    for end > 0 {
        for j := 0; j < end; j++ {
            §compare§if a[j] > a[j+1] {
                §swap§a[j], a[j+1] = a[j+1], a[j]
            }
        }
        §settled§end--
    }
    §done§return a
}`,
    rust: `fn bubble_sort(a: &mut [i32]) {
    §init§let mut end = a.len().saturating_sub(1);
    while end > 0 {
        for j in 0..end {
            §compare§if a[j] > a[j + 1] {
                §swap§a.swap(j, j + 1);
            }
        }
        §settled§end -= 1;
    }
    §done§return;
}`,
    swift: `func bubbleSort(_ a: inout [Int]) {
    §init§var end = a.count - 1
    while end > 0 {
        for j in 0..<end {
            §compare§if a[j] > a[j + 1] {
                §swap§a.swapAt(j, j + 1)
            }
        }
        §settled§end -= 1
    }
    §done§return
}`,
  },
  selection: {
    python: `def selection_sort(a):
    §init§i = 0
    while i < len(a) - 1:
        §select§minimum = i
        for j in range(i + 1, len(a)):
            §compare§if a[j] < a[minimum]:
                §minimum§minimum = j
        if minimum != i:
            §swap§a[i], a[minimum] = a[minimum], a[i]
        §settled§i += 1
    §done§return a`,
    go: `func selectionSort(a []int) []int {
    §init§i := 0
    for i < len(a)-1 {
        §select§minimum := i
        for j := i+1; j < len(a); j++ {
            §compare§if a[j] < a[minimum] {
                §minimum§minimum = j
            }
        }
        if minimum != i {
            §swap§a[i], a[minimum] = a[minimum], a[i]
        }
        §settled§i++
    }
    §done§return a
}`,
    rust: `fn selection_sort(a: &mut [i32]) {
    §init§let mut i = 0;
    while i < a.len().saturating_sub(1) {
        §select§let mut minimum = i;
        for j in i + 1..a.len() {
            §compare§if a[j] < a[minimum] {
                §minimum§minimum = j;
            }
        }
        if minimum != i {
            §swap§a.swap(i, minimum);
        }
        §settled§i += 1;
    }
    §done§return;
}`,
    swift: `func selectionSort(_ a: inout [Int]) {
    §init§var i = 0
    while i < a.count - 1 {
        §select§var minimum = i
        for j in (i + 1)..<a.count {
            §compare§if a[j] < a[minimum] {
                §minimum§minimum = j
            }
        }
        if minimum != i {
            §swap§a.swapAt(i, minimum)
        }
        §settled§i += 1
    }
    §done§return
}`,
  },
  insertion: {
    python: `def insertion_sort(a):
    §init§for i in range(1, len(a)):
        §key§key = a[i]
        j = i - 1
        §compare§while j >= 0 and a[j] > key:
            §shift§a[j + 1] = a[j]
            j -= 1
        §insert§a[j + 1] = key
    §done§return a`,
    go: `func insertionSort(a []int) []int {
    §init§for i := 1; i < len(a); i++ {
        §key§key := a[i]
        j := i - 1
        §compare§for j >= 0 && a[j] > key {
            §shift§a[j+1] = a[j]
            j--
        }
        §insert§a[j+1] = key
    }
    §done§return a
}`,
    rust: `fn insertion_sort(a: &mut [i32]) {
    §init§for i in 1..a.len() {
        §key§let key = a[i];
        let mut j = i;
        §compare§while j > 0 && a[j - 1] > key {
            §shift§a[j] = a[j - 1];
            j -= 1;
        }
        §insert§a[j] = key;
    }
    §done§return;
}`,
    swift: `func insertionSort(_ a: inout [Int]) {
    §init§var i = 1
    while i < a.count {
        §key§let key = a[i]
        var j = i - 1
        §compare§while j >= 0 && a[j] > key {
            §shift§a[j + 1] = a[j]
            j -= 1
        }
        §insert§a[j + 1] = key
        i += 1
    }
    §done§return
}`,
  },
  shell: {
    python: `def shell_sort(a):
    §init§gap = len(a) // 2
    §gap§while gap > 0:
        for i in range(gap, len(a)):
            §key§key = a[i]
            j = i
            §compare§while j >= gap and a[j - gap] > key:
                §shift§a[j] = a[j - gap]
                j -= gap
            §insert§a[j] = key
        gap //= 2
    §done§return a`,
    go: `func shellSort(a []int) []int {
    §init,gap§for gap := len(a)/2; gap > 0; gap /= 2 {
        for i := gap; i < len(a); i++ {
            §key§key := a[i]
            j := i
            §compare§for j >= gap && a[j-gap] > key {
                §shift§a[j] = a[j-gap]
                j -= gap
            }
            §insert§a[j] = key
        }
    }
    §done§return a
}`,
    rust: `fn shell_sort(a: &mut [i32]) {
    §init§let mut gap = a.len() / 2;
    §gap§while gap > 0 {
        for i in gap..a.len() {
            §key§let key = a[i];
            let mut j = i;
            §compare§while j >= gap && a[j - gap] > key {
                §shift§a[j] = a[j - gap];
                j -= gap;
            }
            §insert§a[j] = key;
        }
        gap /= 2;
    }
    §done§return;
}`,
    swift: `func shellSort(_ a: inout [Int]) {
    §init§var gap = a.count / 2
    §gap§while gap > 0 {
        var i = gap
        while i < a.count {
            §key§let key = a[i]
            var j = i
            §compare§while j >= gap && a[j - gap] > key {
                §shift§a[j] = a[j - gap]
                j -= gap
            }
            §insert§a[j] = key
            i += 1
        }
        gap /= 2
    }
    §done§return
}`,
  },
};

function simpleCodes(algorithm) {
  return sources({
    ...Object.fromEntries(['javascript', 'typescript', 'java', 'c', 'cpp', 'csharp'].map(language => [language, cStyleSource(language, algorithm)])),
    ...simpleTemplates[algorithm],
  });
}

function sortingDefinition(id, name, nameEn, summary, time, space, build, codes) {
  return {
    id, name, nameEn, category: 'sorting', summary,
    complexity: { time, space }, kind: 'array', inputType: 'array',
    defaults: { values: [38, 12, 57, 8, 44, 23, 65, 31] },
    build, codes,
  };
}

const mergeCodes = sources({
javascript: `function mergeSort(a) {
  const n = a.length; §init§
  function sort(lo, hi) {
    if (hi - lo < 2) return;
    const mid = Math.floor((lo + hi) / 2); §divide§
    sort(lo, mid); sort(mid, hi);
    const left = a.slice(lo, mid), right = a.slice(mid, hi); §copy§
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) { §compare§
        a[k++] = left[i++]; §writeleft§
      } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < left.length) a[k++] = left[i++]; §remainleft§
    while (j < right.length) a[k++] = right[j++]; §remainright§
  }
  sort(0, n);
  return a; §done§
}`,
typescript: `function mergeSort(a: number[]): number[] {
  const n = a.length; §init§
  function sort(lo: number, hi: number): void {
    if (hi - lo < 2) return;
    const mid = Math.floor((lo + hi) / 2); §divide§
    sort(lo, mid); sort(mid, hi);
    const left = a.slice(lo, mid), right = a.slice(mid, hi); §copy§
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) { §compare§
        a[k++] = left[i++]; §writeleft§
      } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < left.length) a[k++] = left[i++]; §remainleft§
    while (j < right.length) a[k++] = right[j++]; §remainright§
  }
  sort(0, n);
  return a; §done§
}`,
python: `def merge_sort(a):
    n = len(a) §init§
    def sort(lo, hi):
        if hi - lo < 2:
            return
        mid = (lo + hi) // 2 §divide§
        sort(lo, mid)
        sort(mid, hi)
        left, right = a[lo:mid], a[mid:hi] §copy§
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            if left[i] <= right[j]: §compare§
                a[k] = left[i] §writeleft§
                i += 1
            else:
                a[k] = right[j] §writeright§
                j += 1
            k += 1
        while i < len(left):
            a[k] = left[i] §remainleft§
            i += 1
            k += 1
        while j < len(right):
            a[k] = right[j] §remainright§
            j += 1
            k += 1
    sort(0, n)
    return a §done§`,
java: `static void mergeSort(int[] a) {
    int n = a.length; §init§
    mergeRange(a, 0, n);
} §done§
static void mergeRange(int[] a, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2; §divide§
    mergeRange(a, lo, mid); mergeRange(a, mid, hi);
    int[] left = java.util.Arrays.copyOfRange(a, lo, mid); §copy§
    int[] right = java.util.Arrays.copyOfRange(a, mid, hi); §copy§
    int i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) { §compare§
            a[k++] = left[i++]; §writeleft§
        } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < left.length) a[k++] = left[i++]; §remainleft§
    while (j < right.length) a[k++] = right[j++]; §remainright§
}`,
c: `#include <stdlib.h>
static void merge_range(int a[], int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2; §divide§
    merge_range(a, lo, mid); merge_range(a, mid, hi);
    int nl = mid - lo, nr = hi - mid;
    int *left = malloc(nl * sizeof(int)), *right = malloc(nr * sizeof(int));
    if (!left || !right) abort();
    for (int i = 0; i < nl; ++i) left[i] = a[lo + i]; §copy§
    for (int j = 0; j < nr; ++j) right[j] = a[mid + j]; §copy§
    int i = 0, j = 0, k = lo;
    while (i < nl && j < nr) {
        if (left[i] <= right[j]) { §compare§
            a[k++] = left[i++]; §writeleft§
        } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < nl) a[k++] = left[i++]; §remainleft§
    while (j < nr) a[k++] = right[j++]; §remainright§
    free(left); free(right);
}
void merge_sort(int a[], int n) {
    int hi = n; §init§
    merge_range(a, 0, hi);
} §done§`,
cpp: `#include <vector>
void mergeRange(std::vector<int>& a, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2; §divide§
    mergeRange(a, lo, mid); mergeRange(a, mid, hi);
    std::vector<int> left(a.begin() + lo, a.begin() + mid); §copy§
    std::vector<int> right(a.begin() + mid, a.begin() + hi); §copy§
    int i = 0, j = 0, k = lo;
    while (i < static_cast<int>(left.size()) && j < static_cast<int>(right.size())) {
        if (left[i] <= right[j]) { §compare§
            a[k++] = left[i++]; §writeleft§
        } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < static_cast<int>(left.size())) a[k++] = left[i++]; §remainleft§
    while (j < static_cast<int>(right.size())) a[k++] = right[j++]; §remainright§
}
void mergeSort(std::vector<int>& a) {
    int n = static_cast<int>(a.size()); §init§
    mergeRange(a, 0, n);
} §done§`,
csharp: `static void MergeSort(int[] a) {
    int n = a.Length; §init§
    MergeRange(a, 0, n);
} §done§
static void MergeRange(int[] a, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2; §divide§
    MergeRange(a, lo, mid); MergeRange(a, mid, hi);
    int[] left = new int[mid - lo], right = new int[hi - mid];
    System.Array.Copy(a, lo, left, 0, left.Length); §copy§
    System.Array.Copy(a, mid, right, 0, right.Length); §copy§
    int i = 0, j = 0, k = lo;
    while (i < left.Length && j < right.Length) {
        if (left[i] <= right[j]) { §compare§
            a[k++] = left[i++]; §writeleft§
        } else { a[k++] = right[j++]; } §writeright§
    }
    while (i < left.Length) a[k++] = left[i++]; §remainleft§
    while (j < right.Length) a[k++] = right[j++]; §remainright§
}`,
go: `func mergeSort(a []int) {
    n := len(a) §init§
    var sort func(int, int)
    sort = func(lo, hi int) {
        if hi-lo < 2 { return }
        mid := (lo + hi) / 2 §divide§
        sort(lo, mid); sort(mid, hi)
        left := append([]int(nil), a[lo:mid]...) §copy§
        right := append([]int(nil), a[mid:hi]...) §copy§
        i, j, k := 0, 0, lo
        for i < len(left) && j < len(right) {
            if left[i] <= right[j] { §compare§
                a[k] = left[i]; i++ §writeleft§
            } else { a[k] = right[j]; j++ } §writeright§
            k++
        }
        for i < len(left) { a[k] = left[i]; i++; k++ } §remainleft§
        for j < len(right) { a[k] = right[j]; j++; k++ } §remainright§
    }
    sort(0, n)
} §done§`,
rust: `fn merge_range(a: &mut [i32], lo: usize, hi: usize) {
    if hi - lo < 2 { return; }
    let mid = (lo + hi) / 2; §divide§
    merge_range(a, lo, mid); merge_range(a, mid, hi);
    let left = a[lo..mid].to_vec(); §copy§
    let right = a[mid..hi].to_vec(); §copy§
    let (mut i, mut j, mut k) = (0, 0, lo);
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] { §compare§
            a[k] = left[i]; i += 1; §writeleft§
        } else { a[k] = right[j]; j += 1; } §writeright§
        k += 1;
    }
    while i < left.len() { a[k] = left[i]; i += 1; k += 1; } §remainleft§
    while j < right.len() { a[k] = right[j]; j += 1; k += 1; } §remainright§
}
fn merge_sort(a: &mut [i32]) {
    let n = a.len(); §init§
    merge_range(a, 0, n);
} §done§`,
swift: `func mergeSort(_ a: inout [Int]) {
    let n = a.count §init§
    func sort(_ lo: Int, _ hi: Int) {
        if hi - lo < 2 { return }
        let mid = (lo + hi) / 2 §divide§
        sort(lo, mid); sort(mid, hi)
        let left = Array(a[lo..<mid]), right = Array(a[mid..<hi]) §copy§
        var i = 0, j = 0, k = lo
        while i < left.count && j < right.count {
            if left[i] <= right[j] { §compare§
                a[k] = left[i]; i += 1 §writeleft§
            } else { a[k] = right[j]; j += 1 } §writeright§
            k += 1
        }
        while i < left.count { a[k] = left[i]; i += 1; k += 1 } §remainleft§
        while j < right.count { a[k] = right[j]; j += 1; k += 1 } §remainright§
    }
    sort(0, n)
} §done§`
});

const quickCodes = sources({
javascript: `function quickSort(a) {
  const n = a.length; §init§
  function sort(lo, hi) {
    if (lo >= hi) return;
    const pivot = a[hi]; §pivot§
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (a[j] <= pivot) { §compare§
        [a[i], a[j]] = [a[j], a[i]]; §swap§
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]]; §place§
    sort(lo, i - 1); sort(i + 1, hi);
  }
  sort(0, n - 1);
  return a; §done§
}`,
typescript: `function quickSort(a: number[]): number[] {
  const n = a.length; §init§
  function sort(lo: number, hi: number): void {
    if (lo >= hi) return;
    const pivot = a[hi]; §pivot§
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (a[j] <= pivot) { §compare§
        [a[i], a[j]] = [a[j], a[i]]; §swap§
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]]; §place§
    sort(lo, i - 1); sort(i + 1, hi);
  }
  sort(0, n - 1);
  return a; §done§
}`,
python: `def quick_sort(a):
    n = len(a) §init§
    def sort(lo, hi):
        if lo >= hi:
            return
        pivot = a[hi] §pivot§
        i = lo
        for j in range(lo, hi):
            if a[j] <= pivot: §compare§
                a[i], a[j] = a[j], a[i] §swap§
                i += 1
        a[i], a[hi] = a[hi], a[i] §place§
        sort(lo, i - 1)
        sort(i + 1, hi)
    sort(0, n - 1)
    return a §done§`,
java: `static void quickSort(int[] a) {
    int n = a.length; §init§
    quickRange(a, 0, n - 1);
} §done§
static void quickRange(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi]; §pivot§
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) { §compare§
            int t = a[i]; a[i] = a[j]; a[j] = t; §swap§
            i++;
        }
    }
    int t = a[i]; a[i] = a[hi]; a[hi] = t; §place§
    quickRange(a, lo, i - 1); quickRange(a, i + 1, hi);
}`,
c: `static void quick_range(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi]; §pivot§
    int i = lo;
    for (int j = lo; j < hi; ++j) {
        if (a[j] <= pivot) { §compare§
            int t = a[i]; a[i] = a[j]; a[j] = t; §swap§
            ++i;
        }
    }
    int t = a[i]; a[i] = a[hi]; a[hi] = t; §place§
    quick_range(a, lo, i - 1); quick_range(a, i + 1, hi);
}
void quick_sort(int a[], int n) {
    int hi = n - 1; §init§
    quick_range(a, 0, hi);
} §done§`,
cpp: `#include <vector>
#include <utility>
void quickRange(std::vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi]; §pivot§
    int i = lo;
    for (int j = lo; j < hi; ++j) {
        if (a[j] <= pivot) { §compare§
            std::swap(a[i], a[j]); §swap§
            ++i;
        }
    }
    std::swap(a[i], a[hi]); §place§
    quickRange(a, lo, i - 1); quickRange(a, i + 1, hi);
}
void quickSort(std::vector<int>& a) {
    int n = static_cast<int>(a.size()); §init§
    quickRange(a, 0, n - 1);
} §done§`,
csharp: `static void QuickSort(int[] a) {
    int n = a.Length; §init§
    QuickRange(a, 0, n - 1);
} §done§
static void QuickRange(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi]; §pivot§
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) { §compare§
            int t = a[i]; a[i] = a[j]; a[j] = t; §swap§
            i++;
        }
    }
    int last = a[i]; a[i] = a[hi]; a[hi] = last; §place§
    QuickRange(a, lo, i - 1); QuickRange(a, i + 1, hi);
}`,
go: `func quickSort(a []int) {
    n := len(a) §init§
    var sort func(int, int)
    sort = func(lo, hi int) {
        if lo >= hi { return }
        pivot := a[hi] §pivot§
        i := lo
        for j := lo; j < hi; j++ {
            if a[j] <= pivot { §compare§
                a[i], a[j] = a[j], a[i] §swap§
                i++
            }
        }
        a[i], a[hi] = a[hi], a[i] §place§
        sort(lo, i-1); sort(i+1, hi)
    }
    sort(0, n-1)
} §done§`,
rust: `fn quick_range(a: &mut [i32], lo: isize, hi: isize) {
    if lo >= hi { return; }
    let pivot = a[hi as usize]; §pivot§
    let mut i = lo;
    for j in lo..hi {
        if a[j as usize] <= pivot { §compare§
            a.swap(i as usize, j as usize); §swap§
            i += 1;
        }
    }
    a.swap(i as usize, hi as usize); §place§
    quick_range(a, lo, i - 1); quick_range(a, i + 1, hi);
}
fn quick_sort(a: &mut [i32]) {
    let n = a.len() as isize; §init§
    quick_range(a, 0, n - 1);
} §done§`,
swift: `func quickSort(_ a: inout [Int]) {
    let n = a.count §init§
    func sort(_ lo: Int, _ hi: Int) {
        if lo >= hi { return }
        let pivot = a[hi] §pivot§
        var i = lo
        for j in lo..<hi {
            if a[j] <= pivot { §compare§
                a.swapAt(i, j) §swap§
                i += 1
            }
        }
        a.swapAt(i, hi) §place§
        sort(lo, i - 1); sort(i + 1, hi)
    }
    sort(0, n - 1)
} §done§`
});

const heapCodes = sources({
javascript: `function heapSort(a) {
  const n = a.length; §init§
  function heapify(size, root) {
    let largest = root;
    const left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]]; §swap§
      heapify(size, largest);
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i); §build§
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]]; §extract§
    heapify(end, 0);
  }
  return a; §done§
}`,
typescript: `function heapSort(a: number[]): number[] {
  const n = a.length; §init§
  function heapify(size: number, root: number): void {
    let largest = root;
    const left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest !== root) {
      [a[root], a[largest]] = [a[largest], a[root]]; §swap§
      heapify(size, largest);
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i); §build§
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]]; §extract§
    heapify(end, 0);
  }
  return a; §done§
}`,
python: `def heap_sort(a):
    n = len(a) §init§
    def heapify(size, root):
        largest = root
        left, right = 2 * root + 1, 2 * root + 2
        if left < size and a[left] > a[largest]: §compareleft§
            largest = left
        if right < size and a[right] > a[largest]: §compareright§
            largest = right
        if largest != root:
            a[root], a[largest] = a[largest], a[root] §swap§
            heapify(size, largest)
    for i in range(n // 2 - 1, -1, -1):
        heapify(n, i) §build§
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0] §extract§
        heapify(end, 0)
    return a §done§`,
java: `static void heapSort(int[] a) {
    int n = a.length; §init§
    for (int i = n / 2 - 1; i >= 0; i--) heapify(a, n, i); §build§
    for (int end = n - 1; end > 0; end--) {
        int t = a[0]; a[0] = a[end]; a[end] = t; §extract§
        heapify(a, end, 0);
    }
} §done§
static void heapify(int[] a, int size, int root) {
    int largest = root, left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest != root) {
        int t = a[root]; a[root] = a[largest]; a[largest] = t; §swap§
        heapify(a, size, largest);
    }
}`,
c: `static void heapify(int a[], int size, int root) {
    int largest = root, left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest != root) {
        int t = a[root]; a[root] = a[largest]; a[largest] = t; §swap§
        heapify(a, size, largest);
    }
}
void heap_sort(int a[], int n) {
    int size = n; §init§
    for (int i = size / 2 - 1; i >= 0; --i) heapify(a, size, i); §build§
    for (int end = size - 1; end > 0; --end) {
        int t = a[0]; a[0] = a[end]; a[end] = t; §extract§
        heapify(a, end, 0);
    }
} §done§`,
cpp: `#include <vector>
#include <utility>
void heapify(std::vector<int>& a, int size, int root) {
    int largest = root, left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest != root) {
        std::swap(a[root], a[largest]); §swap§
        heapify(a, size, largest);
    }
}
void heapSort(std::vector<int>& a) {
    int n = static_cast<int>(a.size()); §init§
    for (int i = n / 2 - 1; i >= 0; --i) heapify(a, n, i); §build§
    for (int end = n - 1; end > 0; --end) {
        std::swap(a[0], a[end]); §extract§
        heapify(a, end, 0);
    }
} §done§`,
csharp: `static void HeapSort(int[] a) {
    int n = a.Length; §init§
    for (int i = n / 2 - 1; i >= 0; i--) Heapify(a, n, i); §build§
    for (int end = n - 1; end > 0; end--) {
        int t = a[0]; a[0] = a[end]; a[end] = t; §extract§
        Heapify(a, end, 0);
    }
} §done§
static void Heapify(int[] a, int size, int root) {
    int largest = root, left = 2 * root + 1, right = left + 1;
    if (left < size && a[left] > a[largest]) largest = left; §compareleft§
    if (right < size && a[right] > a[largest]) largest = right; §compareright§
    if (largest != root) {
        int t = a[root]; a[root] = a[largest]; a[largest] = t; §swap§
        Heapify(a, size, largest);
    }
}`,
go: `func heapSort(a []int) {
    n := len(a) §init§
    var heapify func(int, int)
    heapify = func(size, root int) {
        largest, left, right := root, 2*root+1, 2*root+2
        if left < size && a[left] > a[largest] { largest = left } §compareleft§
        if right < size && a[right] > a[largest] { largest = right } §compareright§
        if largest != root {
            a[root], a[largest] = a[largest], a[root] §swap§
            heapify(size, largest)
        }
    }
    for i := n/2-1; i >= 0; i-- { heapify(n, i) } §build§
    for end := n-1; end > 0; end-- {
        a[0], a[end] = a[end], a[0] §extract§
        heapify(end, 0)
    }
} §done§`,
rust: `fn heapify(a: &mut [i32], size: usize, root: usize) {
    let (mut largest, left, right) = (root, 2 * root + 1, 2 * root + 2);
    if left < size && a[left] > a[largest] { largest = left; } §compareleft§
    if right < size && a[right] > a[largest] { largest = right; } §compareright§
    if largest != root {
        a.swap(root, largest); §swap§
        heapify(a, size, largest);
    }
}
fn heap_sort(a: &mut [i32]) {
    let n = a.len(); §init§
    for i in (0..n / 2).rev() { heapify(a, n, i); } §build§
    for end in (1..n).rev() {
        a.swap(0, end); §extract§
        heapify(a, end, 0);
    }
} §done§`,
swift: `func heapSort(_ a: inout [Int]) {
    let n = a.count §init§
    func heapify(_ size: Int, _ root: Int) {
        var largest = root
        let left = 2 * root + 1, right = left + 1
        if left < size && a[left] > a[largest] { largest = left } §compareleft§
        if right < size && a[right] > a[largest] { largest = right } §compareright§
        if largest != root {
            a.swapAt(root, largest) §swap§
            heapify(size, largest)
        }
    }
    for i in stride(from: n / 2 - 1, through: 0, by: -1) { heapify(n, i) } §build§
    for end in stride(from: n - 1, through: 1, by: -1) {
        a.swapAt(0, end) §extract§
        heapify(end, 0)
    }
} §done§`
});

const countingCodes = sources({
javascript: `function countingSort(a) {
  const maximum = Math.max(0, ...a);
  const count = Array(maximum + 1).fill(0), out = Array(a.length).fill(0); §init§
  for (const value of a) count[value]++; §count§
  for (let v = 1; v < count.length; v++) count[v] += count[v - 1]; §accumulate§
  for (let i = a.length - 1; i >= 0; i--) {
    out[--count[a[i]]] = a[i]; §place§
  }
  for (let i = 0; i < a.length; i++) a[i] = out[i]; §write§
  return a; §done§
}`,
typescript: `function countingSort(a: number[]): number[] {
  const maximum = Math.max(0, ...a);
  const count: number[] = Array(maximum + 1).fill(0), out: number[] = Array(a.length).fill(0); §init§
  for (const value of a) count[value]++; §count§
  for (let v = 1; v < count.length; v++) count[v] += count[v - 1]; §accumulate§
  for (let i = a.length - 1; i >= 0; i--) {
    out[--count[a[i]]] = a[i]; §place§
  }
  for (let i = 0; i < a.length; i++) a[i] = out[i]; §write§
  return a; §done§
}`,
python: `def counting_sort(a):
    maximum = max(a, default=0)
    count, out = [0] * (maximum + 1), [0] * len(a) §init§
    for value in a:
        count[value] += 1 §count§
    for value in range(1, len(count)):
        count[value] += count[value - 1] §accumulate§
    for i in range(len(a) - 1, -1, -1):
        count[a[i]] -= 1
        out[count[a[i]]] = a[i] §place§
    for i in range(len(a)):
        a[i] = out[i] §write§
    return a §done§`,
java: `static void countingSort(int[] a) {
    int maximum = 0;
    for (int value : a) maximum = Math.max(maximum, value);
    int[] count = new int[maximum + 1], out = new int[a.length]; §init§
    for (int value : a) count[value]++; §count§
    for (int v = 1; v < count.length; v++) count[v] += count[v - 1]; §accumulate§
    for (int i = a.length - 1; i >= 0; i--) {
        out[--count[a[i]]] = a[i]; §place§
    }
    for (int i = 0; i < a.length; i++) a[i] = out[i]; §write§
} §done§`,
c: `#include <stdlib.h>
void counting_sort(int a[], int n) {
    int maximum = 0;
    for (int i = 0; i < n; ++i) if (a[i] > maximum) maximum = a[i];
    int *count = calloc(maximum + 1, sizeof(int)); §init§
    int *out = n ? calloc(n, sizeof(int)) : NULL;
    if (!count || (n && !out)) abort();
    for (int i = 0; i < n; ++i) ++count[a[i]]; §count§
    for (int v = 1; v <= maximum; ++v) count[v] += count[v - 1]; §accumulate§
    for (int i = n - 1; i >= 0; --i) {
        out[--count[a[i]]] = a[i]; §place§
    }
    for (int i = 0; i < n; ++i) a[i] = out[i]; §write§
    free(count); free(out);
} §done§`,
cpp: `#include <algorithm>
#include <vector>
void countingSort(std::vector<int>& a) {
    int maximum = a.empty() ? 0 : *std::max_element(a.begin(), a.end());
    std::vector<int> count(maximum + 1, 0); §init§
    std::vector<int> out(a.size());
    for (int value : a) ++count[value]; §count§
    for (int v = 1; v <= maximum; ++v) count[v] += count[v - 1]; §accumulate§
    for (int i = static_cast<int>(a.size()) - 1; i >= 0; --i) {
        out[--count[a[i]]] = a[i]; §place§
    }
    for (std::size_t i = 0; i < a.size(); ++i) a[i] = out[i]; §write§
} §done§`,
csharp: `static void CountingSort(int[] a) {
    int maximum = 0;
    foreach (int value in a) maximum = System.Math.Max(maximum, value);
    int[] count = new int[maximum + 1], output = new int[a.Length]; §init§
    foreach (int value in a) count[value]++; §count§
    for (int v = 1; v < count.Length; v++) count[v] += count[v - 1]; §accumulate§
    for (int i = a.Length - 1; i >= 0; i--) {
        output[--count[a[i]]] = a[i]; §place§
    }
    for (int i = 0; i < a.Length; i++) a[i] = output[i]; §write§
} §done§`,
go: `func countingSort(a []int) {
    maximum := 0
    for _, value := range a { if value > maximum { maximum = value } }
    count, out := make([]int, maximum+1), make([]int, len(a)) §init§
    for _, value := range a { count[value]++ } §count§
    for v := 1; v < len(count); v++ { count[v] += count[v-1] } §accumulate§
    for i := len(a)-1; i >= 0; i-- {
        count[a[i]]--
        out[count[a[i]]] = a[i] §place§
    }
    for i := range a { a[i] = out[i] } §write§
} §done§`,
rust: `fn counting_sort(a: &mut [i32]) {
    let maximum = a.iter().copied().max().unwrap_or(0) as usize;
    let mut count = vec![0_usize; maximum + 1]; §init§
    let mut out = vec![0; a.len()];
    for &value in a.iter() { count[value as usize] += 1; } §count§
    for v in 1..count.len() { count[v] += count[v - 1]; } §accumulate§
    for i in (0..a.len()).rev() {
        let v = a[i] as usize;
        count[v] -= 1;
        out[count[v]] = a[i]; §place§
    }
    for i in 0..a.len() { a[i] = out[i]; } §write§
} §done§`,
swift: `func countingSort(_ a: inout [Int]) {
    let maximum = a.max() ?? 0
    var count = Array(repeating: 0, count: maximum + 1) §init§
    var out = Array(repeating: 0, count: a.count)
    for value in a { count[value] += 1 } §count§
    for v in 1..<count.count { count[v] += count[v - 1] } §accumulate§
    for i in stride(from: a.count - 1, through: 0, by: -1) {
        count[a[i]] -= 1
        out[count[a[i]]] = a[i] §place§
    }
    for i in a.indices { a[i] = out[i] } §write§
} §done§`
});

export const sortingAlgorithms = [
  sortingDefinition('bubble', '冒泡排序', 'Bubble Sort',
    '比较相邻元素并交换，让每轮最大值逐渐浮到数组末尾。稳定，适合理解交换与排序过程。',
    'O(n²)', 'O(1)', bubble, simpleCodes('bubble')),
  sortingDefinition('selection', '选择排序', 'Selection Sort',
    '反复找到未排序区的最小值，放到有序区末尾。比较次数固定，交换次数较少。',
    'O(n²)', 'O(1)', selection, simpleCodes('selection')),
  sortingDefinition('insertion', '插入排序', 'Insertion Sort',
    '像整理手中的扑克牌一样，将新元素插入有序前缀。稳定，对接近有序的数据尤其有效。',
    'O(n²)', 'O(1)', insertion, simpleCodes('insertion')),
  sortingDefinition('merge', '归并排序', 'Merge Sort',
    '递归拆分数组，再合并两个有序子数组。稳定，时间复杂度不受输入顺序影响。',
    'O(n log n)', 'O(n)', merge, mergeCodes),
  sortingDefinition('quick', '快速排序', 'Quick Sort',
    '以末尾元素为基准划分左右分区，再递归排序。平均 O(n log n)，最坏 O(n²)；递归空间平均 O(log n)。',
    'O(n²) 最坏', 'O(n) 最坏', quick, quickCodes),
  sortingDefinition('heap', '堆排序', 'Heap Sort',
    '先构造最大堆，再依次将堆顶放到数组末尾。无需额外数组；此演示使用递归下沉。',
    'O(n log n)', 'O(log n)', heap, heapCodes),
  sortingDefinition('counting', '计数排序', 'Counting Sort',
    '统计每个整数的频次，通过前缀计数确定稳定的输出位置。支持 0–99；k 是数值范围。',
    'O(n + k)', 'O(n + k)', counting, countingCodes),
  sortingDefinition('shell', '希尔排序', 'Shell Sort',
    '以逐次减半的间隔进行插入排序，最后用间隔 1 完成排序。较远元素可提前移动到合适区域。',
    'O(n²)', 'O(1)', shell, simpleCodes('shell')),
];
