import { algorithms, categories, languages, filterAlgorithms } from './catalog.js';
import { parseInput, randomInput, InputError } from './inputs.js';
import { escapeHTML, highlightSource, updateArray, renderTable, renderGraph, renderSupplement } from './renderers.js';
import { translate, readPreference, writePreference, dialogContent } from './i18n.js';
import { algorithmName, algorithmSummary, complexityText, stepDescription, localizeState } from './trace-i18n.js';
import { PixelSound } from './sound.js';

const $ = id => document.getElementById(id);
const savedLanguage = readPreference('algorithm-studio-language', 'javascript');
const state = {
  category: 'all', algorithm: null, input: null, steps: [], result: null, index: 0,
  playing: false, timer: null, error: null, dialogType: 'about',
  language: languages.some(item => item.id === savedLanguage) ? savedLanguage : 'javascript',
  locale: readPreference('algorithm-studio-locale', 'zh') === 'en' ? 'en' : 'zh',
  theme: readPreference('algorithm-studio-theme', 'dark') === 'light' ? 'light' : 'dark',
};
const sound = new PixelSound(readPreference('algorithm-studio-sound', 'on') !== 'off');
const t = (key, params) => translate(state.locale, key, params);
const categoryOf = algorithm => categories.find(category => category.id === algorithm.category);
const categoryName = category => state.locale === 'en' ? category.english : category.name;
const nameOf = algorithm => algorithmName(algorithm, state.locale);
let toastTimer;

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2500);
}
function renderPreferences() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.locale === 'en' ? 'en' : 'zh-CN';
  document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#111713' : '#f6f6ef';
  $('theme-toggle').textContent = t(state.theme === 'dark' ? 'themeDark' : 'themeLight');
  $('theme-toggle').setAttribute('aria-pressed', String(state.theme === 'dark'));
  $('ui-language-toggle').textContent = state.locale === 'en' ? 'EN / 中文' : '中文 / EN';
  $('ui-language-toggle').setAttribute('aria-label', t('languageHint'));
  $('sound-toggle').textContent = t(sound.enabled ? 'soundOn' : 'soundOff');
  $('sound-toggle').setAttribute('aria-pressed', String(sound.enabled));
}
function applyStaticText() {
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const [suffix, attribute] of [['placeholder', 'placeholder'], ['title', 'title'], ['label', 'aria-label'], ['alt', 'alt']]) {
    for (const element of document.querySelectorAll(`[data-i18n-${suffix}]`)) element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${suffix}`)));
  }
  $('catalog-info').textContent = t('catalogInfo', { count: algorithms.length });
  renderPreferences();
}
function renderCategories() {
  $('category-nav').innerHTML = categories.map(category => {
    const count = category.id === 'all' ? algorithms.length : algorithms.filter(algorithm => algorithm.category === category.id).length;
    return `<button type="button" class="category-button${state.category === category.id ? ' active' : ''}" data-category="${category.id}" aria-pressed="${state.category === category.id}"><span class="category-icon">${category.icon}</span><span class="category-label">${categoryName(category)}</span><span class="category-count">${count}</span></button>`;
  }).join('');
}
function renderCatalog() {
  const list = filterAlgorithms(state.category, $('algorithm-search').value);
  $('catalog-title').textContent = categoryName(categories.find(category => category.id === state.category));
  $('catalog-count').textContent = t('count', { count: list.length });
  $('algorithm-grid').innerHTML = list.map(algorithm => {
    const name = nameOf(algorithm);
    const summary = algorithmSummary(algorithm, state.locale);
    return `<div role="listitem" class="algorithm-list-item"><button type="button" class="algorithm-row algorithm-card" data-algorithm="${algorithm.id}" title="${escapeHTML(summary)}"><span class="row-index">${String(algorithms.indexOf(algorithm) + 1).padStart(2, '0')}</span><span class="row-name"><h4>${escapeHTML(name)}</h4>${state.locale === 'zh' ? `<span class="row-english">${escapeHTML(algorithm.nameEn)}</span>` : ''}</span><span class="row-category">${escapeHTML(categoryName(categoryOf(algorithm)))}</span><span class="row-summary">${escapeHTML(summary)}</span><span class="row-complexity">${escapeHTML(complexityText(algorithm.complexity.time, state.locale))}</span><span class="row-arrow" aria-hidden="true">↗</span></button></div>`;
  }).join('');
  $('empty-state').hidden = list.length !== 0;
}
function renderPlayButton() {
  $('play-button').textContent = t(state.playing ? 'pause' : 'play');
  $('play-button').setAttribute('aria-label', t(state.playing ? 'pause' : 'play'));
}
function pause() {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  renderPlayButton();
}
function renderLibraryText() {
  $('breadcrumb').textContent = `${t('studio')} / ${t('library')}`;
  $('window-status').textContent = t('loaded', { count: algorithms.length });
  document.title = `${t('studio')} · Algorithm Studio`;
}
function showLibrary() {
  pause();
  state.algorithm = null;
  $('library-view').hidden = false;
  $('demo-view').hidden = true;
  renderLibraryText();
  renderCatalog();
}
function navigate(id = 'library') {
  if (location.hash === `#${id}`) route();
  else location.hash = id;
}
function route() {
  const id = location.hash.slice(1);
  const algorithm = algorithms.find(item => item.id === id);
  if (!algorithm) {
    showLibrary();
    if (id && id !== 'library') toast(t('notFound'));
  } else openAlgorithm(algorithm);
}
function renderDemoText() {
  const algorithm = state.algorithm;
  const category = categoryOf(algorithm);
  $('demo-category').textContent = categoryName(category);
  $('demo-title').textContent = nameOf(algorithm);
  $('demo-summary').textContent = algorithmSummary(algorithm, state.locale);
  $('time-complexity').textContent = complexityText(algorithm.complexity.time, state.locale);
  $('space-complexity').textContent = complexityText(algorithm.complexity.space, state.locale);
  $('breadcrumb').textContent = `${t('studio')} / ${categoryName(category)} / ${nameOf(algorithm)}`;
  $('animation-type').textContent = { array: 'ARRAY VIEW', graph: 'GRAPH VIEW', table: 'STATE TABLE' }[algorithm.kind];
  $('window-status').textContent = t('codeCount', { name: nameOf(algorithm) });
  $('toggle-input').textContent = t($('input-panel').hidden ? 'editInput' : 'hideInput');
  document.title = `${nameOf(algorithm)} · Algorithm Studio`;
  renderPlayButton();
}
function openAlgorithm(algorithm) {
  pause();
  state.algorithm = algorithm;
  state.input = structuredClone(algorithm.defaults);
  $('library-view').hidden = true;
  $('demo-view').hidden = false;
  $('input-panel').hidden = true;
  $('toggle-input').setAttribute('aria-expanded', 'false');
  $('toggle-input').hidden = ['kruskal', 'topological'].includes(algorithm.id);
  setInputError(null);
  renderDemoText();
  renderInputFields();
  renderCode();
  rebuild();
}
function setInputError(error) {
  state.error = error;
  $('input-error').textContent = error ? error instanceof InputError ? error.localized(state.locale) : error.message : '';
}
function rebuild() {
  pause();
  try {
    const trace = state.algorithm.build(structuredClone(state.input));
    if (!trace.steps.length) throw new InputError('error.trace');
    state.steps = trace.steps;
    state.result = trace.result;
    state.index = 0;
    $('timeline').max = String(state.steps.length - 1);
    setInputError(null);
    renderStep();
  } catch (error) {
    setInputError(error);
    $('input-panel').hidden = false;
    $('toggle-input').setAttribute('aria-expanded', 'true');
    toast(t('error.rebuild'));
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
  if (!lines?.length) throw new Error(`Missing mapping: ${state.algorithm.id}/${state.language}/${step.tag}`);
  $('code-lines').querySelectorAll('.current').forEach(element => {
    element.classList.remove('current'); element.removeAttribute('aria-current');
  });
  let first;
  for (const line of lines) {
    const element = $('code-lines').querySelector(`[data-line="${line}"]`);
    if (element) { element.classList.add('current'); element.setAttribute('aria-current', 'step'); first ??= element; }
  }
  $('code-location').textContent = t('lines', { lines: lines.join(', ') });
  if (first) {
    const scroller = $('code-scroller');
    const top = first.offsetTop - $('code-lines').offsetTop;
    if (top < scroller.scrollTop + 20 || top > scroller.scrollTop + scroller.clientHeight - 45) scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 3);
  }
}
function renderStep(audible = false) {
  const step = state.steps[state.index];
  highlightStep(step);
  const visual = localizeState(state.algorithm, step.state, state.locale);
  if (visual.type === 'array') updateArray($('visualization'), visual, state.locale);
  else $('visualization').innerHTML = visual.type === 'graph' ? renderGraph(visual, state.locale) : renderTable(visual, state.locale);
  $('stage-supplement').innerHTML = renderSupplement(visual, state.algorithm.id, state.locale);
  $('stage-metrics').innerHTML = Object.entries(visual.metrics ?? {}).map(([name, value]) => `<span class="metric">${escapeHTML(t(`metric.${name}`))} <b class="metric-value">${escapeHTML(value)}</b></span>`).join('');
  $('step-number').textContent = `STEP ${String(state.index + 1).padStart(3, '0')}`;
  $('step-description').textContent = stepDescription(state.algorithm, step, state.locale, state.input);
  $('step-counter').textContent = `${state.index + 1} / ${state.steps.length}`;
  $('timeline').value = String(state.index);
  $('timeline').setAttribute('aria-valuetext', t('progressValue', { step: state.index + 1, count: state.steps.length }));
  $('previous-button').disabled = state.index === 0;
  $('next-button').disabled = state.index === state.steps.length - 1;
  const complete = state.index === state.steps.length - 1;
  $('stage-status').textContent = t(complete ? state.playing ? 'replaySoon' : 'complete' : state.playing ? 'running' : state.index === 0 ? 'ready' : 'paused');
  if (audible) sound.play(complete ? 'complete' : 'step', step.tag);
  const active = $('visualization').querySelector('td.active');
  const scroll = $('visualization').querySelector('.dp-scroll');
  if (active && scroll && active.offsetLeft > scroll.clientWidth - 70) scroll.scrollLeft = Math.max(0, active.offsetLeft - scroll.clientWidth / 2);
}
function move(index) {
  if (!state.algorithm) return;
  pause();
  state.index = Math.max(0, Math.min(state.steps.length - 1, index));
  renderStep(true);
}
function schedule() {
  clearTimeout(state.timer);
  if (!state.playing) return;
  const complete = state.index === state.steps.length - 1;
  // Hold the result briefly, then restart. Pause/seek/navigation cancels this same timer.
  const delay = complete ? 1200 : 820 / Number($('speed-select').value);
  state.timer = setTimeout(() => {
    if (!state.playing) return;
    state.index = state.index === state.steps.length - 1 ? 0 : state.index + 1;
    renderStep(true);
    schedule();
  }, delay);
}
function togglePlay() {
  if (!state.algorithm) return;
  if (state.playing) { pause(); renderStep(); return; }
  if (state.index === state.steps.length - 1) state.index = 0;
  state.playing = true;
  renderPlayButton();
  renderStep();
  schedule();
}
function field(name, label, value, options = {}) {
  const shown = Array.isArray(value) ? value.join(', ') : value;
  if (options.nodes) return `<label class="input-field">${label}<select name="${name}">${options.nodes.map(node => `<option value="${node.id}"${node.id === value ? ' selected' : ''}>${node.id}</option>`).join('')}</select></label>`;
  return `<label class="input-field">${label}<input name="${name}" value="${escapeHTML(shown)}" ${options.numeric ? 'inputmode="numeric"' : ''} ${options.maxlength ? `maxlength="${options.maxlength}"` : ''} autocomplete="off" spellcheck="false"></label>`;
}
function renderInputFields(drafts = {}) {
  const input = { ...state.input, ...drafts };
  const type = state.algorithm.inputType;
  const f = (key, nameKey = key, numeric = false) => field(key, key === 'n' ? 'n' : t(`field.${nameKey}`), input[key], { numeric });
  const node = key => field(key, t(`field.${key}`), input[key], { nodes: state.algorithm.graph.nodes });
  let markup = '';
  if (type === 'array') markup = f('values');
  else if (type === 'search') markup = f('values') + f('target', 'target', true);
  else if (type === 'graph') markup = node('start');
  else if (type === 'pathfinding') markup = node('start') + node('goal');
  else if (type === 'fibonacci') markup = f('n', 'n', true);
  else if (['knapsack', 'fractional'].includes(type)) markup = f('weights') + f('values', 'itemValues') + f('capacity', 'capacity', true);
  else if (type === 'activities') markup = f('starts') + f('ends');
  else if (type === 'strings') markup = field('textA', t('field.textA'), input.textA, { maxlength: 10 }) + field('textB', t('field.textB'), input.textB, { maxlength: 10 });
  else if (['coins', 'greedy-coins'].includes(type)) markup = f('coins') + f('amount', 'amount', true);
  $('input-fields').innerHTML = markup;
  $('input-hint').textContent = t(`hint.${state.algorithm.id === 'counting' ? 'counting' : type}`);
}
function renderDialog() {
  $('dialog-title').textContent = t(state.dialogType === 'help' ? 'help' : 'aboutTitle');
  $('dialog-content').innerHTML = dialogContent(state.locale, state.dialogType, algorithms.length);
}
function showDialog(type) { state.dialogType = type; renderDialog(); $('info-dialog').showModal(); }
function updateClock() {
  $('clock').textContent = new Intl.DateTimeFormat(state.locale === 'en' ? 'en-NZ' : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
function switchLocale() {
  const drafts = state.algorithm ? Object.fromEntries(new FormData($('input-panel'))) : null;
  state.locale = state.locale === 'zh' ? 'en' : 'zh';
  writePreference('algorithm-studio-locale', state.locale);
  applyStaticText(); renderCategories(); renderCatalog(); updateClock();
  if (state.algorithm) { renderDemoText(); renderInputFields(drafts); setInputError(state.error); renderStep(); }
  else renderLibraryText();
  if ($('info-dialog').open) renderDialog();
}

$('category-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories(); renderCatalog();
});
$('algorithm-search').addEventListener('input', renderCatalog);
$('algorithm-grid').addEventListener('click', event => { const row = event.target.closest('[data-algorithm]'); if (row) navigate(row.dataset.algorithm); });
for (const id of ['back-button', 'menu-library', 'window-home']) $(id).addEventListener('click', () => navigate());
$('menu-help').addEventListener('click', () => showDialog('help'));
$('menu-about').addEventListener('click', () => showDialog('about'));
$('close-dialog').addEventListener('click', () => $('info-dialog').close());
$('window-focus').addEventListener('click', () => { const focus = document.body.classList.toggle('focus-mode'); $('window-focus').setAttribute('aria-pressed', String(focus)); });
$('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  writePreference('algorithm-studio-theme', state.theme); renderPreferences();
});
$('ui-language-toggle').addEventListener('click', switchLocale);
$('sound-toggle').addEventListener('click', () => {
  sound.setEnabled(!sound.enabled); writePreference('algorithm-studio-sound', sound.enabled ? 'on' : 'off'); renderPreferences();
});
$('language-select').innerHTML = languages.map(language => `<option value="${language.id}">${language.name}</option>`).join('');
$('language-select').addEventListener('change', () => {
  state.language = $('language-select').value;
  writePreference('algorithm-studio-language', state.language);
  renderCode(); renderStep(); sound.play('select');
});
$('toggle-input').addEventListener('click', () => {
  $('input-panel').hidden = !$('input-panel').hidden;
  $('toggle-input').setAttribute('aria-expanded', String(!$('input-panel').hidden));
  $('toggle-input').textContent = t($('input-panel').hidden ? 'editInput' : 'hideInput');
});
$('input-panel').addEventListener('submit', event => {
  event.preventDefault();
  try { state.input = parseInput(state.algorithm, Object.fromEntries(new FormData($('input-panel')))); rebuild(); }
  catch (error) { setInputError(error); }
});
$('randomize-input').addEventListener('click', () => { state.input = randomInput(state.algorithm); renderInputFields(); rebuild(); });
$('play-button').addEventListener('click', togglePlay);
$('next-button').addEventListener('click', () => move(state.index + 1));
$('previous-button').addEventListener('click', () => move(state.index - 1));
$('reset-button').addEventListener('click', () => move(0));
$('timeline').addEventListener('input', () => move(Number($('timeline').value)));
$('speed-select').addEventListener('change', () => { schedule(); sound.play('select'); });
$('copy-code').addEventListener('click', async () => {
  try {
    const source = state.algorithm.codes[state.language].source;
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(source);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = source; textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(textarea); textarea.select();
      const copied = document.execCommand('copy'); textarea.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    toast(t('copied'));
  } catch { toast(t('copyFailed')); }
});
// Resume Web Audio only inside a user gesture; unsupported browsers remain silent.
for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, () => sound.unlock(), { capture: true, passive: true });
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  sound.play(button.matches('[data-algorithm], [data-category]') ? 'select' : 'click');
});
$('algorithm-grid').addEventListener('pointerover', event => { if (event.target.closest('[data-algorithm]')) sound.play('select'); });
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
  if (document.hidden) { sound.stop(); if (state.playing) { pause(); if (state.algorithm) renderStep(); } }
});
applyStaticText(); updateClock(); setInterval(updateClock, 30000);
renderCategories(); route();
document.documentElement.dataset.ready = 'true';
