import { translate } from './i18n.js';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const has = (list, value) => Array.isArray(list) && list.includes(value);
const cellHas = (list, row, column) => Array.isArray(list) && list.some(cell => cell[0] === row && cell[1] === column);
const numberLabel = value => value === Infinity ? '∞' : value === -Infinity ? '−∞' : String(value);

function arrayNote(state, locale) {
  if (state.range) return translate(locale, 'array.range', { range: state.range.join(', ') }) + (state.target !== undefined ? ` · ${translate(locale, 'array.target', { target: state.target })}` : '');
  return state.target !== undefined ? translate(locale, 'array.targetOnly', { target: state.target }) : translate(locale, 'array.note');
}

export function renderArray(state, locale = 'zh') {
  const values = state.values;
  const largest = Math.max(1, ...values.map(value => Math.abs(value)));
  const bars = values.map((value, index) => {
    const classes = ['bar-item', has(state.active, index) ? 'active' : '', has(state.secondary, index) ? 'secondary' : '', has(state.sorted, index) ? 'sorted' : '', state.found === index ? 'found' : ''].filter(Boolean).join(' ');
    const height = 14 + Math.abs(value) / largest * 86;
    return `<div class="${classes}" aria-label="${escapeHTML(translate(locale, 'array.index', { index, value }))}"><span class="bar-value">${value}</span><div class="bar-fill ${value < 0 ? 'negative' : ''}" style="height:${height}%"></div><span class="bar-index">${index}</span></div>`;
  }).join('');
  const range = `<div class="range-note">${escapeHTML(arrayNote(state, locale))}</div>`;
  return `<div class="array-stage"><div class="bars-container" style="--count:${Math.max(1, values.length)}">${bars || `<span>${translate(locale, 'array.empty')}</span>`}</div>${range}</div>`;
}

export function updateArray(container, state, locale = 'zh') {
  const existing = container.querySelectorAll('.bar-item');
  if (!container.querySelector('.array-stage') || existing.length !== state.values.length) {
    container.innerHTML = renderArray(state, locale);
    return;
  }
  // Retain bars between steps: height and color can animate from their previous state.
  const largest = Math.max(1, ...state.values.map(value => Math.abs(value)));
  existing.forEach((item, index) => {
    const value = state.values[index];
    item.className = ['bar-item', has(state.active, index) ? 'active' : '', has(state.secondary, index) ? 'secondary' : '', has(state.sorted, index) ? 'sorted' : '', state.found === index ? 'found' : ''].filter(Boolean).join(' ');
    item.setAttribute('aria-label', translate(locale, 'array.index', { index, value }));
    item.querySelector('.bar-value').textContent = value;
    const fill = item.querySelector('.bar-fill');
    fill.classList.toggle('negative', value < 0);
    fill.style.height = `${14 + Math.abs(value) / largest * 86}%`;
  });
  const note = container.querySelector('.range-note');
  note.textContent = arrayNote(state, locale);
}

