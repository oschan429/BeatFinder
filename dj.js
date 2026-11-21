// ---------- DJ 연습: 덱 2개 + 믹서 (DDJ-FLX4 배치를 참고한 2채널 컨트롤러) ----------
const DJ = (() => {
  const RANGE = 0.1;          // 템포 슬라이더 ±10%
  const BINS = 150;           // 파형 분석: 초당 칸 수
  const VIEW = 4;             // 확대 파형: 재생 위치 앞뒤로 보여줄 시간(초)
  const SEC_PER_REV = 1.8;    // 조그 한 바퀴 = 1.8초 (33⅓ RPM 레코드)
  const STAGE_W = 1120;       // 컨트롤러 기본 너비. 화면이 좁으면 비율대로 줄여요
  const STACK_W = 410;        // 좁은 화면(휴대폰)에서는 덱 1 · 믹서 · 덱 2를 세로로 쌓아요
  const HOT_COLORS = ["#ff4f9a", "#3ddc84", "#4aa8ff", "#ffb02e"];
  const SPEED = { knob: 0.5, fader: 0.8, tempo: 0.05 }; // 키를 누르고 있을 때 1초에 움직이는 양

  // 키보드: 두 키가 한 쌍이에요 (왼쪽 키 = 줄이기, 오른쪽 키 = 키우기). 한글 입력 상태에서도 되도록 e.code를 써요.
  const KEYMAP = {
    Digit1: ["0.hi", -1], Digit2: ["0.hi", 1], KeyQ: ["0.mid", -1], KeyW: ["0.mid", 1],
    KeyA: ["0.low", -1], KeyS: ["0.low", 1], KeyZ: ["0.filter", -1], KeyX: ["0.filter", 1],
    KeyE: ["0.fader", -1], KeyR: ["0.fader", 1], Digit3: ["0.tempo", -1], Digit4: ["0.tempo", 1],
    KeyD: ["0.nudge", -1], KeyF: ["0.nudge", 1],
    Digit9: ["1.hi", -1], Digit0: ["1.hi", 1], KeyO: ["1.mid", -1], KeyP: ["1.mid", 1],
    KeyL: ["1.low", -1], Semicolon: ["1.low", 1], Period: ["1.filter", -1], Slash: ["1.filter", 1],
    KeyU: ["1.fader", -1], KeyI: ["1.fader", 1], Digit7: ["1.tempo", -1], Digit8: ["1.tempo", 1],
    KeyJ: ["1.nudge", -1], KeyK: ["1.nudge", 1],
    ArrowLeft: ["xfader", -1], ArrowRight: ["xfader", 1]
  };
  const BUTTONS = { KeyC: [0, "cue"], KeyV: [0, "play"], KeyG: [0, "sync"], KeyN: [1, "cue"], KeyM: [1, "play"], KeyH: [1, "sync"] };
  const DECK_KEYS = [
    { hi: "1 2", mid: "Q W", low: "A S", filter: "Z X", fader: "E R", tempo: "3 4", nudge: "D F", cue: "C", play: "V", sync: "G" },
    { hi: "9 0", mid: "O P", low: "L ;", filter: ". /", fader: "U I", tempo: "7 8", nudge: "J K", cue: "N", play: "M", sync: "H" }
  ];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt = (t) => {
    const s = Math.max(0, t);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  };
  const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };

  let ctx = null, masterGain = null, masterMeter = null, masterLevel = 0;
  let built = false, active = false, raf = 0, lastFrame = 0, toastTimer = 0;
  const root = document.querySelector("#dj");
  const ui = {};
  const ctl = {};
  const held = new Set();
  const tracks = new Map(); // 트랙 id → Promise<{ buffer, wave }>
  const meterBuf = new Float32Array(512);

  // ---------- 오디오 ----------
  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* 지원하지 않는 브라우저 */ }
      const limiter = ctx.createDynamicsCompressor(); // 두 덱을 같이 올려도 소리가 찢어지지 않게
      limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.003; limiter.release.value = 0.25;
      masterGain = ctx.createGain();
      masterGain.gain.value = ctl.master.value * 1.25;
      masterMeter = ctx.createAnalyser();
      masterMeter.fftSize = 512;
      masterGain.connect(limiter).connect(ctx.destination);
      limiter.connect(masterMeter);
      decks.forEach((d) => d.build());
      applyXfader();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  class Deck {
    constructor(n) {
      Object.assign(this, {
        n, track: null, buffer: null, wave: null, overview: null, loading: false,
        playing: false, offset: 0, anchor: 0, tempo: 0, bend: 0, cue: 0, hot: [null, null, null, null],
        src: null, pendingAlign: false, previewing: false, jog: null, level: 0
      });
      this.vals = { hi: 0.5, mid: 0.5, low: 0.5, filter: 0.5, fader: 1 };
    }
    get rate() { return (1 + this.tempo) * (1 + this.bend); }
    get bpm() { return this.track ? this.track.bpm * (1 + this.tempo) : 0; }
    get beat() { return 60 / this.track.bpm; }
    get duration() { return this.buffer ? this.buffer.duration : 0; }
    pos() { return this.playing ? Math.min(this.duration, this.offset + (ctx.currentTime - this.anchor) * this.rate) : this.offset; }
    snap(t) { return Math.round(t / this.beat) * this.beat; } // 가까운 박에 맞추기 (퀀타이즈)

    // 믹서 채널: EQ(LOW·MID·HI) → 필터 → 채널 페이더 → 크로스페이더
    build() {
      const f = (type, freq, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; if (q) b.Q.value = q; return b; };
      this.low = f("lowshelf", 220);
      this.mid = f("peaking", 1000, 0.8);
      this.hi = f("highshelf", 3200);
      this.lp = f("lowpass", 20000, 0.7);
      this.hp = f("highpass", 10, 0.7);
      this.meter = ctx.createAnalyser();
      this.meter.fftSize = 512;
      this.fader = ctx.createGain();
      this.xf = ctx.createGain();
      this.low.connect(this.mid).connect(this.hi).connect(this.lp).connect(this.hp).connect(this.fader).connect(this.xf).connect(masterGain);
      this.hp.connect(this.meter);
      ["hi", "mid", "low", "filter", "fader"].forEach((k) => this.apply(k));
    }
    apply(key) {
      const v = this.vals[key], now = ctx.currentTime;
      if (key === "fader") { this.fader.gain.setTargetAtTime(v * v, now, 0.01); return; }
      if (key === "filter") {
        // 가운데 = 꺼짐, 왼쪽 = 고음을 깎는 로우패스, 오른쪽 = 저음을 깎는 하이패스
        const lp = v < 0.5 ? 20000 * Math.pow(200 / 20000, (0.5 - v) * 2) : 20000;
        const hp = v > 0.5 ? 10 * Math.pow(6000 / 10, (v - 0.5) * 2) : 10;
        const q = 0.7 + Math.abs(v - 0.5) * 4;
        this.lp.frequency.setTargetAtTime(lp, now, 0.01);
        this.hp.frequency.setTargetAtTime(hp, now, 0.01);
        this.lp.Q.setTargetAtTime(q, now, 0.01);
        this.hp.Q.setTargetAtTime(q, now, 0.01);
        return;
      }
      // EQ: 가운데 0dB, 끝까지 내리면 -30dB(거의 꺼짐), 끝까지 올리면 +6dB
      const db = v < 0.5 ? (v - 0.5) * 60 : (v - 0.5) * 12;
      this[key].gain.setTargetAtTime(db, now, 0.01);
    }
    // 속도를 바꾸기 전에 지금 위치를 기준점으로 다시 잡아야 위치 계산이 어긋나지 않아요
    change(fn) {
      if (this.playing) { this.offset = this.pos(); this.anchor = ctx.currentTime; }
      fn();
      if (this.src) this.src.playbackRate.setValueAtTime(this.rate, ctx.currentTime);
    }
    play() {
      if (!this.buffer || this.playing) return;
      ensureCtx();
      if (this.offset >= this.duration - 0.05) this.offset = 0;
      if (this.pendingAlign) {
        this.pendingAlign = false;
        const o = decks[1 - this.n];
        if (o.playing) alignTo(this, o);
      }
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.playbackRate.value = this.rate;
      src.connect(this.low);
      src.onended = () => {
        if (this.src !== src) return;
        this.offset = this.duration; this.playing = false; this.src = null;
      };
      src.start(0, this.offset);
      Object.assign(this, { src, anchor: ctx.currentTime, playing: true });
    }
    pause() {
      if (!this.playing) return;
      this.offset = this.pos();
      this.src.onended = null;
      this.src.stop();
      Object.assign(this, { src: null, playing: false });
    }
    seek(t) {
      t = clamp(t, 0, Math.max(0, this.duration - 0.01));
      if (this.playing) { this.pause(); this.offset = t; this.play(); } else this.offset = t;
    }
    // CUE: 멈춘 상태에서 누르면 그 자리를 큐로 저장, 큐 위치에서 누르고 있으면 미리 듣기, 재생 중에 누르면 큐로 돌아가 멈춰요
    cueDown() {
      if (!this.buffer) return;
      if (this.playing && !this.previewing) { this.pause(); this.seek(this.cue); return; }
      if (this.playing) return;
      const p = this.pos();
      if (Math.abs(p - this.cue) > 0.02) { this.cue = this.snap(p); this.seek(this.cue); }
      else { this.previewing = true; this.play(); }
    }
    cueUp() {
      if (!this.previewing) return;
      this.previewing = false;
      this.pause();
      this.seek(this.cue);
    }
    playPress() {
      if (this.previewing) { this.previewing = false; return; } // 큐 미리 듣기 중에 PLAY를 누르면 계속 재생
      if (this.playing) this.pause(); else this.play();
    }
    hotPress(i, clear) {
      if (!this.buffer) return;
      if (clear) this.hot[i] = null;
      else if (this.hot[i] == null) this.hot[i] = this.snap(this.pos());
      else this.seek(this.hot[i]);
    }
  }
  const decks = [new Deck(0), new Deck(1)];

  // 상대 덱과 마디의 첫 박까지 맞춰요 (4박 단위)
  function alignTo(d, o) {
    let diff = (o.pos() / o.beat - d.pos() / d.beat) % 4;
    if (diff > 2) diff -= 4;
    if (diff < -2) diff += 4;
    let t = d.pos() + diff * d.beat;
    if (t < 0) t += 4 * d.beat;
    d.seek(t);
  }

  function sync(d) {
    const o = decks[1 - d.n];
    if (!d.buffer || !o.buffer) { toast("두 덱에 모두 곡을 불러와야 SYNC를 쓸 수 있어요."); return; }
    const tempo = clamp(o.bpm / d.track.bpm - 1, -RANGE, RANGE);
    ctl[`${d.n}.tempo`].set(tempo / (2 * RANGE) + 0.5);
    if (o.playing && d.playing) alignTo(d, o);
    else if (o.playing) d.pendingAlign = true; // 이 덱을 재생하는 순간 박자를 맞춰요
    const btn = d.ui.sync;
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 400);
  }

  function applyXfader() {
    if (!ctx) return;
    // 가운데에서는 두 덱 모두 원래 볼륨, 한쪽 끝으로 갈수록 반대쪽이 줄어요
    const x = ctl.xfader.value, now = ctx.currentTime;
    decks[0].xf.gain.setTargetAtTime(x <= 0.5 ? 1 : Math.cos((x - 0.5) * Math.PI), now, 0.01);
    decks[1].xf.gain.setTargetAtTime(x >= 0.5 ? 1 : Math.cos((0.5 - x) * Math.PI), now, 0.01);
  }

  // ---------- 트랙 불러오기 & 파형 분석 ----------
  function analyze(buffer) {
    const x = buffer.getChannelData(0), sr = buffer.sampleRate;
    const per = Math.round(sr / BINS), n = Math.ceil(x.length / per);
    const low = new Float32Array(n), mid = new Float32Array(n), high = new Float32Array(n);
    const aL = 1 - Math.exp((-2 * Math.PI * 200) / sr), aH = 1 - Math.exp((-2 * Math.PI * 2500) / sr);
    let lp = 0, lp2 = 0;
    const max = [0, 0, 0];
    for (let b = 0; b < n; b++) {
      let l = 0, m = 0, h = 0;
      const end = Math.min(x.length, (b + 1) * per);
      for (let i = b * per; i < end; i++) {
        const v = x[i];
        lp += aL * (v - lp);
        lp2 += aH * (v - lp2);
        const al = Math.abs(lp), am = Math.abs(lp2 - lp), ah = Math.abs(v - lp2);
        if (al > l) l = al;
        if (am > m) m = am;
        if (ah > h) h = ah;
      }
      low[b] = l; mid[b] = m; high[b] = h;
      if (l > max[0]) max[0] = l;
      if (m > max[1]) max[1] = m;
      if (h > max[2]) max[2] = h;
    }
    [low, mid, high].forEach((arr, k) => { const s = 1 / (max[k] || 1); for (let i = 0; i < n; i++) arr[i] *= s; });
    return { low, mid, high };
  }

  function getTrack(def) {
    if (!tracks.has(def.id)) tracks.set(def.id, renderDjTrack(def).then((buffer) => ({ buffer, wave: analyze(buffer) })));
    // 메모리를 아끼려고 덱에 올라가 있지 않은 곡은 최근 4곡까지만 기억해요
    while (tracks.size > 4) {
      const old = [...tracks.keys()].find((k) => k !== def.id && !decks.some((d) => d.track && d.track.id === k));
      if (!old) break;
      tracks.delete(old);
    }
    return tracks.get(def.id);
  }

  async function load(d, def) {
    if (d.playing) { toast(`덱 ${d.n + 1}이 재생 중이라 곡을 바꿀 수 없어요. 먼저 멈춰 주세요.`); return; }
    Object.assign(d, { track: def, buffer: null, wave: null, overview: null, loading: true, offset: 0, cue: 0, hot: [null, null, null, null], pendingAlign: false });
    d.ui.loading.hidden = false;
    setText(d.ui.title, def.title);
    renderLibrary();
    try {
      const { buffer, wave } = await getTrack(def);
      if (d.track !== def) return; // 그 사이에 다른 곡을 불렀어요
      Object.assign(d, { buffer, wave, loading: false });
      d.overview = overviewImage(d);
    } catch {
      d.loading = false;
      toast("트랙을 만들지 못했어요. 페이지를 새로고침해 주세요.");
    }
    d.ui.loading.hidden = true;
  }

  // ---------- 그리기 ----------
  const WAVE_COLORS = ["#2f6bff", "#ffa53a", "#f4f4ff"]; // 저음 · 중음 · 고음 (rekordbox 3밴드와 같은 색 구성)
  const WAVE_SCALE = [0.95, 0.8, 0.55];

  function overviewImage(d) {
    const W = 720, H = 64, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d"), bands = [d.wave.low, d.wave.mid, d.wave.high], n = bands[0].length, mid = (H - 8) / 2;
    bands.forEach((arr, k) => {
      g.fillStyle = WAVE_COLORS[k];
      for (let x = 0; x < W; x++) {
        let v = 0;
        for (let i = Math.floor((x * n) / W), e = Math.floor(((x + 1) * n) / W); i < e; i++) if (arr[i] > v) v = arr[i];
        const h = v * mid * WAVE_SCALE[k];
        g.fillRect(x, mid - h, 1, h * 2);
      }
    });
    // 아래쪽 띠: 곡의 구간
    DJ_SECTIONS.forEach((s) => {
      g.fillStyle = s.color;
      g.fillRect((s.from / DJ_BARS) * W, H - 6, ((s.to - s.from) / DJ_BARS) * W - 2, 6);
    });
    return c;
  }

  function fitCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (w && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
    return dpr;
  }

  function marker(g, x, H, color, dpr) {
    g.fillStyle = color;
    g.fillRect(x - dpr, 0, 2 * dpr, H);
    g.beginPath();
    g.moveTo(x - 5 * dpr, 0); g.lineTo(x + 5 * dpr, 0); g.lineTo(x, 7 * dpr);
    g.fill();
  }

  function drawZoom(cv, d) {
    const dpr = fitCanvas(cv), g = cv.getContext("2d"), W = cv.width, H = cv.height, mid = H / 2;
    g.fillStyle = "#06060b";
    g.fillRect(0, 0, W, H);
    if (!d.wave) {
      g.fillStyle = "#6d6b86";
      g.font = `${12 * dpr}px "Noto Sans KR", sans-serif`;
      g.fillText(d.loading ? "트랙을 만드는 중…" : "아래 목록에서 곡을 불러오세요", 14 * dpr, mid + 4 * dpr);
      return;
    }
    // 템포를 맞추면 두 덱의 박 간격이 화면에서 똑같아 보이도록, 템포만큼 보이는 구간을 넓혀요
    const span = VIEW * (1 + d.tempo), pps = W / 2 / span, p = d.pos(), t0 = p - span;
    for (let b = Math.max(0, Math.ceil(t0 / d.beat)), e = Math.floor((p + span) / d.beat); b <= e; b++) {
      const x = Math.round((b * d.beat - t0) * pps);
      g.fillStyle = b % 64 === 0 ? "rgba(255, 90, 90, .9)" : b % 4 === 0 ? "rgba(255, 255, 255, .42)" : "rgba(255, 255, 255, .13)";
      g.fillRect(x, 0, b % 4 === 0 ? Math.ceil(1.5 * dpr) : 1, H);
    }
    const bands = [d.wave.low, d.wave.mid, d.wave.high], n = bands[0].length;
    bands.forEach((arr, k) => {
      g.fillStyle = WAVE_COLORS[k];
      for (let x = 0; x < W; x++) {
        const i = Math.floor((t0 + x / pps) * BINS);
        if (i < 0 || i >= n) continue;
        const h = arr[i] * mid * WAVE_SCALE[k];
        g.fillRect(x, mid - h, 1, h * 2);
      }
    });
    const xOf = (t) => (t - t0) * pps;
    d.hot.forEach((t, i) => { if (t != null) marker(g, xOf(t), H, HOT_COLORS[i], dpr); });
    marker(g, xOf(d.cue), H, "#ff8a00", dpr);
    g.fillStyle = "#fff";
    g.fillRect(W / 2 - dpr, 0, 2 * dpr, H);
  }

  function drawOverview(d) {
    const cv = d.ui.overview, dpr = fitCanvas(cv), g = cv.getContext("2d"), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    if (!d.overview) return;
    g.drawImage(d.overview, 0, 0, W, H);
    const xOf = (t) => (t / d.duration) * W;
    const x = xOf(d.pos());
    g.fillStyle = "rgba(6, 6, 11, .55)";
    g.fillRect(0, 0, x, H - 6 * (H / 64));
    d.hot.forEach((t, i) => { if (t != null) { g.fillStyle = HOT_COLORS[i]; g.fillRect(xOf(t) - dpr / 2, 0, dpr, H); } });
    g.fillStyle = "#ff8a00";
    g.fillRect(xOf(d.cue) - dpr / 2, 0, dpr, H);
    g.fillStyle = "#fff";
    g.fillRect(x - dpr, 0, 2 * dpr, H);
  }

  function updateDeck(d) {
    const u = d.ui;
    setText(u.bpm, d.track ? d.bpm.toFixed(1) : "—");
    setText(u.jogBpm, d.track ? d.bpm.toFixed(1) : "—");
    setText(u.tempoVal, `${d.tempo >= 0 ? "+" : ""}${(d.tempo * 100).toFixed(1)}%`);
    u.root.classList.toggle("ready", !!d.buffer);
    if (!d.buffer) return;
    const p = d.pos(), beats = p / d.beat, bar = Math.min(DJ_BARS - 1, Math.floor(beats / 4));
    const sec = djSection(bar);
    setText(u.time, fmt(p));
    setText(u.remain, `-${fmt(d.duration - p)}`);
    setText(u.bar, `${bar + 1}.${(Math.floor(beats) % 4) + 1}`);
    setText(u.section, `${sec.name} · ${Math.max(1, Math.ceil(sec.to - beats / 4))}마디 남음`);
    u.section.style.color = sec.color;
    u.jogMark.style.transform = `rotate(${(p / SEC_PER_REV) * 360}deg)`;
    u.play.classList.toggle("on", d.playing);
    u.cue.classList.toggle("on", d.previewing || (!d.playing && Math.abs(p - d.cue) < 0.02));
    u.pads.forEach((b, i) => b.classList.toggle("set", d.hot[i] != null));
    drawOverview(d);
  }

  function updatePhase() {
    const [a, b] = decks;
    if (!a.buffer || !b.buffer) {
      ui.phaseMark.style.left = "50%";
      ui.phase.classList.remove("ok");
      setText(ui.phaseText, "두 덱에 곡을 불러오면 BPM과 박자 차이가 보여요.");
      return;
    }
    const diff = b.bpm - a.bpm;
    const bpmText = Math.abs(diff) < 0.05 ? "BPM 같음 ✓" : `BPM 차이 ${diff > 0 ? "+" : ""}${diff.toFixed(1)} (덱 2가 ${diff > 0 ? "빨라요" : "느려요"})`;
    if (!a.playing || !b.playing) {
      ui.phaseMark.style.left = "50%";
      ui.phase.classList.remove("ok");
      setText(ui.phaseText, `${bpmText} · 두 덱을 모두 재생하면 박자가 얼마나 어긋났는지 보여요.`);
      return;
    }
    let ph = a.pos() / a.beat - b.pos() / b.beat;
    ph -= Math.round(ph); // -0.5~0.5박. 양수면 덱 2가 늦어요
    const ok = Math.abs(ph) < 0.04;
    ui.phaseMark.style.left = `${50 + ph * 100}%`;
    ui.phase.classList.toggle("ok", ok && Math.abs(diff) < 0.05);
    setText(ui.phaseText, `${bpmText} · ${ok ? "박자 맞음 ✓" : `덱 2가 ${ph > 0 ? "늦어요 → K(앞으로 밀기)" : "빨라요 → J(뒤로 밀기)"} · ${Math.round(Math.abs(ph) * 100)}% 어긋남`}`);
  }

  function meterLevel(an, prev) {
    an.getFloatTimeDomainData(meterBuf);
    let pk = 0;
    for (let i = 0; i < meterBuf.length; i++) { const v = Math.abs(meterBuf[i]); if (v > pk) pk = v; }
    return Math.max(pk, prev * 0.9);
  }
  const meterPct = (lvl) => `${clamp(((20 * Math.log10(lvl || 1e-6) + 36) / 36) * 100, 0, 100)}%`;

  function updateMeters() {
    if (!ctx) return;
    decks.forEach((d) => { d.level = meterLevel(d.meter, d.level); d.ui.meter.style.setProperty("--lvl", meterPct(d.level)); });
    masterLevel = meterLevel(masterMeter, masterLevel);
    ui.masterMeter.style.setProperty("--lvl", meterPct(masterLevel));
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    const nudge = [0, 0];
    for (const code of held) {
      const k = KEYMAP[code];
      if (!k) continue;
      const [id, dir] = k;
      if (id.endsWith(".nudge")) { nudge[+id[0]] += dir; continue; }
      const c = ctl[id];
      c.set(c.value + dir * dt * (id.endsWith(".tempo") ? SPEED.tempo : c.kind === "knob" ? SPEED.knob : SPEED.fader));
    }
    decks.forEach((d, n) => {
      // 조그를 돌리는 동안엔 돌리는 빠르기만큼, 아니면 D/F(J/K)를 누른 만큼 잠깐 빨라지거나 느려져요
      const bend = d.jog ? (now - d.jog.at < 90 ? d.jog.bend : 0) : nudge[n] * 0.04;
      if (d.buffer && bend !== d.bend) d.change(() => { d.bend = bend; });
      updateDeck(d);
      drawZoom(ui.waves[n], d);
    });
    updatePhase();
    updateMeters();
  }

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2600);
  }

  // ---------- 노브·페이더 ----------
  class Control {
    constructor(el, id, kind, def) {
      Object.assign(this, { el, id, kind, def, value: def, drag: null });
      this.render();
      el.addEventListener("pointerdown", (e) => {
        ensureCtx();
        el.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect();
        this.drag = { x: e.clientX, y: e.clientY, v: this.value, len: (kind === "hfader" ? r.width : r.height) * 0.85 };
      });
      el.addEventListener("pointermove", (e) => {
        if (!this.drag) return;
        const { x, y, v, len } = this.drag, fine = e.shiftKey ? 0.2 : 1;
        if (kind === "knob") this.set(v + ((y - e.clientY) / 160) * fine);
        else if (kind === "hfader") this.set(v + ((e.clientX - x) / len) * fine);
        else if (kind === "tempo") this.set(v + ((e.clientY - y) / len) * fine); // 아래로 내릴수록 빨라져요(+)
        else this.set(v + ((y - e.clientY) / len) * fine);
      });
      const end = () => { this.drag = null; };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("dblclick", () => this.set(this.def));
      el.addEventListener("wheel", (e) => {
        e.preventDefault();
        const dir = kind === "tempo" ? Math.sign(e.deltaY) : -Math.sign(e.deltaY);
        this.set(this.value + dir * (kind === "tempo" ? 0.005 : 0.03));
      }, { passive: false });
    }
    set(v) {
      v = clamp(v, 0, 1);
      if (v === this.value) return;
      this.value = v;
      this.render();
      onControl(this.id, v);
    }
    render() {
      const v = this.value, el = this.el;
      if (this.kind === "knob") {
        el.style.setProperty("--a", `${-135 + v * 270}deg`);
        el.style.setProperty("--s", `${Math.min(v, this.def) * 270}deg`);
        el.style.setProperty("--e", `${Math.max(v, this.def) * 270}deg`);
      } else {
        el.style.setProperty("--p", this.kind === "vfader" ? 1 - v : v);
      }
    }
  }

  function onControl(id, v) {
    if (id === "xfader") { applyXfader(); return; }
    if (id === "master") { if (ctx) masterGain.gain.setTargetAtTime(v * 1.25, ctx.currentTime, 0.01); return; }
    const d = decks[+id[0]], key = id.slice(2);
    if (key === "tempo") { d.change(() => { d.tempo = (v - 0.5) * 2 * RANGE; }); return; }
    d.vals[key] = v;
    if (ctx) d.apply(key);
  }

  function press(d, act, down, e) {
    ensureCtx();
    if (act === "cue") { if (down) d.cueDown(); else d.cueUp(); return; }
    if (!down) return;
    if (act === "play") d.playPress();
    else if (act === "sync") sync(d);
    else if (act === "pad") d.hotPress(+e.target.closest("[data-pad]").dataset.pad, e.shiftKey);
  }

  function bindJog(d, el) {
    let last = null;
    const angle = (e) => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
    el.addEventListener("pointerdown", (e) => {
      ensureCtx();
      if (!d.buffer) return;
      el.setPointerCapture(e.pointerId);
      last = { a: angle(e), t: performance.now() };
      d.jog = { bend: 0, at: last.t };
      el.classList.add("touch");
    });
    el.addEventListener("pointermove", (e) => {
      if (!last) return;
      const a = angle(e), now = performance.now();
      let da = a - last.a;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      const dt = Math.max(1, now - last.t) / 1000;
      last = { a, t: now };
      if (d.playing) d.jog = { bend: clamp((da / dt) * 0.05, -0.3, 0.3), at: now };
      else d.seek(d.offset + (da / (2 * Math.PI)) * SEC_PER_REV);
    });
    const up = () => { last = null; d.jog = null; el.classList.remove("touch"); };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  // ---------- 화면 만들기 ----------
  const kbd = (k) => `<kbd>${k}</kbd>`;
  const knob = (id, label, keys) => `
    <div class="knob-wrap">
      <span class="ctl-label">${label}</span>
      <div class="knob" data-ctl="${id}" data-kind="knob"><div class="knob-dial"><i></i></div></div>
      ${keys ? kbd(keys) : ""}
    </div>`;
  const fader = (id, kind, cls) => `<div class="fader ${cls}" data-ctl="${id}" data-kind="${kind}"><div class="fader-slot"></div><div class="fader-cap"></div></div>`;

  const deckHtml = (n) => {
    const k = DECK_KEYS[n];
    return `
    <div class="deck" data-deck="${n}">
      <div class="deck-display">
        <div class="dd-row"><span class="dd-num">${n + 1}</span><span class="dd-title">—</span><span class="dd-bpm"><b>—</b> BPM</span></div>
        <div class="dd-row dd-sub"><span class="dd-time">00:00.0</span><span class="dd-remain"></span><span class="dd-bar"></span><span class="dd-section"></span></div>
        <canvas class="dd-overview"></canvas>
      </div>
      <div class="deck-main">
        <div class="tempo-col">
          <span class="ctl-label">TEMPO</span>
          ${fader(`${n}.tempo`, "tempo", "tempo")}
          <span class="tempo-val">+0.0%</span>
          ${kbd(k.tempo)}
        </div>
        <div class="jog-col">
          <div class="jog"><div class="jog-platter"><i class="jog-mark"></i><div class="jog-center"><b class="jog-bpm">—</b><small>BPM</small></div></div></div>
          <span class="jog-hint">재생 중: 돌리면 잠깐 빨라지거나 느려져요 · 멈춤: 위치 이동 ${kbd(k.nudge)}</span>
        </div>
      </div>
      <div class="deck-bottom">
        <div class="transport">
          <button type="button" class="btn-dj sync" data-act="sync">SYNC${kbd(k.sync)}</button>
          <button type="button" class="btn-dj cue" data-act="cue">CUE${kbd(k.cue)}</button>
          <button type="button" class="btn-dj play" data-act="play" aria-label="재생/일시정지">▶︎ ❚❚${kbd(k.play)}</button>
        </div>
        <div class="pads-wrap">
          <div class="pads">${HOT_COLORS.map((c, i) => `<button type="button" class="pad" data-act="pad" data-pad="${i}" style="--c:${c}">${i + 1}</button>`).join("")}</div>
          <span class="pads-hint">HOT CUE · 빈 패드: 지금 위치 저장 · 저장된 패드: 이동 · Shift+클릭: 지우기</span>
        </div>
      </div>
      <div class="deck-loading" hidden><div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span>트랙을 만드는 중…</span></div>
    </div>`;
  };

  const channelHtml = (n) => {
    const k = DECK_KEYS[n];
    return `
    <div class="mx-ch" data-deck="${n}">
      <span class="mx-num">${n + 1}</span>
      ${knob(`${n}.hi`, "HI", k.hi)}${knob(`${n}.mid`, "MID", k.mid)}${knob(`${n}.low`, "LOW", k.low)}${knob(`${n}.filter`, "FILTER", k.filter)}
      <div class="mx-fader-row"><div class="mx-meter"><i></i></div>${fader(`${n}.fader`, "vfader", "ch")}</div>
      ${kbd(k.fader)}
    </div>`;
  };

  const keyRows = [
    ["HI (고음) 줄이기 / 키우기", "hi"], ["MID (중음)", "mid"], ["LOW (저음)", "low"],
    ["FILTER (왼쪽: 고음 깎기 · 오른쪽: 저음 깎기)", "filter"], ["채널 볼륨 내리기 / 올리기", "fader"],
    ["템포 느리게 / 빠르게", "tempo"], ["박자 밀기: 뒤로 / 앞으로", "nudge"]
  ];

  function build() {
    root.innerHTML = `
      <div class="dj-head">
        <p class="eyebrow">DJ PRACTICE</p>
        <h2>DJ 믹싱 연습</h2>
        <p class="sub">두 곡의 속도(BPM)와 박자를 맞추고, EQ와 페이더로 자연스럽게 넘기는 연습을 해 보세요. 트랙은 연습용으로 브라우저에서 직접 만든 테크노 비트라서 처음부터 끝까지 들을 수 있어요.</p>
      </div>
      <div class="dj-waves">
        <div class="dj-wave-row"><span class="dj-wave-tag">1</span><canvas class="dj-wave"></canvas></div>
        <div class="dj-phase"><span class="dj-phase-label">박자</span><div class="dj-phase-bar"><i class="dj-phase-mark"></i></div><span class="dj-phase-text"></span></div>
        <div class="dj-wave-row"><span class="dj-wave-tag">2</span><canvas class="dj-wave"></canvas></div>
      </div>
      <div class="dj-stage-wrap">
        <div class="dj-stage">
          <div class="dj-toast" role="status"></div>
          ${deckHtml(0)}
          <div class="mixer">
            <div class="mx-top">
              ${channelHtml(0)}
              <div class="mx-master">${knob("master", "MASTER")}<div class="mx-meter master"><i></i></div><span class="mx-logo">BEATFINDER<br>DJ</span></div>
              ${channelHtml(1)}
            </div>
            <div class="xf"><span>1</span>${fader("xfader", "hfader", "xfader")}<span>2</span>${kbd("← →")}</div>
          </div>
          ${deckHtml(1)}
        </div>
      </div>
      <div class="dj-bottom">
        <div class="dj-panel dj-library">
          <h3>트랙 목록</h3>
          <table><thead><tr><th>트랙</th><th>BPM</th><th>길이</th><th>불러오기</th></tr></thead><tbody></tbody></table>
          <p class="dj-note">모든 트랙은 64마디 구조예요: 인트로 16 · 빌드업 16 · 브레이크 8 · 드롭 16 · 아웃트로 8. 박자가 정확히 맞춰져 있어서 BPM만 맞으면 박이 겹쳐요.</p>
        </div>
        <div class="dj-panel dj-help">
          <h3>키보드 조작</h3>
          <table class="keys">
            <thead><tr><th></th><th>덱 1</th><th>덱 2</th></tr></thead>
            <tbody>
              ${keyRows.map(([label, k]) => `<tr><td>${label}</td><td>${kbd(DECK_KEYS[0][k].replace(" ", "</kbd> / <kbd>"))}</td><td>${kbd(DECK_KEYS[1][k].replace(" ", "</kbd> / <kbd>"))}</td></tr>`).join("")}
              <tr><td>CUE / PLAY / SYNC</td><td>${kbd("C")} ${kbd("V")} ${kbd("G")}</td><td>${kbd("N")} ${kbd("M")} ${kbd("H")}</td></tr>
              <tr><td>크로스페이더</td><td colspan="2">${kbd("←")} / ${kbd("→")}</td></tr>
            </tbody>
          </table>
          <p class="dj-note">키를 누르고 있으면 노브가 계속 돌아가요. <b>Shift</b>+조절 키를 누르면 가운데(기본값)로 돌아가요. 마우스로는 드래그하거나 휠을 굴리고, 더블클릭하면 기본값으로 돌아가요. 한글 입력 상태여도 작동해요.</p>
          <h3>믹싱 연습 순서</h3>
          <ol class="dj-steps">
            <li>덱 1을 재생하고, 덱 2에 다음 곡을 불러와요.</li>
            <li>덱 2의 템포(${kbd("7")} ${kbd("8")})로 BPM을 덱 1과 똑같이 맞춰요. 어려우면 SYNC(${kbd("H")})를 눌러요.</li>
            <li>덱 1이 새 구간(16마디 단위, 빨간 박자선)에 들어갈 때 덱 2를 재생하고, 박자 막대가 가운데 오도록 ${kbd("J")} ${kbd("K")}나 조그로 맞춰요.</li>
            <li>덱 2의 LOW를 끝까지 내린 채(${kbd("L")}) 채널 볼륨을 올려요(${kbd("I")}).</li>
            <li>다음 구간이 시작될 때 저음을 바꿔요: 덱 1 LOW ↓(${kbd("A")}), 덱 2 LOW ↑(${kbd(";")}).</li>
            <li>덱 1의 볼륨을 내려서(${kbd("E")}) 마무리하고, 덱 1에 다음 곡을 불러와 반복해요.</li>
          </ol>
        </div>
      </div>`;

    Object.assign(ui, {
      waves: [...root.querySelectorAll(".dj-wave")],
      phase: root.querySelector(".dj-phase"),
      phaseMark: root.querySelector(".dj-phase-mark"),
      phaseText: root.querySelector(".dj-phase-text"),
      stageWrap: root.querySelector(".dj-stage-wrap"),
      stage: root.querySelector(".dj-stage"),
      toast: root.querySelector(".dj-toast"),
      masterMeter: root.querySelector(".mx-meter.master"),
      library: root.querySelector(".dj-library tbody")
    });

    root.querySelectorAll("[data-ctl]").forEach((el) => {
      const id = el.dataset.ctl;
      const def = id === "master" ? 0.8 : id.endsWith(".fader") ? 1 : 0.5;
      ctl[id] = new Control(el, id, el.dataset.kind, def);
    });

    decks.forEach((d) => {
      const el = root.querySelector(`.deck[data-deck="${d.n}"]`);
      const q = (s) => el.querySelector(s);
      d.ui = {
        root: el, title: q(".dd-title"), bpm: q(".dd-bpm b"), time: q(".dd-time"), remain: q(".dd-remain"),
        bar: q(".dd-bar"), section: q(".dd-section"), overview: q(".dd-overview"), tempoVal: q(".tempo-val"),
        jogMark: q(".jog-mark"), jogBpm: q(".jog-bpm"), play: q(".play"), cue: q(".cue"), sync: q(".sync"),
        pads: [...el.querySelectorAll(".pad")], loading: q(".deck-loading"),
        meter: root.querySelector(`.mx-ch[data-deck="${d.n}"] .mx-meter`)
      };
      el.querySelectorAll("[data-act]").forEach((b) => {
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); press(d, b.dataset.act, true, e); });
        if (b.dataset.act === "cue") ["pointerup", "pointerleave", "pointercancel"].forEach((t) => b.addEventListener(t, (e) => press(d, "cue", false, e)));
      });
      bindJog(d, q(".jog"));
    });

    ui.library.addEventListener("click", (e) => {
      const b = e.target.closest("[data-load]");
      if (!b) return;
      const [n, id] = b.dataset.load.split("|");
      load(decks[+n], DJ_TRACKS.find((t) => t.id === id));
    });

    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    // 화면 너비나 글꼴이 바뀌어 크기가 달라지면 컨트롤러 비율을 다시 맞춰요
    if (window.ResizeObserver) { const ro = new ResizeObserver(fit); ro.observe(ui.stageWrap); ro.observe(ui.stage); }
    else window.addEventListener("resize", fit);
    built = true;
  }

  function renderLibrary() {
    ui.library.innerHTML = DJ_TRACKS.map((t) => {
      const len = (DJ_BARS * 4 * 60) / t.bpm;
      const on = decks.map((d) => d.track === t);
      return `
        <tr class="${on[0] || on[1] ? "loaded" : ""}">
          <td><b>${t.title}</b><small>${t.style}</small></td>
          <td>${t.bpm}</td>
          <td>${Math.floor(len / 60)}:${String(Math.round(len % 60)).padStart(2, "0")}</td>
          <td class="load">${[0, 1].map((n) => `<button type="button" class="${on[n] ? "on" : ""}" data-load="${n}|${t.id}">덱 ${n + 1}</button>`).join("")}</td>
        </tr>`;
    }).join("");
  }

  function fit() {
    if (!active) return;
    const wrapW = ui.stageWrap.clientWidth, stack = wrapW < 760;
    ui.stage.classList.toggle("stack", stack);
    const s = Math.min(1, wrapW / (stack ? STACK_W : STAGE_W));
    ui.stage.style.transform = `scale(${s})`;
    ui.stageWrap.style.height = `${ui.stage.offsetHeight * s}px`;
  }

  // ---------- 키보드 ----------
  function typing(e) { return e.target.closest && e.target.closest("input, textarea, select, [contenteditable]"); }

  function onKey(e) {
    if (!active || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = KEYMAP[e.code], b = BUTTONS[e.code];
    if (!k && !b) return;
    e.preventDefault();
    ensureCtx();
    if (b) { if (!e.repeat) press(decks[b[0]], b[1], true, e); return; }
    if (e.shiftKey) {
      // Shift+조절 키: 기본값으로 되돌리기
      if (ctl[k[0]]) ctl[k[0]].set(ctl[k[0]].def);
      return;
    }
    held.add(e.code);
  }

  function onKeyUp(e) {
    held.delete(e.code);
    const b = BUTTONS[e.code];
    if (active && b && b[1] === "cue") press(decks[b[0]], "cue", false, e);
  }

  function releaseAll() {
    held.clear();
    decks.forEach((d) => d.cueUp());
  }

  // ---------- 화면 들어가기·나가기 ----------
  function enter() {
    if (!built) build();
    active = true;
    renderLibrary();
    requestAnimationFrame(fit);
    cancelAnimationFrame(raf);
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
    if (!decks[0].track) load(decks[0], DJ_TRACKS[0]);
    if (!decks[1].track) load(decks[1], DJ_TRACKS[1]);
  }

  function leave() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    releaseAll();
    decks.forEach((d) => d.pause());
  }

  return { enter, leave };
})();
