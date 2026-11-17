// 30초 미리듣기 음원(PCM)에서 BPM, 저음 비중, 밝기, 음량 원시값을 계산해요.
// 브라우저의 decodeAudioData 결과를 그대로 넣으면 돼요.

function biquad(input, sr, type, freq, q = Math.SQRT1_2) {
  const w0 = 2 * Math.PI * freq / sr;
  const cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * q);
  let b0, b1, b2;
  if (type === "lowpass") { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
  else { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

function rms(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / a.length);
}

// 소리가 갑자기 커지는 순간(어택)을 프레임 단위로 뽑은 뒤, 자기상관으로 반복 주기를 찾아요.
function tempoCurve(low, full, sr, fullW) {
  const hop = 128, fps = sr / hop;
  const n = Math.floor(full.length / hop);
  const env = new Float32Array(n);
  let prevL = 0, prevF = 0, mean = 0;
  for (let f = 0; f < n; f++) {
    let el = 0, ef = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) { el += low[i] * low[i]; ef += full[i] * full[i]; }
    const l = Math.log(1 + 1000 * el), fu = Math.log(1 + 1000 * ef);
    env[f] = Math.max(0, l - prevL) + fullW * Math.max(0, fu - prevF);
    prevL = l; prevF = fu; mean += env[f];
  }
  mean /= n;
  for (let f = 0; f < n; f++) env[f] -= mean;

  const maxLag = Math.ceil(fps * 60 / 20);
  const ac = new Float32Array(maxLag + 2);
  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let f = 0; f + lag < n; f++) s += env[f] * env[f + lag];
    ac[lag] = s / (n - lag);
  }
  const acAt = (x) => {
    const i = Math.floor(x), t = x - i;
    return i + 1 >= ac.length ? 0 : ac[i] * (1 - t) + ac[i + 1] * t;
  };
  return { fps, acAt, strength: (bpm) => { const L = fps * 60 / bpm; return acAt(L) + 0.5 * acAt(2 * L) + 0.25 * acAt(4 * L); } };
}

function pickBpm(curve, sigma) {
  let best = 120, bestScore = -Infinity;
  for (let bpm = 80; bpm <= 180; bpm += 0.25) {
    // 전자음악은 120~130 BPM이 많아서 그 근처에 가중치를 줘요
    const prior = sigma ? Math.exp(-0.5 * (Math.log2(bpm / 125) / sigma) ** 2) : 1;
    const score = curve.strength(bpm) * prior;
    if (score > bestScore) { bestScore = score; best = bpm; }
  }
  return best;
}

function estimateBpm(low, full, sr) {
  const curve = tempoCurve(low, full, sr, 0.6);
  let bpm = pickBpm(curve, 0.5);
  // 드럼앤베이스: 87 근처로 잡혔는데 2배 속도에서도 박이 뚜렷하면 174로 판단
  if (bpm <= 90 && curve.acAt(curve.fps * 30 / bpm) > 0.5 * curve.acAt(curve.fps * 60 / bpm)) bpm *= 2;
  // 3:2 혼동 보정 (예: 174를 116으로 잡은 경우) — 킥/베이스만으로 다시 추정해서 확인
  const lowOnly = pickBpm(tempoCurve(low, full, sr, 0), 0);
  if (lowOnly * 2 <= 182 && Math.abs(lowOnly * 2 - bpm * 1.5) <= 3) bpm = lowOnly * 2;
  return Math.round(bpm);
}

function analyzePcm(channels, sampleRate) {
  // 모노로 합치고 절반으로 다운샘플 (속도 향상)
  const len = channels[0].length;
  const step = sampleRate > 30000 ? 2 : 1;
  const sr = sampleRate / step;
  const mono = new Float32Array(Math.floor(len / step));
  for (let i = 0; i < mono.length; i++) {
    let s = 0;
    for (const ch of channels) for (let k = 0; k < step; k++) s += ch[i * step + k];
    mono[i] = s / (channels.length * step);
  }

  const low = biquad(mono, sr, "lowpass", 150);
  const high = biquad(mono, sr, "highpass", 3000);
  const total = rms(mono) || 1e-9;

  return {
    bpm: estimateBpm(low, mono, sr),
    bassRatio: rms(low) / total,
    brightRatio: rms(high) / total,
    loudDb: 20 * Math.log10(total)
  };
}

if (typeof module !== "undefined") module.exports = { analyzePcm };
