// DJ 연습용 테크노 트랙: 저작권 걱정 없이 전 곡을 쓸 수 있도록 브라우저에서 직접 합성해요.
// 모든 트랙은 64마디(인트로 16 · 빌드업 16 · 브레이크 8 · 드롭 16 · 아웃트로 8)이고, 첫 박이 0초에 있어요.
const DJ_SR = 32000;
const DJ_BARS = 64;
const DJ_SECTIONS = [
  { from: 0, to: 16, name: "인트로", color: "#3b82f6" },
  { from: 16, to: 32, name: "빌드업", color: "#a855f7" },
  { from: 32, to: 40, name: "브레이크", color: "#64748b" },
  { from: 40, to: 56, name: "드롭", color: "#ef4444" },
  { from: 56, to: 64, name: "아웃트로", color: "#3b82f6" }
];

// root: 베이스 음 (MIDI 번호, 33 = A1)
const DJ_TRACKS = [
  { id: "warehouse", title: "Warehouse Pulse", style: "미니멀 테크노", bpm: 124, root: 33, seed: 11,
    kick: { tone: 50, decay: 0.38 }, bass: { pattern: "offbeat", wave: "sawtooth", cutoff: 380 },
    lead: { type: "arp", wave: "sine", notes: [12, 0, 19, 0, 15, 0, 12, 24], density: 0.45, cutoff: 3000 } },
  { id: "acid", title: "Acid Rain", style: "애시드 테크노", bpm: 127, root: 36, seed: 23,
    kick: { tone: 48, decay: 0.4 }, bass: { pattern: "offbeat", wave: "square", cutoff: 300 },
    lead: { type: "acid" } },
  { id: "drive", title: "Night Drive", style: "드라이빙 테크노", bpm: 128, root: 31, seed: 37,
    kick: { tone: 46, decay: 0.42 }, bass: { pattern: "rolling", wave: "sawtooth", cutoff: 420 },
    lead: { type: "arp", wave: "sawtooth", notes: [0, 12, 7, 12, 3, 12, 10, 12], density: 1, cutoff: 1400 } },
  { id: "dub", title: "Deep Chord", style: "덥 테크노", bpm: 122, root: 34, seed: 41,
    kick: { tone: 45, decay: 0.45 }, bass: { pattern: "sub", wave: "sine", cutoff: 200 },
    lead: { type: "chords" } },
  { id: "hypno", title: "Hypnotic Loop", style: "하이프노틱 테크노", bpm: 130, root: 35, seed: 53,
    kick: { tone: 47, decay: 0.38 }, bass: { pattern: "rolling", wave: "square", cutoff: 300 },
    lead: { type: "arp", wave: "square", notes: [0, 3, 7, 10, 7, 3], density: 0.85, cutoff: 1100 } },
  { id: "peak", title: "Peak Hour", style: "하드 테크노", bpm: 134, root: 33, seed: 67,
    kick: { tone: 44, decay: 0.36, drive: 4 }, bass: { pattern: "rolling", wave: "sawtooth", cutoff: 260 },
    lead: { type: "stab" } }
];

const djMidi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const djSection = (bar) => DJ_SECTIONS.find((s) => bar >= s.from && bar < s.to) || DJ_SECTIONS[DJ_SECTIONS.length - 1];

// 같은 seed면 항상 같은 패턴이 나오는 난수
function djRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 소리 하나하나마다 노드를 만들지 않고, 계속 울리는 소리의 볼륨·음높이를 자동으로 움직여서 가볍게 만들어요.
const DJ_FLOOR = 0.0001;
function djEnv(param, t, peak, attack, hold, release) {
  param.setValueAtTime(DJ_FLOOR, t);
  param.linearRampToValueAtTime(Math.max(DJ_FLOOR, peak), t + attack);
  if (hold > 0) param.setValueAtTime(Math.max(DJ_FLOOR, peak), t + attack + hold);
  param.exponentialRampToValueAtTime(DJ_FLOOR, t + attack + hold + release);
}

function djGain(ctx, v) { const g = ctx.createGain(); g.gain.value = v; return g; }
function djFilter(ctx, type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function djNoiseVoice(ctx, noise, out, type, freq, q, level) {
  const src = ctx.createBufferSource();
  src.buffer = noise; src.loop = true;
  const f = djFilter(ctx, type, freq, q);
  const g = djGain(ctx, 0);
  src.connect(f).connect(g).connect(djGain(ctx, level)).connect(out);
  src.start(0);
  return { g: g.gain, f: f.frequency };
}

function djMono(ctx, out, wave, cutoff, q, level) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  const f = djFilter(ctx, "lowpass", cutoff, q);
  const g = djGain(ctx, 0);
  const node = djGain(ctx, level);
  osc.connect(f).connect(g).connect(node).connect(out);
  osc.start(0);
  return { freq: osc.frequency, cut: f.frequency, g: g.gain, node };
}

