// Tiny synthesized game sounds: no audio downloads, and no autoplay before interaction.
export class PixelSound {
  constructor(enabled = true, contextFactory = null) {
    this.enabled = enabled;
    this.context = null;
    this.contextFactory = contextFactory;
    this.voices = new Set();
    this.lastStep = -Infinity;
    this.lastSelect = -Infinity;
  }

  unlock() {
    if (!this.enabled) return;
    try {
      const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!this.context) this.context = this.contextFactory ? this.contextFactory() : Constructor ? new Constructor() : null;
      if (this.context?.state === 'suspended') this.context.resume()?.catch(() => {});
    } catch { this.context = null; }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
    else this.unlock();
  }

  stop() {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }

  tone(frequency, duration, delay = 0, volume = 0.025) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const time = this.context.currentTime + delay;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  play(kind, tag = '') {
    if (!this.enabled || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    if (kind === 'select') {
      if (now - this.lastSelect < 0.14) return;
      this.lastSelect = now;
      this.tone(740, 0.045, 0, 0.018);
    } else if (kind === 'click') {
      this.tone(440, 0.045);
      this.tone(660, 0.035, 0.04);
    } else if (kind === 'complete') {
      [523, 659, 784].forEach((pitch, index) => this.tone(pitch, 0.09, index * 0.085, 0.018));
    } else if (kind === 'step') {
      if (now - this.lastStep < 0.06) return;
      this.lastStep = now;
      const write = /swap|write|insert|shift|relax|accept|improve|choose|take|place/i.test(tag);
      this.tone(write ? 520 : 880, write ? 0.035 : 0.018, 0, 0.012);
    }
  }
}
