import { algorithms, categories, languages, filterAlgorithms } from './catalog.js';
import { parseInput, randomInput } from './inputs.js';
import { escapeHTML, highlightSource, updateArray, renderTable, renderGraph, renderSupplement } from './renderers.js';

const $ = id => document.getElementById(id);
const state = { category: 'all', algorithm: null, language: 'javascript', input: null, steps: [], result: null, index: 0, playing: false, timer: null };
let toastTimer;
try {
  const saved = localStorage.getItem('algorithm-studio-language');
  if (languages.some(language => language.id === saved)) state.language = saved;
} catch { /* Storage is optional, including in private browsing. */ }

const categoryOf = algorithm => categories.find(category => category.id === algorithm.category);
const metricNames = { comparisons: '比较', writes: '写入', swaps: '交换', visited: '访问', totalWeight: '总权重', cells: '填表', result: '结果', updates: '更新' };

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2500);
}

function renderCategories() {
  $('category-nav').innerHTML = categories.map(category => {
    const count = category.id === 'all' ? algorithms.length : algorithms.filter(algorithm => algorithm.category === category.id).length;
    return `<button type="button" class="category-button${state.category === category.id ? ' active' : ''}" data-category="${category.id}" aria-pressed="${state.category === category.id}"><span class="category-icon">${category.icon}</span><span class="category-label">${category.name}</span><span class="category-count">${count}</span></button>`;
  }).join('');
}

function renderCatalog() {
  const list = filterAlgorithms(state.category, $('algorithm-search').value);
  $('catalog-title').textContent = categories.find(category => category.id === state.category).name;
  $('catalog-count').textContent = `${list.length} 个算法`;
  $('algorithm-grid').innerHTML = list.map(algorithm => {
    const category = categoryOf(algorithm);
    const ordinal = algorithms.indexOf(algorithm) + 1;
    return `<button type="button" class="algorithm-card" data-algorithm="${algorithm.id}"><div class="card-top"><span class="card-icon category-${algorithm.category}" aria-hidden="true">${category.icon}</span><span class="card-index">${String(ordinal).padStart(2, '0')}</span></div><span class="card-category">${category.name}</span><h4 class="card-name">${escapeHTML(algorithm.name)}</h4><span class="card-english">${escapeHTML(algorithm.nameEn)}</span><p class="card-summary">${escapeHTML(algorithm.summary)}</p><div class="card-bottom"><span class="card-complexity">${escapeHTML(algorithm.complexity.time)}</span><span class="card-arrow" aria-hidden="true">↗</span></div></button>`;
  }).join('');
  $('empty-state').hidden = list.length !== 0;
}

function pause() {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  $('play-button').textContent = '▶ 播放';
  $('play-button').setAttribute('aria-label', '播放');
}

function showLibrary() {
  pause();
  state.algorithm = null;
  $('library-view').hidden = false;
  $('demo-view').hidden = true;
  $('breadcrumb').textContent = '工作室 / 算法库';
  $('window-status').textContent = `${algorithms.length} 个算法已装入工作室`;
  document.title = 'Algorithm Studio · 算法工作室';
  renderCatalog();
}

function navigate(id = 'library') {
  const hash = `#${id}`;
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  const id = location.hash.slice(1);
  const algorithm = algorithms.find(item => item.id === id);
  if (!algorithm) {
    showLibrary();
    if (id && id !== 'library') toast('未找到这个算法，已返回算法库。');
    return;
  }
  openAlgorithm(algorithm);
}

function openAlgorithm(algorithm) {
  pause();
  state.algorithm = algorithm;
  state.input = structuredClone(algorithm.defaults);
  const category = categoryOf(algorithm);
  $('library-view').hidden = true;
  $('demo-view').hidden = false;
  $('input-panel').hidden = true;
  $('toggle-input').setAttribute('aria-expanded', 'false');
  $('toggle-input').textContent = '修改输入 ▾';
  $('toggle-input').hidden = ['kruskal', 'topological'].includes(algorithm.id);
  $('input-error').textContent = '';
  $('demo-category').textContent = `${category.name} / ${category.english}`;
  $('demo-title').textContent = algorithm.name;
  $('demo-summary').textContent = algorithm.summary;
  $('time-complexity').textContent = algorithm.complexity.time;
  $('space-complexity').textContent = algorithm.complexity.space;
  $('breadcrumb').textContent = `工作室 / ${category.name} / ${algorithm.name}`;
  $('animation-type').textContent = { array: 'ARRAY VIEW', graph: 'GRAPH VIEW', table: 'STATE TABLE' }[algorithm.kind];
  $('window-status').textContent = `${algorithm.nameEn} · 10 种语言代码`;
  document.title = `${algorithm.name} · Algorithm Studio`;
  renderInputFields();
  renderCode();
  rebuild();
}