export function renderTable(state, locale = 'zh') {
  const headings = state.columnLabels.map(value => `<th scope="col">${escapeHTML(value)}</th>`).join('');
  const rows = state.matrix.map((row, rowIndex) => `<tr><th scope="row">${escapeHTML(state.rowLabels[rowIndex] ?? rowIndex)}</th>${row.map((value, columnIndex) => {
    const classes = [cellHas(state.active, rowIndex, columnIndex) ? 'active' : '', cellHas(state.secondary, rowIndex, columnIndex) ? 'secondary' : '', cellHas(state.path, rowIndex, columnIndex) ? 'path' : ''].filter(Boolean).join(' ');
    return `<td class="${classes}" data-row="${rowIndex}" data-column="${columnIndex}">${escapeHTML(numberLabel(value))}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="dp-scroll"><table class="dp-table"><thead><tr><th scope="col">${translate(locale, 'table.state')}</th>${headings}</tr></thead><tbody>${rows}</tbody></table></div>${state.note ? `<p class="range-note">${escapeHTML(state.note)}</p>` : ''}`;
}

function edgeHas(list, from, to, directed) {
  return Array.isArray(list) && list.some(edge => {
    const a = Array.isArray(edge) ? edge[0] : edge.from;
    const b = Array.isArray(edge) ? edge[1] : edge.to;
    return a === from && b === to || !directed && a === to && b === from;
  });
}

export function renderGraph(state, locale = 'zh') {
  const position = node => ({ x: 45 + node.x * 430, y: 38 + node.y * 210 });
  const nodes = new Map(state.nodes.map(node => [node.id, { ...node, ...position(node) }]));
  const edges = state.edges.map(edge => {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const unitX = dx / length;
    const unitY = dy / length;
    const active = edgeHas(state.activeEdges, edge.from, edge.to, state.directed);
    const selected = edgeHas(state.selectedEdges, edge.from, edge.to, state.directed);
    const className = `graph-edge${selected ? ' selected' : ''}${active ? ' active' : ''}`;
    const middleX = (from.x + to.x) / 2 - unitY * 12;
    const middleY = (from.y + to.y) / 2 + unitX * 12;
    return `<line class="${className}" x1="${from.x + unitX * 23}" y1="${from.y + unitY * 23}" x2="${to.x - unitX * 27}" y2="${to.y - unitY * 27}" ${state.directed ? 'marker-end="url(#arrowhead)"' : ''}/>${edge.weight !== undefined ? `<text class="graph-weight" x="${middleX}" y="${middleY}">${escapeHTML(edge.weight)}</text>` : ''}`;
  }).join('');
  const circles = [...nodes.values()].map(node => `<g class="graph-node${has(state.visited, node.id) ? ' visited' : ''}${has(state.frontier, node.id) ? ' frontier' : ''}${has(state.active, node.id) ? ' active' : ''}" transform="translate(${node.x} ${node.y})"><circle r="23"/><text dy="5">${escapeHTML(node.id)}</text></g>`).join('');
  const obstacle = state.nodes.every(node => node.column !== undefined) && !state.nodes.some(node => node.column === 1 && node.row === 1) ? '<g class="graph-obstacle" transform="translate(260 143)"><rect x="-30" y="-24" width="60" height="48"/><text dy="5">×</text></g>' : '';
  return `<svg class="graph-svg" viewBox="0 0 520 290" role="img" aria-label="${escapeHTML(translate(locale, state.directed ? 'graph.directed' : 'graph.undirected', { nodes: state.nodes.map(node => node.id).join(', ') }))}"><defs><marker id="arrowhead" class="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${obstacle}${edges}${circles}</svg>`;
}

export function renderSupplement(state, algorithmId, locale = 'zh') {
  if (state.type === 'array') {
    return (state.aux ?? []).map(item => `<div class="aux-row"><span class="aux-label">${escapeHTML(item.label)}</span><div class="aux-values">${item.values.map(value => `<span>${escapeHTML(numberLabel(value))}</span>`).join('')}</div></div>`).join('');
  }
  if (state.type !== 'graph') return '';
  const chips = (label, list) => `<div class="queue-chips"><span>${label}</span>${list?.length ? list.map(value => `<b class="node-chip">${escapeHTML(value)}</b>`).join('') : '<i>—</i>'}</div>`;
  const distances = state.distances ? `<div class="distance-table">${Object.entries(state.distances).map(([node, value]) => `<span>${escapeHTML(node)} <b>${escapeHTML(numberLabel(value))}</b></span>`).join('')}</div>` : '';
  const table = state.table ? `<div class="dp-scroll"><table class="dp-table"><thead><tr>${state.table.columns.map(label => `<th>${escapeHTML(label)}</th>`).join('')}</tr></thead><tbody>${state.table.rows.map(row => `<tr>${row.map(value => `<td>${escapeHTML(numberLabel(value))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const frontierLabel = translate(locale, { bfs: 'graph.queue', dfs: 'graph.stack', dijkstra: 'graph.pending', topological: 'graph.zeroQueue', astar: 'graph.open' }[algorithmId] ?? 'graph.candidates');
  return `<div class="graph-details">${state.frontier?.length || ['bfs', 'dfs', 'topological', 'dijkstra', 'astar'].includes(algorithmId) ? chips(frontierLabel, state.frontier) : ''}${state.order?.length ? chips(translate(locale, 'graph.order'), state.order) : ''}${distances}${table}${state.note ? `<p class="range-note">${escapeHTML(state.note)}</p>` : ''}</div>`;
}

const keywords = new Set('function return let const var if else for while do break continue class public private static void int double float bool boolean long String string char new null None True False true false import from def in range len enumerate and or not elif package func type map make nil fn pub mut impl use usize i32 i64 f64 Vec Some struct match as u32 is switch case default final val using namespace auto vector size_t unsigned Infinity Math Array List Dictionary Set heapq deque'.split(' '));
export function highlightSource(line) {
  // Tokenize the original text before escaping it, so input-looking strings stay inert.
  const pattern = /(\/\/.*$|#.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
  let end = 0;
  let html = '';
  for (const match of line.matchAll(pattern)) {
    html += escapeHTML(line.slice(end, match.index));
    const token = match[0];
    const type = token.startsWith('//') || token.startsWith('#') ? 'comment' : /^["'`]/.test(token) ? 'string' : /^\d/.test(token) ? 'number' : keywords.has(token) ? 'keyword' : '';
    html += type ? `<span class="token-${type}">${escapeHTML(token)}</span>` : escapeHTML(token);
    end = match.index + token.length;
  }
  return html + escapeHTML(line.slice(end));
}
