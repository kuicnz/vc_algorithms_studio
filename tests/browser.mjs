import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

// Real browser integration tests, using Node's native WebSocket/CDP instead of a dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = await mkdtemp(resolve(tmpdir(), 'vc-algorithms-browser-'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let chrome, socket;
const errors = [];
let browserLog = '';

try {
  chrome = spawn(process.env.CHROME_BIN || 'chromium', [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${artifacts}/profile`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const debugURL = await new Promise((resolveDebug, reject) => {
    const timer = setTimeout(() => reject(new Error(`Chromium startup timed out. ${browserLog.slice(-1200)}`)), 15000);
    chrome.on('error', error => { clearTimeout(timer); reject(error); });
    chrome.stderr.on('data', chunk => {
      browserLog += chunk.toString();
      const match = browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolveDebug(match[1]); }
    });
  });
  const debugHost = new URL(debugURL).host;
  const targets = await (await fetch(`http://${debugHost}/json/list`)).json();
  const target = targets.find(item => item.type === 'page');
  assert.ok(target, 'Chromium has no page target');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description ?? ''));
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  });
  const command = (method, params = {}) => new Promise((resolveCommand, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP command timed out: ${method}`)); }, 30000);
    pending.set(id, { resolve: resolveCommand, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await command('Runtime.enable');
  await command('Log.enable');
  await command('Page.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: base });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.documentElement?.dataset.ready === "true"')) break;
    if (attempt === 99) throw new Error('Application did not initialize');
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  assert.equal(await evaluate('document.querySelectorAll(".algorithm-card").length'), 28);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark', 'First visit should use the dark theme');
  await evaluate(`document.getElementById('theme-toggle').click()`);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'light');
  await evaluate(`window.__audioStarted=0;const audio=window.AudioContext||window.webkitAudioContext;if(audio){const create=audio.prototype.createOscillator;audio.prototype.createOscillator=function(...args){window.__audioStarted++;return create.apply(this,args)}}`);
  await evaluate(`document.querySelector('[data-category="sorting"]').click()`);
  assert.equal(await evaluate('document.querySelectorAll(".algorithm-card").length'), 8);
  await evaluate(`document.querySelector('[data-category="all"]').click(); const search = document.getElementById('algorithm-search'); search.value='binary'; search.dispatchEvent(new Event('input'));`);
  assert.equal(await evaluate('document.querySelectorAll(".algorithm-card").length'), 2);
  await evaluate(`document.querySelector('.algorithm-card').click()`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  assert.equal(await evaluate('document.getElementById("demo-title").textContent'), '二分搜索');

  const matrix = await evaluate(`(async () => {
    const { algorithms, languages } = await import('/js/catalog.js');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const $ = id => document.getElementById(id);
    let combinations = 0, snapshots = 0;
    for (const algorithm of algorithms) {
      location.hash = algorithm.id;
      await new Promise(resolve => setTimeout(resolve, 15));
      check($('demo-title').textContent === algorithm.name, 'Routing failed: ' + algorithm.id);
      const trace = algorithm.build(structuredClone(algorithm.defaults));
      check(Number($('timeline').max) === trace.steps.length - 1, 'Wrong trace size: ' + algorithm.id);
      for (const language of languages) {
        $('language-select').value = language.id;
        $('language-select').dispatchEvent(new Event('change'));
        check($('code-lines').textContent.includes(algorithm.codes[language.id].source.split('\\n')[0]), 'Missing source: ' + algorithm.id + '/' + language.id);
        for (const index of [0, Math.floor(trace.steps.length / 2), trace.steps.length - 1]) {
          $('timeline').value = String(index);
          $('timeline').dispatchEvent(new Event('input'));
          const actual = [...document.querySelectorAll('.code-line.current')].map(line => Number(line.dataset.line));
          const expected = [...new Set(algorithm.codes[language.id].tags[trace.steps[index].tag])].sort((a,b) => a-b);
          check(JSON.stringify(actual) === JSON.stringify(expected), 'Incorrect highlight: ' + algorithm.id + '/' + language.id);
          check($('step-description').textContent === trace.steps[index].description, 'Wrong explanation');
          check($('visualization').childElementCount > 0, 'Empty visualization');
          snapshots++;
        }
        check($('stage-status').textContent === '演示完成', 'Incomplete final state');
        combinations++;
      }
    }
    return { combinations, snapshots };
  })()`);
  assert.equal(matrix.combinations, 280);
  assert.equal(matrix.snapshots, 840);
  console.log(`PASS: ${matrix.combinations} algorithm/language combinations, ${matrix.snapshots} synchronized UI snapshots`);

  await evaluate(`location.hash='bubble'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  await evaluate(`document.getElementById('next-button').click()`);
  assert.equal(await evaluate('Number(document.getElementById("timeline").value)'), 1);
  await evaluate(`document.getElementById('previous-button').click()`);
  assert.equal(await evaluate('Number(document.getElementById("timeline").value)'), 0);
  await evaluate(`document.getElementById('speed-select').value='4';document.getElementById('play-button').click()`);
  await new Promise(resolveWait => setTimeout(resolveWait, 500));
  assert.ok(await evaluate('Number(document.getElementById("timeline").value) >= 1'));
  await evaluate(`document.getElementById('play-button').click()`);
  const paused = await evaluate('document.getElementById("timeline").value');
  await new Promise(resolveWait => setTimeout(resolveWait, 300));
  assert.equal(await evaluate('document.getElementById("timeline").value'), paused);
  await evaluate(`document.getElementById('reset-button').click();document.getElementById('toggle-input').click();document.querySelector('input[name="values"]').value='9, 1, 4';document.getElementById('input-panel').requestSubmit()`);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".bar-value")].map(element => Number(element.textContent))'), [9, 1, 4]);
  await evaluate(`const timeline = document.getElementById('timeline');timeline.value=timeline.max;timeline.dispatchEvent(new Event('input'))`);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".bar-value")].map(element => Number(element.textContent))'), [1, 4, 9]);
  await evaluate(`document.querySelector('input[name="values"]').value='bad';document.getElementById('input-panel').requestSubmit()`);
  assert.ok(await evaluate('document.getElementById("input-error").textContent.length > 0'));
  await evaluate(`document.getElementById('menu-help').click()`);
  assert.equal(await evaluate('document.getElementById("info-dialog").open'), true);
  await evaluate(`document.getElementById('close-dialog').click()`);
  console.log('PASS: categories, search, routing, playback, pause, stepping, reset, editing, validation, help');

  const customInputs = await evaluate(`(async () => {
    const $ = id => document.getElementById(id);
    const examples = [
      ['binary', { values: '9,1,4', target: '7' }, -1],
      ['fibonacci', { n: '0' }, 0],
      ['knapsack', { weights: '2,3', values: '4,5', capacity: '0' }, 0],
      ['lcs', { textA: '', textB: '' }, 0],
      ['edit-distance', { textA: '', textB: 'ABC' }, 3],
      ['coin-change', { coins: '2', amount: '3' }, -1],
    ];
    for (const [id, fields, expected] of examples) {
      location.hash = id;
      await new Promise(resolve => setTimeout(resolve, 15));
      $('toggle-input').click();
      for (const [name, value] of Object.entries(fields)) $('input-panel').elements.namedItem(name).value = value;
      $('input-panel').requestSubmit();
      if ($('input-error').textContent) throw new Error('Unexpected input error: ' + id);
      $('timeline').value = $('timeline').max;
      $('timeline').dispatchEvent(new Event('input'));
      if (id === 'binary') {
        if (!$('step-description').textContent.includes('没有目标')) throw new Error('Missing target failed');
      } else {
        const result = [...document.querySelectorAll('.metric')].find(element => element.textContent.includes('结果'));
        if (!result || Number(result.querySelector('b').textContent) !== expected) throw new Error('Boundary input failed: ' + id);
      }
    }
    location.hash = 'bfs';
    await new Promise(resolve => setTimeout(resolve, 15));
    $('toggle-input').click();
    $('input-panel').elements.namedItem('start').value = 'F';
    $('input-panel').requestSubmit();
    if (!$('step-description').textContent.includes('F')) throw new Error('Graph start did not update');
    document.activeElement.blur();
    return examples.length + 1;
  })()`);
  assert.equal(customInputs, 7);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  assert.equal(await evaluate('Number(document.getElementById("timeline").value)'), 1);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'r', code: 'KeyR', windowsVirtualKeyCode: 82 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'r', code: 'KeyR', windowsVirtualKeyCode: 82 });
  assert.equal(await evaluate('Number(document.getElementById("timeline").value)'), 0);
  console.log('PASS: all input types, empty strings, zero capacity, missing target, unreachable amount, graph start, keyboard shortcuts');
  assert.ok(await evaluate('window.__audioStarted > 0'), 'A real user gesture did not produce Web Audio tones');

  // Finish-and-repeat behavior: use a short trace and keep the final frame visible.
  await evaluate(`location.hash='fibonacci'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 40));
  await evaluate(`document.getElementById('toggle-input').click();document.querySelector('input[name="n"]').value='0';document.getElementById('input-panel').requestSubmit();document.getElementById('speed-select').value='4';document.getElementById('play-button').click()`);
  await new Promise(resolveWait => setTimeout(resolveWait, 280));
  assert.equal(await evaluate('document.getElementById("stage-status").textContent'), '完成 · 即将重播');
  assert.equal(await evaluate('document.getElementById("play-button").textContent'), 'Ⅱ 暂停');
  // Poll for restart rather than relying on a single frame's exact timing.
  let replayed = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    if (await evaluate('Number(document.getElementById("timeline").value) === 0')) { replayed = true; break; }
    await new Promise(resolveWait => setTimeout(resolveWait, 70));
  }
  assert.ok(replayed, 'Completed playback did not replay');
  await evaluate(`document.getElementById('play-button').click()`);
  const replayPaused = await evaluate('document.getElementById("timeline").value');
  await new Promise(resolveWait => setTimeout(resolveWait, 1300));
  assert.equal(await evaluate('document.getElementById("timeline").value'), replayPaused, 'Pause did not cancel replay');
  console.log('PASS: automatic replay with completion hold and cancellation');

  await evaluate(`location.hash='astar'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 40));
  await evaluate(`document.getElementById('next-button').click();document.getElementById('toggle-input').click();document.querySelector('select[name="goal"]').value='G'`);
  const preservedStep = await evaluate('document.getElementById("timeline").value');
  const preservedCode = await evaluate('document.getElementById("code-lines").innerHTML');
  await evaluate(`document.getElementById('theme-toggle').click();document.getElementById('ui-language-toggle').click()`);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');
  assert.equal(await evaluate('document.documentElement.lang'), 'en');
  assert.equal(await evaluate('document.getElementById("timeline").value'), preservedStep);
  assert.equal(await evaluate('document.getElementById("code-lines").innerHTML'), preservedCode);
  assert.equal(await evaluate('document.querySelector("select[name=goal]").value'), 'G', 'Locale switch discarded pending input');
  assert.equal(await evaluate('document.getElementById("play-button").textContent'), '▶ Play');
  await evaluate(`document.getElementById('sound-toggle').click()`);
  assert.equal(await evaluate('document.getElementById("sound-toggle").getAttribute("aria-pressed")'), 'false');
  const mutedCount = await evaluate('window.__audioStarted');
  await evaluate(`document.getElementById('next-button').click()`);
  assert.equal(await evaluate('window.__audioStarted'), mutedCount, 'Muted interaction still created audio');

  const englishSteps = await evaluate(`(async () => {
    const { algorithms } = await import('/js/catalog.js');
    let checked = 0;
    for (const algorithm of algorithms) {
      location.hash = algorithm.id;
      await new Promise(resolve => setTimeout(resolve, 12));
      for (const position of [Math.floor(Number(document.getElementById('timeline').max)/2), Number(document.getElementById('timeline').max)]) {
        const slider = document.getElementById('timeline'); slider.value=String(position); slider.dispatchEvent(new Event('input'));
        for (const id of ['demo-title','demo-summary','step-description','stage-metrics','visualization','stage-supplement','input-hint','breadcrumb','window-status']) {
          if (/[\u3400-\u9fff]/.test(document.getElementById(id).textContent)) throw new Error('Chinese text in English UI: '+algorithm.id+'/'+id+': '+document.getElementById(id).textContent);
        }
        checked++;
      }
    }
    return checked;
  })()`);
  assert.equal(englishSteps, 56);
  await evaluate('delete document.documentElement.dataset.ready');
  await command('Page.reload');
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.documentElement?.dataset.ready === "true"')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 40));
  }
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');
  assert.equal(await evaluate('document.documentElement.lang'), 'en');
  assert.equal(await evaluate('document.getElementById("sound-toggle").getAttribute("aria-pressed")'), 'false');
  console.log('PASS: light/dark and Chinese/English controls, 56 English states, preserved progress/drafts, persisted sound/theme/locale');

  const screenshot = async name => {
    await new Promise(resolveWait => setTimeout(resolveWait, 200));
    const captured = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`${artifacts}/${name}.png`, Buffer.from(captured.data, 'base64'));
  };
  await evaluate(`location.hash='quick'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  await evaluate(`document.getElementById('language-select').value='javascript';document.getElementById('language-select').dispatchEvent(new Event('change'));document.getElementById('timeline').value='3';document.getElementById('timeline').dispatchEvent(new Event('input'))`);
  await screenshot('desktop-demo');
  await evaluate(`location.hash='library';document.getElementById('algorithm-search').value='';document.getElementById('algorithm-search').dispatchEvent(new Event('input'))`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  await screenshot('desktop-library');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Library overflows mobile viewport');
  await screenshot('mobile-library');
  for (const id of ['quick', 'dijkstra', 'knapsack']) {
    await evaluate(`location.hash='${id}'`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `${id} overflows mobile viewport`);
  }
  await screenshot('mobile-demo');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await evaluate(`location.hash='astar'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  await screenshot('desktop-dark-astar');
  await evaluate(`location.hash='library'`);
  await new Promise(resolveWait => setTimeout(resolveWait, 50));
  await screenshot('desktop-dark-library');
  await evaluate(`document.getElementById('theme-toggle').click();document.getElementById('ui-language-toggle').click()`);
  await screenshot('desktop-light-library');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  for (const locale of ['zh-CN','en']) {
    if (await evaluate('document.documentElement.lang') !== locale) await evaluate(`document.getElementById('ui-language-toggle').click()`);
    for (const theme of ['light','dark']) {
      if (await evaluate('document.documentElement.dataset.theme') !== theme) await evaluate(`document.getElementById('theme-toggle').click()`);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `Mobile overflow: ${locale}/${theme}`);
      assert.ok(await evaluate(`['theme-toggle','ui-language-toggle','sound-toggle'].every(id=>{ const box=document.getElementById(id).getBoundingClientRect();return box.width>0 && box.left>=0 && box.right<=innerWidth })`), 'Mobile utilities are hidden or unreachable');
    }
  }
  await screenshot('mobile-dark-english-library');

  assert.deepEqual(errors, [], `Browser console errors: ${errors.join('\n')}`);
  console.log('PASS: desktop/mobile layouts and no browser errors');
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    const stopped = once(chrome, 'exit');
    chrome.kill('SIGTERM');
    await Promise.race([stopped, new Promise(resolveWait => setTimeout(resolveWait, 2000))]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  server.closeAllConnections();
  await new Promise(resolveClose => server.close(resolveClose));
  await rm(`${artifacts}/profile`, { recursive: true, force: true });
}