function rebuild() {
  pause();
  try {
    const trace = state.algorithm.build(structuredClone(state.input));
    if (!trace.steps.length) throw new Error('这个输入没有产生可执行步骤。');
    state.steps = trace.steps;
    state.result = trace.result;
    state.index = 0;
    $('timeline').max = String(state.steps.length - 1);
    $('input-error').textContent = '';
    renderStep();
  } catch (error) {
    $('input-error').textContent = error.message;
    $('input-panel').hidden = false;
    $('toggle-input').setAttribute('aria-expanded', 'true');
    toast('无法生成演示，请检查输入。');
  }
}

function renderCode() {
  const language = languages.find(item => item.id === state.language);
  const program = state.algorithm.codes[state.language];
  $('language-select').value = state.language;
  $('language-caption').textContent = language.name;
  $('code-filename').textContent = `${state.algorithm.id.replaceAll('-', '_')}.${language.extension}`;
  $('code-lines').innerHTML = program.source.split('\n').map((line, index) => `<span class="code-line" data-line="${index + 1}"><span class="line-number" aria-hidden="true">${index + 1}</span><span class="line-text">${highlightSource(line) || ' '}</span></span>`).join('');
}

function highlightStep(step) {
  const lines = state.algorithm.codes[state.language].tags[step.tag];
  if (!lines?.length) throw new Error(`缺少 ${state.language} / ${step.tag} 的代码行映射。`);
  $('code-lines').querySelectorAll('.current').forEach(element => {
    element.classList.remove('current');
    element.removeAttribute('aria-current');
  });
  let first;
  for (const line of lines) {
    const element = $('code-lines').querySelector(`[data-line="${line}"]`);
    if (element) {
      element.classList.add('current');
      element.setAttribute('aria-current', 'step');
      first ??= element;
    }
  }
  $('code-location').textContent = `执行行 ${lines.join(', ')}`;
  if (first) {
    const scroller = $('code-scroller');
    const top = first.offsetTop - $('code-lines').offsetTop;
    if (top < scroller.scrollTop + 20 || top > scroller.scrollTop + scroller.clientHeight - 45) scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3);
  }
}

function renderStep() {
  const step = state.steps[state.index];
  highlightStep(step);
  const visual = step.state;
  if (visual.type === 'array') updateArray($('visualization'), visual);
  else $('visualization').innerHTML = visual.type === 'graph' ? renderGraph(visual) : renderTable(visual);
  $('stage-supplement').innerHTML = renderSupplement(visual, state.algorithm.id);
  $('stage-metrics').innerHTML = Object.entries(visual.metrics ?? {}).map(([name, value]) => `<span class="metric">${escapeHTML(metricNames[name] ?? name)} <b class="metric-value">${escapeHTML(value)}</b></span>`).join('');
  $('step-number').textContent = `STEP ${String(state.index + 1).padStart(3, '0')}`;
  $('step-description').textContent = step.description;
  $('step-counter').textContent = `${state.index + 1} / ${state.steps.length}`;
  $('timeline').value = String(state.index);
  $('timeline').setAttribute('aria-valuetext', `第 ${state.index + 1} 步，共 ${state.steps.length} 步`);
  $('previous-button').disabled = state.index === 0;
  $('next-button').disabled = state.index === state.steps.length - 1;
  $('stage-status').textContent = state.index === state.steps.length - 1 ? '演示完成' : state.playing ? '执行中' : state.index === 0 ? '准备就绪' : '已暂停';
  // Keep large DP tables usable while avoiding scroll jumps on every step.
  const active = $('visualization').querySelector('td.active');
  const tableScroll = $('visualization').querySelector('.dp-scroll');
  if (active && tableScroll) {
    const relative = active.offsetLeft;
    if (relative > tableScroll.clientWidth - 70) tableScroll.scrollLeft = Math.max(0, relative - tableScroll.clientWidth / 2);
  }
}

