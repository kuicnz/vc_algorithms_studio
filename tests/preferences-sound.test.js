import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelSound } from '../js/sound.js';
import { messages, translate, readPreference, writePreference, dialogContent } from '../js/i18n.js';
import { parseInput, randomInput, InputError } from '../js/inputs.js';
import { algorithms } from '../js/catalog.js';

test('every UI message has Chinese/English variants and placeholders interpolate', () => {
  for (const [key, pair] of Object.entries(messages)) {
    assert.equal(pair.length, 2, key);
    for (const message of pair) assert.ok(message.length > 0, key);
  }
  assert.equal(translate('en', 'progressValue', { step: 2, count: 10 }), 'Step 2 of 10');
  assert.equal(translate('zh', 'count', { count: 28 }), '28 个算法');
  assert.throws(() => translate('en', 'missing-key'));
  assert.ok(dialogContent('en', 'about', 28).includes('28 algorithms'));
  assert.ok(dialogContent('en', 'help', 28).includes('loops'));
});

test('preferences fall back safely when browser storage is blocked', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Blocked'); } });
  try {
    assert.equal(readPreference('theme', 'light'), 'light');
    assert.doesNotThrow(() => writePreference('theme', 'dark'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('all random input profiles pass the same validation as user input', () => {
  for (const algorithm of algorithms) for (let iteration = 0; iteration < 10; iteration++) {
    const input = randomInput(algorithm);
    const fields = Object.fromEntries(Object.entries(input).map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)]));
    assert.deepEqual(parseInput(algorithm, fields), input, algorithm.id);
  }
});

test('new input profiles reject invalid graph endpoints and mismatched greedy items', () => {
  const byId = id => algorithms.find(algorithm => algorithm.id === id);
  assert.throws(() => parseInput(byId('astar'), { start: 'E', goal: 'I' }), InputError);
  assert.throws(() => parseInput(byId('astar'), { start: 'A', goal: 'E' }), InputError);
  assert.throws(() => parseInput(byId('activity-selection'), { starts: '2,3', ends: '2,4' }), InputError);
  assert.throws(() => parseInput(byId('fractional-knapsack'), { weights: '10,20', values: '60', capacity: '50' }), InputError);
  try { parseInput(byId('fibonacci'), { n: '21' }); }
  catch (error) { assert.equal(error.localized('en'), 'n must be between 0 and 20.'); }
});

function fakeAudio() {
  const oscillators = [];
  const context = {
    state: 'running', currentTime: 0, destination: {},
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime(pitch) { oscillator.pitch = pitch; } }, connect() {}, disconnect() {}, start(time) { oscillator.started = time; }, stop(time) { oscillator.stopped = time ?? 'now'; } };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
    resume() { this.state = 'running'; return Promise.resolve(); },
  };
  return { context, oscillators };
}

test('sound waits for a gesture, throttles selection/step tones, and fully mutes', () => {
  const { context, oscillators } = fakeAudio();
  let created = 0;
  const sound = new PixelSound(true, () => { created++; return context; });
  sound.play('click');
  assert.equal(created, 0);
  assert.equal(oscillators.length, 0);
  sound.unlock();
  assert.equal(created, 1);
  sound.play('select'); sound.play('select');
  assert.equal(oscillators.length, 1);
  context.currentTime = 0.2;
  sound.play('step', 'compare'); sound.play('step', 'swap');
  assert.equal(oscillators.length, 2);
  context.currentTime = 0.4;
  sound.play('step', 'swap');
  assert.equal(oscillators.at(-1).pitch, 520);
  sound.play('complete');
  assert.deepEqual(oscillators.slice(-3).map(item => item.pitch), [523, 659, 784]);
  sound.setEnabled(false);
  assert.equal(sound.voices.size, 0);
  assert.ok(oscillators.every(item => item.stopped === 'now'));
  const previousCount = oscillators.length;
  sound.play('complete'); sound.unlock();
  assert.equal(oscillators.length, previousCount);
  sound.setEnabled(true); sound.play('click');
  assert.equal(oscillators.length, previousCount + 2);
});

test('unavailable audio is harmless and suspended audio resumes in unlock', () => {
  const silent = new PixelSound(true, () => null);
  assert.doesNotThrow(() => { silent.unlock(); silent.play('click'); silent.setEnabled(false); });
  const { context } = fakeAudio();
  context.state = 'suspended';
  const sound = new PixelSound(true, () => context);
  sound.unlock();
  assert.equal(context.state, 'running');
});