function djChord(ctx, out, wave, cutoff, q, level) {
  const f = djFilter(ctx, "lowpass", cutoff, q);
  const g = djGain(ctx, 0);
  const node = djGain(ctx, level);
  const oscs = [0, 1, 2].map((k) => {
    const o = ctx.createOscillator();
    o.type = wave; o.detune.value = (k - 1) * 6;
    o.connect(f); o.start(0);
    return o;
  });
  f.connect(g).connect(node).connect(out);
  return { oscs, cut: f.frequency, g: g.gain, node };
}

function djDelay(ctx, out, time, fb, mix) {
  const d = ctx.createDelay(2);
  d.delayTime.value = time;
  const lp = djFilter(ctx, "lowpass", 2500);
  d.connect(lp);
  lp.connect(djGain(ctx, fb)).connect(d);
  lp.connect(djGain(ctx, mix)).connect(out);
  return d;
}

function djDriveCurve(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}

// 곡 전체를 한 번에 만들면 자동 조절 이벤트가 쌓여 느려서, 8마디씩 나눠 동시에 만든 뒤 이어 붙여요.
const DJ_CHUNK = 8;   // 조각 길이(마디)
const DJ_PRE = 1;     // 조각 앞에 미리 만들어 버리는 마디 (에코 꼬리를 이어 주려고)
const DJ_XF = 256;    // 이음새를 부드럽게 겹치는 샘플 수