function move(index) {
  if (!state.algorithm) return;
  pause();
  state.index = Math.max(0, Math.min(state.steps.length - 1, index));
  renderStep();
}

function schedule() {
  clearTimeout(state.timer);
  if (!state.playing) return;
  state.timer = setTimeout(() => {
    if (!state.playing) return;
    if (state.index < state.steps.length - 1) state.index++;
    if (state.index === state.steps.length - 1) pause();
    renderStep();
    if (state.playing) schedule();
  }, 820 / Number($('speed-select').value));
}

function togglePlay() {
  if (!state.algorithm) return;
  if (state.playing) { pause(); renderStep(); return; }
  if (state.index === state.steps.length - 1) state.index = 0;
  state.playing = true;
  $('play-button').textContent = 'Ⅱ 暂停';
  $('play-button').setAttribute('aria-label', '暂停');
  renderStep();
  schedule();
}

function field(name, label, value, options = {}) {
  const shown = Array.isArray(value) ? value.join(', ') : value;
  if (options.nodes) return `<label class="input-field">${label}<select name="${name}">${options.nodes.map(node => `<option value="${node.id}"${node.id === value ? ' selected' : ''}>${node.id}</option>`).join('')}</select></label>`;
  return `<label class="input-field">${label}<input name="${name}" value="${escapeHTML(shown)}" ${options.numeric ? 'inputmode="numeric"' : ''} ${options.maxlength ? `maxlength="${options.maxlength}"` : ''} autocomplete="off" spellcheck="false"></label>`;
}

function renderInputFields() {
  const input = state.input;
  let markup;
  let hint;
  switch (state.algorithm.inputType) {
    case 'array':
      markup = field('values', '数组', input.values);
      hint = state.algorithm.id.includes('counting') ? '输入 1–18 个 0–99 的整数，用逗号或空格分隔。' : '输入 1–18 个 −99–99 的整数；负数的柱高以绝对值显示。';
      break;
    case 'search':
      markup = field('values', '数组', input.values) + field('target', '目标值', input.target, { numeric: true });
      hint = '数组支持 1–18 个 −99–99 的整数。除顺序搜索外，会先排序副本；返回索引对应演示数组。复杂度标注搜索阶段，不计准备排序。';
      break;
    case 'graph':
      markup = field('start', '起点', input.start, { nodes: state.algorithm.graph.nodes });
      hint = '使用固定示例图。BFS、DFS、Dijkstra、Prim 支持切换起点；拓扑排序和 Kruskal 与起点无关。';
      break;
    case 'fibonacci':
      markup = field('n', 'n', input.n, { numeric: true });
      hint = 'n 为 0–20 的整数。F(0) = 0，F(1) = 1。';
      break;
    case 'knapsack':
      markup = field('weights', '物品重量', input.weights) + field('values', '物品价值', input.values) + field('capacity', '背包容量', input.capacity, { numeric: true });
      hint = '最多 6 件物品，重量 1–16、价值 0–99，容量 0–16。每件物品最多选一次。';
      break;
    case 'strings':
      markup = field('textA', '字符串 A', input.textA, { maxlength: 10 }) + field('textB', '字符串 B', input.textB, { maxlength: 10 });
      hint = '每个字符串最多 10 个 ASCII 字符，区分大小写，可留空。';
      break;
    case 'coins':
      markup = field('coins', '硬币面额', input.coins) + field('amount', '目标金额', input.amount, { numeric: true });
      hint = '最多 6 种面额（1–20），每种可无限使用；目标金额 0–20。∞ 表示暂不可达。';
      break;
  }
  $('input-fields').innerHTML = markup;
  $('input-hint').textContent = hint;
}

