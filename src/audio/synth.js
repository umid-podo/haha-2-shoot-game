// 짧은 Web Audio 합성 효과음. 첫 사용자 입력 이후 unlock()으로 켠다.
const GAIN = 0.08;
let ctx = null;
let muted = false;

export function unlock() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx ??= new AudioCtx();
  ctx.resume();
}

export function setMuted(value) { muted = value; }

function tone(freq, duration, type, delay = 0) {
  if (!ctx || muted) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(GAIN, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playEvents(events) {
  for (const e of events) {
    if (e.type === 'fire') tone(520, 0.06, 'square');
    if (e.type === 'hit') { tone(880, 0.08, 'square'); tone(1320, 0.12, 'square', 0.08); }
    if (e.type === 'result') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.13));
  }
}