async function renderDjTrack(def) {
  const step = 60 / def.bpm / 4;
  const rand = djRand(def.seed);
  const noise = new Float32Array(DJ_SR * 2);
  for (let i = 0; i < noise.length; i++) noise[i] = rand() * 2 - 1;
  const pat = {
    acid: Array.from({ length: 16 }, () => ({
      rest: rand() < 0.22, n: [0, 0, 0, 12, 3, 7, 10, 15][Math.floor(rand() * 8)], acc: rand() < 0.3, slide: rand() < 0.2
    })),
    arp: Array.from({ length: 16 }, (_, i) => i % 4 === 0 || rand() < (def.lead.density ?? 1)),
    perc: Array.from({ length: 16 }, (_, i) => i % 4 !== 0 && rand() < 0.22)
  };

  const chunks = await Promise.all(Array.from({ length: DJ_BARS / DJ_CHUNK }, (_, c) =>
    djRenderChunk(def, pat, noise, c * DJ_CHUNK, (c + 1) * DJ_CHUNK)));

  const length = Math.ceil(DJ_BARS * 16 * step * DJ_SR);
  const buf = new AudioBuffer({ length, sampleRate: DJ_SR, numberOfChannels: 1 });
  const data = buf.getChannelData(0);
  chunks.forEach(({ samples, skip }, c) => {
    const at = Math.round(c * DJ_CHUNK * 16 * step * DJ_SR);
    for (let i = 0; i + skip < samples.length && at + i < length; i++) {
      const v = samples[i + skip];
      data[at + i] = c > 0 && i < DJ_XF ? data[at + i] * (1 - i / DJ_XF) + v * (i / DJ_XF) : v;
    }
  });

  let peak = 0;
  for (let i = 0; i < length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
  const k = 0.89 / (peak || 1);
  for (let i = 0; i < length; i++) data[i] *= k;
  return buf;
}

async function djRenderChunk(def, pat, noiseData, fromBar, toBar) {
  const beat = 60 / def.bpm, step = beat / 4;
  const startBar = Math.max(0, fromBar - DJ_PRE);
  const t0 = startBar * 16 * step;                     // 이 조각의 0초가 곡의 몇 초인지
  const dur = toBar * 16 * step - t0 + 0.05;           // 다음 조각과 겹칠 여유를 조금 더
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Offline(1, Math.ceil(dur * DJ_SR), DJ_SR);

  const noise = ctx.createBuffer(1, noiseData.length, DJ_SR);
  noise.getChannelData(0).set(noiseData);

  const out = djGain(ctx, 0.8);
  out.connect(ctx.destination);
  const synths = djGain(ctx, 1); // 킥이 칠 때마다 살짝 눌리는(사이드체인) 버스
  synths.connect(out);

  // 킥
  const kOsc = ctx.createOscillator();
  const kG = djGain(ctx, 0);
  kOsc.connect(kG);
  let kOut = kG;
  if (def.kick.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = djDriveCurve(def.kick.drive);
    kG.connect(ws); kOut = ws;
  }
  kOut.connect(out);
  kOsc.start(0);

  const hat = djNoiseVoice(ctx, noise, out, "highpass", 8000, 0.7, 0.16);
  const ohat = djNoiseVoice(ctx, noise, out, "highpass", 6500, 0.7, 0.13);
  const clap = djNoiseVoice(ctx, noise, out, "bandpass", 1400, 1.2, 0.5);
  const perc = djNoiseVoice(ctx, noise, out, "bandpass", 850, 9, 0.5);
  const riser = djNoiseVoice(ctx, noise, synths, "bandpass", 300, 2, 0.22);
  const bass = djMono(ctx, synths, def.bass.wave, def.bass.cutoff, 2, def.bass.wave === "sine" ? 0.55 : 0.32);
  const pad = djChord(ctx, synths, "sawtooth", 700, 0.7, 0.09);

  const L = def.lead;
  let lead;
  if (L.type === "acid") {
    lead = djMono(ctx, synths, "sawtooth", 400, 14, 0.2);
    lead.node.connect(djDelay(ctx, synths, step * 3, 0.3, 0.18));
  } else if (L.type === "arp") {
    lead = djMono(ctx, synths, L.wave, L.cutoff, 4, L.wave === "sine" ? 0.26 : 0.13);
    lead.node.connect(djDelay(ctx, synths, step * 3, 0.35, 0.25));
  } else {
    const dub = L.type === "chords";
    lead = djChord(ctx, synths, "sawtooth", dub ? 900 : 2200, dub ? 1.5 : 2, 0.15);
    lead.node.connect(djDelay(ctx, synths, step * (dub ? 3 : 2), dub ? 0.55 : 0.3, dub ? 0.45 : 0.2));
  }

  const { acid: acidPat, arp: arpMask, perc: percMask } = pat;
  const stabSteps = L.type === "chords" ? [2, 10] : [3, 6, 11, 14];

  for (let s = startBar * 16; s < toBar * 16; s++) {
    const bar = Math.floor(s / 16), i = s % 16, t = s * step - t0;
    const sec = djSection(bar).name;
    const drums = sec !== "브레이크";
    const full = sec === "빌드업" || sec === "드롭";
    const sweep = 0.5 - 0.5 * Math.cos((2 * Math.PI * (bar % 16)) / 16);

    // 킥 (빌드업 마지막 박은 비워서 긴장감을 줘요)
    if (drums && i % 4 === 0 && !(bar === 31 && i === 12)) {
      kOsc.frequency.setValueAtTime(155, t);
      kOsc.frequency.exponentialRampToValueAtTime(def.kick.tone, t + 0.09);
      djEnv(kG.gain, t, 1, 0.002, 0, def.kick.decay);
      synths.gain.setValueAtTime(0.4, t);
      synths.gain.setTargetAtTime(1, t + 0.03, 0.07);
    }

    // 하이햇: 오픈 햇은 뒷박, 나머지는 클로즈드 햇
    const ohOn = drums && (full || (sec === "인트로" && bar >= 8) || (sec === "아웃트로" && bar < 60));
    if (ohOn && i % 4 === 2) {
      djEnv(ohat.g, t, 1, 0.002, 0, 0.18);
    } else if (drums || bar < 36) {
      const sparse = sec === "인트로" && bar < 8;
      if (!sparse || i % 2 === 0) {
        const vel = (i % 4 === 2 ? 1 : i % 2 === 0 ? 0.55 : 0.35) * (drums ? 1 : 0.5);
        djEnv(hat.g, t, vel, 0.001, 0, 0.035);
      }
    }

    // 클랩 + 구간이 바뀌기 직전의 클랩 롤
    const roll = (bar === 31 && i >= 12) || bar === 39;
    if (roll) {
      const k = bar === 39 ? i / 15 : (i - 12) / 3;
      djEnv(clap.g, t, 0.15 + 0.85 * k, 0.001, 0, 0.06);
    } else if ((full || sec === "아웃트로" || (sec === "인트로" && bar >= 12)) && (i === 4 || i === 12)) {
      djEnv(clap.g, t, 0.9, 0.001, 0, 0.012);
      djEnv(clap.g, t + 0.014, 0.9, 0.001, 0, 0.16);
    }

    if (full && percMask[i]) djEnv(perc.g, t, 0.8, 0.001, 0, 0.05);

    // 베이스
    if (full) {
      const p = def.bass.pattern;
      const on = p === "rolling" ? i % 4 !== 0 : i % 4 === 2;
      if (on) {
        const len = step * (p === "rolling" ? 0.85 : p === "sub" ? 1.8 : 1.6);
        let note = def.root;
        if (bar % 8 === 7 && i >= 8) note += def.seed % 2 ? 3 : 7;
        if (p === "rolling" && i === 15) note += 12;
        bass.freq.setValueAtTime(djMidi(note), t);
        djEnv(bass.g, t, 1, 0.004, len * 0.6, len * 0.4);
        bass.cut.setValueAtTime(def.bass.cutoff * 2.2, t);
        bass.cut.exponentialRampToValueAtTime(def.bass.cutoff, t + len);
      }
    }

    // 브레이크의 패드와 라이저
    if (sec === "브레이크" && i === 0 && (bar === 32 || bar === 36)) {
      const shift = bar === 36 ? -2 : 0;
      [0, 3, 7].forEach((n, k) => pad.oscs[k].frequency.setValueAtTime(djMidi(def.root + 24 + n + shift), t));
      const fourBars = 64 * step;
      djEnv(pad.g, t, 1, 1.5, fourBars - 3.1, 1.5);
    }
    if (s === 36 * 16) {
      const end = t + 64 * step;
      riser.f.setValueAtTime(300, t);
      riser.f.exponentialRampToValueAtTime(9000, end - 0.02);
      riser.g.setValueAtTime(DJ_FLOOR, t);
      riser.g.linearRampToValueAtTime(1, end - 0.02);
      riser.g.setValueAtTime(DJ_FLOOR, end);
    }

    // 리드: 빌드업 후반에 살짝 보여주고, 드롭에서 제대로 (덥 테크노 코드는 빌드업부터)
    const amt = sec === "드롭" ? 1 : (L.type === "chords" && full) || (bar >= 24 && bar < 32) ? 0.45 : 0;
    if (!amt) continue;
    if (L.type === "acid") {
      const p = acidPat[i];
      if (p.rest) continue;
      const f = djMidi(def.root + 24 + p.n);
      if (p.slide) lead.freq.setTargetAtTime(f, t, 0.03); else lead.freq.setValueAtTime(f, t);
      const base = 250 + 2200 * sweep * amt;
      lead.cut.setValueAtTime(base * (p.acc ? 4 : 2.5), t);
      lead.cut.exponentialRampToValueAtTime(base, t + step * 0.9);
      djEnv(lead.g, t, (p.acc ? 1 : 0.7) * amt, 0.003, step * (p.slide ? 0.8 : 0.45), step * 0.15);
    } else if (L.type === "arp") {
      if (!arpMask[i]) continue;
      lead.freq.setValueAtTime(djMidi(def.root + 24 + L.notes[s % L.notes.length]), t);
      const base = L.cutoff * (0.5 + sweep);
      lead.cut.setValueAtTime(base * 2, t);
      lead.cut.exponentialRampToValueAtTime(base, t + step * 0.8);
      djEnv(lead.g, t, amt * (i % 4 === 0 ? 1 : 0.75), 0.003, step * 0.4, step * 0.4);
    } else if (stabSteps.includes(i)) {
      const shift = L.type === "chords" && bar % 8 >= 4 ? -2 : 0;
      [0, 3, 7].forEach((n, k) => lead.oscs[k].frequency.setValueAtTime(djMidi(def.root + 24 + n + shift), t));
      const base = (L.type === "chords" ? 600 : 1500) + (L.type === "chords" ? 1400 : 1500) * sweep;
      lead.cut.setValueAtTime(base * 2, t);
      lead.cut.exponentialRampToValueAtTime(base, t + step);
      djEnv(lead.g, t, amt, 0.004, step * 0.5, step * 0.6);
    }
  }

  const buf = await ctx.startRendering();
  // 미리 만든 앞부분(DJ_PRE마디)은 버리고 이어 붙여요
  return { samples: buf.getChannelData(0), skip: Math.round((fromBar - startBar) * 16 * step * DJ_SR) };
}