function showDialog(type) {
  const help = type === 'help';
  $('dialog-title').textContent = help ? '使用说明' : '关于 Algorithm Studio';
  $('dialog-content').innerHTML = help
    ? '<h2>一步一步，看懂算法。</h2><ol><li>在算法库选择算法，或用搜索查找。</li><li>左侧选择代码语言，右侧观察当前操作。</li><li>使用播放、单步和进度条追踪每一行；循环和条件分支会反复高亮对应行。</li><li>展开「修改输入」，输入自己的示例并应用。</li></ol><p>蓝紫色表示当前操作，金色表示参考状态，青绿色表示已确认结果。图算法使用固定示例图。</p><p><kbd>Space</kbd> 播放 / 暂停 · <kbd>←</kbd> / <kbd>→</kbd> 单步 · <kbd>R</kbd> 重置 · <kbd>/</kbd> 搜索</p>'
    : '<img class="about-computer" src="assets/happy-computer.svg" alt="笑脸电脑" width="60" height="66"><h2>Algorithm Studio</h2><p>24 种算法 · 10 种代码语言 · 无需云端计算</p><p>向经典 Macintosh 致敬，为好奇心而作。每个动画状态都与算法代码中的对应步骤连接。</p><p>本工具展示预设算法轨迹与各语言的等价代码示例；不提供代码编辑或编译执行。某些代码是函数片段，需要语言对应的标准库、类型与运行入口。</p><p class="about-version">Version 1.0 · MIT License</p>';
  $('info-dialog').showModal();
}

$('category-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderCatalog();
});
$('algorithm-search').addEventListener('input', renderCatalog);
$('algorithm-grid').addEventListener('click', event => {
  const card = event.target.closest('[data-algorithm]');
  if (card) navigate(card.dataset.algorithm);
});
for (const id of ['back-button', 'menu-library', 'window-home']) $(id).addEventListener('click', () => navigate());
$('menu-help').addEventListener('click', () => showDialog('help'));
$('menu-about').addEventListener('click', () => showDialog('about'));
$('close-dialog').addEventListener('click', () => $('info-dialog').close());
$('window-focus').addEventListener('click', () => {
  const focus = document.body.classList.toggle('focus-mode');
  $('window-focus').setAttribute('aria-pressed', String(focus));
});
$('language-select').innerHTML = languages.map(language => `<option value="${language.id}">${language.name}</option>`).join('');
$('language-select').addEventListener('change', () => {
  state.language = $('language-select').value;
  try { localStorage.setItem('algorithm-studio-language', state.language); } catch { /* optional */ }
  renderCode();
  renderStep();
});
$('toggle-input').addEventListener('click', () => {
  $('input-panel').hidden = !$('input-panel').hidden;
  $('toggle-input').setAttribute('aria-expanded', String(!$('input-panel').hidden));
  $('toggle-input').textContent = $('input-panel').hidden ? '修改输入 ▾' : '收起输入 ▴';
});
$('input-panel').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const fields = Object.fromEntries(new FormData($('input-panel')));
    state.input = parseInput(state.algorithm, fields);
    rebuild();
  } catch (error) { $('input-error').textContent = error.message; }
});
$('randomize-input').addEventListener('click', () => {
  state.input = randomInput(state.algorithm);
  renderInputFields();
  rebuild();
});
$('play-button').addEventListener('click', togglePlay);
$('next-button').addEventListener('click', () => move(state.index + 1));
$('previous-button').addEventListener('click', () => move(state.index - 1));
$('reset-button').addEventListener('click', () => move(0));
$('timeline').addEventListener('input', () => move(Number($('timeline').value)));
$('speed-select').addEventListener('change', schedule);
$('copy-code').addEventListener('click', async () => {
  try {
    const source = state.algorithm.codes[state.language].source;
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(source);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = source;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    toast('代码已复制。');
  } catch { toast('浏览器不允许复制，请直接选择代码。'); }
});

document.addEventListener('keydown', event => {
  if ($('info-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, [contenteditable]')) return;
  if (event.key === '/' && !state.algorithm) { event.preventDefault(); $('algorithm-search').focus(); return; }
  if (!state.algorithm) return;
  if ([' ', 'ArrowRight', 'ArrowLeft', 'r', 'R'].includes(event.key)) event.preventDefault();
  if (event.key === ' ') togglePlay();
  else if (event.key === 'ArrowRight') move(state.index + 1);
  else if (event.key === 'ArrowLeft') move(state.index - 1);
  else if (event.key.toLowerCase() === 'r') move(0);
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.playing) { pause(); if (state.algorithm) renderStep(); }
});
function updateClock() {
  $('clock').textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
updateClock();
setInterval(updateClock, 30000);
renderCategories();
route();
document.documentElement.dataset.ready = 'true';
