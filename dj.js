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
        src: null, synced: false, previewing: false, jog: null, level: 0
      });
      this.vals = { hi: 0.5, mid: 0.5, low: 0.5, filter: 0.5, fader: 1 };
    }
    get rate() { return (1 + this.tempo) * (1 + this.bend); }
    get bpm() { return this.track ? this.track.bpm * (1 + this.tempo) : 0; }
    get beat() { return 60 / this.track.bpm; }
    get duration() { return this.buffer ? this.buffer.duration : 0; }
    // anchor가 미래면(SYNC로 첫 박을 기다리는 중) 아직 움직이지 않아요
    pos() { return this.playing ? Math.min(this.duration, this.offset + Math.max(0, ctx.currentTime - this.anchor) * this.rate) : this.offset; }
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
      if (this.playing && ctx.currentTime > this.anchor) { this.offset = this.pos(); this.anchor = ctx.currentTime; }
      fn();
      if (this.src) this.src.playbackRate.setValueAtTime(this.rate, ctx.currentTime);
    }
    play(align = true) {
      if (!this.buffer || this.playing) return;
      ensureCtx();
      if (this.offset >= this.duration - 0.05) this.offset = 0;
      // SYNC가 켜져 있으면 상대 덱의 박자에 맞춰 시작해요
      const o = decks[1 - this.n];
      const wait = align && this.synced && !this.previewing && o.playing ? alignTo(this, o) : 0;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.playbackRate.value = this.rate;
      src.connect(this.low);
      src.onended = () => {
        if (this.src !== src) return;
        this.offset = this.duration; this.playing = false; this.src = null;
      };
      src.start(ctx.currentTime + wait, this.offset);
      Object.assign(this, { src, anchor: ctx.currentTime + wait, playing: true });
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
      if (this.playing) { this.pause(); this.offset = t; this.play(false); } else this.offset = t;
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

  // 상대 덱과 마디의 첫 박까지 맞춰요 (4박 단위). 곡의 첫머리에서 조금 일찍 눌렀으면 기다릴 시간(초)을 돌려줘요
  function alignTo(d, o) {
    let diff = (o.pos() / o.beat - d.pos() / d.beat) % 4;
    if (diff > 2) diff -= 4;
    if (diff < -2) diff += 4;
    let t = d.pos() + diff * d.beat;
    if (t < 0 && !d.playing) { d.seek(0); return -t / d.rate; }
    if (t < 0) t += 4 * d.beat;
    d.seek(t);
    return 0;
  }

  function sync(d) {
    const o = decks[1 - d.n];
    if (!d.buffer || !o.buffer) { toast("두 덱에 모두 곡을 불러와야 SYNC를 쓸 수 있어요."); return; }
    const tempo = clamp(o.bpm / d.track.bpm - 1, -RANGE, RANGE);
    ctl[`${d.n}.tempo`].set(tempo / (2 * RANGE) + 0.5);
    if (o.playing && d.playing) alignTo(d, o);
    d.synced = true; // 템포를 직접 바꾸기 전까지 켜져 있고, 재생하는 순간 박자를 맞춰요
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
    Object.assign(d, { track: def, buffer: null, wave: null, overview: null, loading: true, offset: 0, cue: 0, hot: [null, null, null, null], synced: false });
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
    guideEvents(d).forEach((ev) => {
      const x = xOf(ev.bar * 4 * d.beat);
      if (x < -160 * dpr || x > W) return;
      g.fillStyle = "#ff5fa2";
      g.fillRect(x - dpr, 0, 2 * dpr, H);
      g.font = `700 ${12 * dpr}px "Noto Sans KR", sans-serif`;
      const w = g.measureText(ev.label).width + 12 * dpr;
      g.fillRect(x, H - 20 * dpr, w, 20 * dpr);
      g.fillStyle = "#1a0a12";
      g.fillText(ev.label, x + 6 * dpr, H - 6 * dpr);
    });
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
    g.fillStyle = "#ff5fa2";
    guideEvents(d).forEach((ev) => g.fillRect((ev.bar / DJ_BARS) * W - dpr / 2, 0, dpr, H));
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
    u.sync.classList.toggle("on", d.synced);
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
    guideTick(now);
  }

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2600);
  }

  // ---------- 전환 가이드 ----------
  // 곡이 끝나갈 때 무엇을 해야 하는지 순서대로 알려주고, 만져야 할 조작부를 화면에서 빛나게 해요.
  const GUIDE_STORE = "bf-dj-guide";
  const PREP_BARS = 16;       // 다음 곡을 재생하기 몇 마디 전부터 준비를 안내할지
  const TOL = 0.06;           // 노브·페이더를 이만큼 안으로 맞추면 된 것으로 봐요
  const PLAY_STEP = 3;        // 0 곡 준비, 1 BPM, 2 세팅, 3 PLAY, 4~ 움직이기, 마지막은 마무리
  const CTL_NAMES = { hi: "HI", mid: "MID", low: "LOW", filter: "FILTER", fader: "볼륨", tempo: "템포" };
  const G = {
    on: true, method: DJ_METHODS[0], out: null, idx: 0, started: false, res: {}, first: -1, okN: 0, allN: 0,
    startErr: null, lastBar: 0, phBad: false, summary: null, lit: new Map(), sig: {}, events: []
  };
  try {
    const saved = JSON.parse(localStorage.getItem(GUIDE_STORE));
    if (saved) { G.on = saved.on !== false; G.method = DJ_METHODS.find((m) => m.id === saved.method) || G.method; }
  } catch { /* 저장소를 못 쓰는 브라우저 */ }
  const guideSave = () => { try { localStorage.setItem(GUIDE_STORE, JSON.stringify({ on: G.on, method: G.method.id })); } catch { /* 무시 */ } };

  const dk = (n) => `덱 ${n + 1}`;
  const isOn = (d) => d.playing && !d.previewing; // 큐 미리 듣기는 재생으로 치지 않아요
  const jo = (n, pair) => pair[n]; // 조사: 덱 1이·을 / 덱 2가·를
  const gText = (s, n) => s.replaceAll("{out}이 ", `${dk(n)}${jo(n, "이가")} `).replaceAll("{in}이 ", `${dk(1 - n)}${jo(1 - n, "이가")} `).replaceAll("{in}", dk(1 - n)).replaceAll("{out}", dk(n));
  const refId = (ref) => (ref === "xf" ? "xfader" : `${ref.startsWith("in.") ? 1 - G.out : G.out}.${ref.split(".")[1]}`);
  const refVal = (v) => (v === "out" ? G.out : v === "in" ? 1 - G.out : v); // 크로스페이더: 덱 1 쪽 = 0, 덱 2 쪽 = 1
  const ctlName = (id) => (id === "xfader" ? "크로스페이더" : `${dk(+id[0])} ${CTL_NAMES[id.slice(2)]}`);
  const keyOf = (id, dir) => (id === "xfader" ? "← →" : DECK_KEYS[+id[0]][id.slice(2)]).split(" ")[dir < 0 ? 0 : 1];
  const arrowOf = (kind, dir) => ({ knob: "↺↻", vfader: "↓↑", tempo: "↑↓", hfader: "←→" }[kind][dir < 0 ? 0 : 1]);

  const guideSteps = () => [
    { type: "load", label: "곡 준비" }, { type: "bpm", label: "BPM" }, { type: "set", label: "시작 세팅" },
    { type: "play", label: "PLAY" }, ...G.method.steps.map((s) => ({ type: "move", ...s })), { type: "end", label: "마무리" }
  ];
  let gSteps = guideSteps();

  function guideReset(out) {
    Object.assign(G, { out, idx: 0, started: false, res: {}, first: -1, okN: 0, allN: 0, startErr: null, lastBar: 0, phBad: false });
    G.events = out == null ? [] : [
      { bar: G.method.start, label: `▶ ${dk(1 - out)} PLAY` }, ...G.method.steps.map((s) => ({ bar: s.from, label: s.label }))
    ];
  }
  const guideEvents = (d) => (G.on && d.n === G.out ? G.events : []);

  // 나가는 덱 정하기: 한 번 정하면 그 곡이 멈출 때까지 바꾸지 않아요
  function guideOut() {
    if (G.out != null) {
      if (isOn(decks[G.out])) return;
      if (G.started && isOn(decks[1 - G.out])) guideFinish();
    }
    const on = decks.filter(isOn);
    const next = !on.length ? null : on.length === 1 ? on[0].n : +(on[1].pos() / on[1].duration > on[0].pos() / on[0].duration);
    if (next !== G.out) guideReset(next);
  }

  function guideFinish() {
    const n = G.method.steps.length;
    const marks = G.method.steps.map((_, k) => G.res[PLAY_STEP + 1 + k] || "miss");
    const good = marks.filter((m) => m === "ok").length;
    const hold = G.allN ? Math.round((G.okN / G.allN) * 100) : 0;
    const e = G.startErr;
    const late = e > 0 ? "늦음" : "빠름", abs = Math.abs(e);
    const start = e == null ? "—" : abs < 0.15 ? "정확해요" : abs < 4 ? `${abs.toFixed(1)}박 ${late}` : `${(abs / 4).toFixed(1)}마디 ${late}`;
    const tip = e != null && abs >= 0.5 ? "다음에는 파형의 분홍색 PLAY 선이 가운데 오는 순간에 맞춰 눌러 보세요."
      : hold < 80 ? "박자가 어긋난 시간이 길었어요. 재생한 직후에 박자 막대부터 확인해 보세요."
      : marks.includes("miss") ? "놓친 조작이 있어요. 빛나는 조작부에 미리 손을 올려 두세요."
      : marks.includes("fast") ? "조금 서둘렀어요. 노브의 분홍색 표시를 따라 천천히 움직여 보세요."
      : "아주 좋아요! 다른 방법에도 도전해 보세요.";
    G.summary = { title: `전환 완료! (${G.method.name})`, detail: `시작 타이밍 ${start} · 박자 유지 ${hold}% · 조작 ${good}/${n} — ${tip}`, until: performance.now() + 25000 };
  }

  const reachable = (t, o) => Math.abs(o.bpm / t.bpm - 1) <= RANGE;
  function guidePick(o, i) {
    if (i.track && i.track !== o.track && reachable(i.track, o)) return i.track;
    const k = DJ_TRACKS.indexOf(o.track);
    const rest = DJ_TRACKS.map((_, n) => DJ_TRACKS[(k + 1 + n) % DJ_TRACKS.length]).filter((t) => t !== o.track);
    return rest.find((t) => reachable(t, o)) || rest[0];
  }

  // 조작부 하나를 target까지 움직이라는 안내 (chips = 글, hl = 화면에서 빛나는 조작부)
  function guideMove(v, id, target, opts = {}) {
    const c = ctl[id], diff = target - c.value, ok = Math.abs(diff) <= (opts.tol ?? TOL);
    const dir = opts.dir || Math.sign(diff) || 1;
    const far = opts.follow == null ? !ok : Math.abs(opts.follow - c.value) > 0.04 && Math.sign(opts.follow - c.value) === dir;
    v.chips.push({ ctl: id, text: ctlName(id), arrow: arrowOf(c.kind, dir), key: keyOf(id, dir), ok });
    if (!ok) v.hl.push({ el: c.el, tag: `${arrowOf(c.kind, dir)} ${keyOf(id, dir)}`, target: opts.follow ?? target, kind: c.kind, def: c.def, cls: opts.wait ? "wait" : far ? "" : "easy" });
  }

  function guideCount(v, bars) {
    if (bars > 1) { v.big = String(Math.ceil(bars)); v.unit = "마디 뒤"; }
    else if (bars > 0) { v.big = String(Math.ceil(bars * 4)); v.unit = "박 뒤"; v.state = "soon"; }
    else { v.big = "지금"; v.unit = ""; v.state = "go"; }
  }

  function guideView(now) {
    const v = { title: "", detail: "", big: "", unit: "", state: "", chips: [], hl: [], load: "", retry: false, cur: -1 };
    if (G.summary && now > G.summary.until) G.summary = null;
    if (G.out == null) {
      const done = G.summary;
      v.title = done ? done.title : "재생을 시작하면 안내가 나와요";
      v.detail = done ? done.detail : "덱 1의 PLAY를 누르거나, 곡의 끝부분부터 바로 연습하려면 '전환 구간부터 연습'을 누르세요.";
      v.big = done ? "✓" : "▶"; v.state = done ? "done" : "";
      if (!done) v.chips.push({ text: "덱 1 PLAY", key: "V" });
      return v;
    }
    const o = decks[G.out], i = decks[1 - G.out], m = G.method;
    const bar = o.pos() / o.beat / 4;
    if (bar < G.lastBar - 0.5) { guideReset(G.out); G.summary = null; } // 되감았으면 처음부터
    G.lastBar = bar;

    const on = isOn(i);
    if (on && !G.started) { G.started = true; G.idx = PLAY_STEP + 1; G.summary = null; }
    if (!on && G.started) { G.started = false; G.startErr = null; G.idx = 0; G.res = {}; G.first = -1; }

    if (!G.started) return guidePrep(v, o, i, m, bar);

    // 두 곡이 함께 나오는 동안: 박자 확인이 먼저예요
    const iBeats = i.pos() / i.beat, oBeats = o.pos() / o.beat;
    let ph = oBeats - iBeats;
    ph -= Math.round(ph); // 양수면 들어오는 곡이 늦어요
    if (i.pos() > 0) {
      G.allN++;
      if (Math.abs(ph) < 0.04) G.okN++;
      if (G.startErr == null && iBeats > 1.5) G.startErr = oBeats - iBeats - m.start * 4;
      G.phBad = Math.abs(ph) > (G.phBad ? 0.03 : 0.05);
    }
    const k = DECK_KEYS[i.n];
    if (Math.abs(i.bpm - o.bpm) > 0.1) {
      v.chips.push({ text: `BPM이 달라졌어요 · ${dk(i.n)} SYNC`, key: k.sync, warn: true });
      v.hl.push({ el: i.ui.sync, cls: "" });
    } else if (G.phBad) {
      const key = k.nudge.split(" ")[ph > 0 ? 1 : 0];
      v.chips.push({ text: `${dk(i.n)}${jo(i.n, "이가")} ${ph > 0 ? "늦어요 · 앞으로 밀기" : "빨라요 · 뒤로 밀기"}`, key, warn: true });
      v.hl.push({ el: i.ui.jog, tag: `${ph > 0 ? "↻" : "↺"} ${key}`, cls: "" });
    }

    let st = gSteps[G.idx];
    while (st.type === "move") {
      const last = st.moves.every(([ref, , to]) => Math.abs(ctl[refId(ref)].value - refVal(to)) <= TOL);
      if (bar >= st.from) {
        if (last) {
          // 너무 일찍 끝냈으면(미리 돌려 둠, 또는 천천히 해야 할 조작을 급하게 함) 따로 표시해요
          const early = G.first !== G.idx || (st.to - st.from > 2 && bar < st.from + (st.to - st.from) * 0.4);
          G.res[G.idx] = early ? "fast" : "ok";
        } else if (bar > st.to + (st.grace ?? 1)) G.res[G.idx] = "miss";
        else { G.first = G.idx; break; }
        st = gSteps[++G.idx];
      } else break;
    }
    v.cur = G.idx;
    if (st.type === "end") {
      const audible = o.vals.fader > 0.1 && Math.abs(ctl.xfader.value - i.n) > 0.1;
      v.title = `${dk(o.n)}${jo(o.n, "을를")} 멈추면 끝이에요`;
      v.detail = audible ? `아직 ${dk(o.n)} 소리가 남아 있어요. 다 내린 뒤에 멈추세요.` : "곡이 끝나면 저절로 멈추기도 해요. 이제 이 덱에 다음 곡을 준비하면 돼요.";
      v.big = "✓"; v.state = "done";
      v.chips.push({ text: `${dk(o.n)} PLAY (멈춤)`, key: DECK_KEYS[o.n].play });
      v.hl.push({ el: o.ui.play, cls: "easy" });
      return v;
    }
    const wait = bar < st.from;
    const p = clamp((bar - st.from) / (st.to - st.from), 0, 1);
    const len = st.to - st.from;
    v.title = gText(st.title, G.out);
    v.detail = `${Math.floor(st.from) + 1}마디부터 ${len >= 1 ? `${Math.round(len)}마디 동안` : "바로"} · ${gText(st.why, G.out)}`;
    guideCount(v, st.from - bar);
    if (!wait && len >= 1) { v.unit = `${Math.max(1, Math.ceil(st.to - bar))}마디 동안`; }
    st.moves.forEach(([ref, from, to]) => {
      const a = refVal(from), b = refVal(to);
      guideMove(v, refId(ref), b, { dir: Math.sign(b - a), follow: wait ? null : a + (b - a) * p, wait });
    });
    return v;
  }

  // 다음 곡을 재생하기 전: 곡 준비 → BPM → 세팅 → PLAY
  function guidePrep(v, o, i, m, bar) {
    const k = DECK_KEYS[i.n], left = m.start - bar;
    if (left > PREP_BARS) {
      v.title = G.summary ? G.summary.title : `${dk(o.n)} 재생 중 · 아직 여유 있어요`;
      v.detail = G.summary ? G.summary.detail : `${m.start - PREP_BARS + 1}마디부터 다음 곡 준비를 안내할게요. 기다리지 않으려면 '전환 구간부터 연습'을 누르세요.`;
      v.big = String(Math.ceil(left - PREP_BARS)); v.unit = "마디 뒤 준비"; v.state = G.summary ? "done" : "";
      return v;
    }
    const pick = guidePick(o, i);
    const atStart = i.buffer && (i.pos() < 0.2 || i.pos() >= i.duration - 0.05);
    const loaded = atStart && i.track === pick;
    const bpmOk = loaded && Math.abs(i.bpm - o.bpm) <= 0.1;
    const want = { xf: 0.5 };
    ["out", "in"].forEach((side) => {
      ["hi", "mid", "low", "filter"].forEach((c) => { want[`${side}.${c}`] = 0.5; });
      want[`${side}.fader`] = 1;
    });
    Object.assign(want, m.set);
    const off = Object.entries(want).filter(([ref, val]) => Math.abs(ctl[refId(ref)].value - refVal(val)) > TOL);
    const setOk = !off.length;
    G.idx = !loaded ? 0 : !bpmOk ? 1 : !setOk ? 2 : PLAY_STEP;
    v.cur = G.idx;

    if (left < -1) {
      v.title = `${dk(i.n)}${jo(i.n, "을를")} 시작할 때를 놓쳤어요`;
      v.detail = `${m.start + 1}마디 첫 박에 재생했어야 해요. 괜찮아요, 다시 해 볼 수 있어요.`;
      v.big = "!"; v.state = "miss"; v.retry = true;
      return v;
    }
    guideCount(v, left);
    if (G.idx === 0) {
      const same = i.track === pick;
      v.title = i.loading ? "곡을 만드는 중이에요" : same ? `${dk(i.n)}${jo(i.n, "을를")} 곡의 처음으로 되돌리세요` : `${dk(i.n)}에 다음 곡을 불러오세요`;
      v.detail = `BPM을 맞출 수 있는 곡이어야 해요. 추천: ${pick.title} (${pick.bpm} BPM). 아래 버튼이나 트랙 목록에서 불러와요.`;
      v.load = i.loading ? "" : `${dk(i.n)}에 ${pick.title} ${same ? "다시 " : ""}불러오기`;
      const btn = ui.library.querySelector(`[data-load="${i.n}|${pick.id}"]`);
      if (btn) v.hl.push({ el: btn, cls: "" });
    } else if (G.idx === 1) {
      const t = o.bpm / i.track.bpm - 1;
      v.title = `${dk(i.n)}의 BPM을 ${o.bpm.toFixed(1)}로 맞추세요`;
      v.detail = `지금 ${i.bpm.toFixed(1)} BPM이에요. SYNC를 누르면 한 번에 맞고, 연습하려면 템포 슬라이더로 직접 맞춰 보세요.`;
      v.chips.push({ text: `${dk(i.n)} SYNC`, key: k.sync });
      v.hl.push({ el: i.ui.sync, cls: "" });
      if (Math.abs(t) <= RANGE) guideMove(v, `${i.n}.tempo`, t / (2 * RANGE) + 0.5, { tol: 0.002 });
      else {
        v.detail = `속도 차이가 커서 맞출 수 없어요. 먼저 ${dk(o.n)}의 템포를 가운데로 돌려 주세요.`;
        guideMove(v, `${o.n}.tempo`, 0.5);
      }
    } else if (G.idx === 2) {
      v.title = "빛나는 조작부를 분홍색 표시에 맞추세요";
      v.detail = `${m.name}의 시작 세팅이에요. ${m.set["in.low"] === 0 ? "저음이 겹치지 않게 LOW를 미리 빼 둬요." : m.set["in.filter"] ? "필터를 닫아 얇은 소리로 시작해요." : "크로스페이더를 지금 나오는 덱 쪽에 두면 다음 곡이 들리지 않아요."}`;
      off.forEach(([ref, val]) => guideMove(v, refId(ref), refVal(val)));
    } else {
      v.title = left > 0.12 ? `${m.start + 1}마디 첫 박에 ${dk(i.n)} PLAY` : `지금! ${dk(i.n)} PLAY`;
      v.detail = i.synced ? "SYNC가 켜져 있어서 조금 빗나가도 박자는 맞춰 줘요. 4·3·2·1을 세다가 누르세요." : "4·3·2·1을 세다가 첫 박에 누르고, 바로 박자 막대를 확인하세요.";
      v.chips.push({ text: `${dk(i.n)} PLAY`, key: k.play });
      v.hl.push({ el: i.ui.play, cls: left > 1 ? "wait" : "" });
    }
    return v;
  }

  function guideRender(v) {
    const put = (key, html, fn) => { if (G.sig[key] !== html) { G.sig[key] = html; fn(html); } };
    put("big", v.big, (t) => { ui.gBig.textContent = t; });
    put("unit", v.unit, (t) => { ui.gUnit.textContent = t; });
    put("title", v.title, (t) => { ui.gTitle.textContent = t; });
    put("detail", v.detail, (t) => { ui.gDetail.textContent = t; });
    put("state", v.state, (t) => { ui.gLive.dataset.state = t; });
    put("chips", v.chips.map((c) => `<button type="button" data-go="${c.ctl || ""}" class="dg-chip${c.ok ? " ok" : ""}${c.warn ? " warn" : ""}">${c.ok ? "✓ " : ""}${c.text}${c.arrow && !c.ok ? ` ${c.arrow}` : ""}${c.key && !c.ok ? ` ${kbd(c.key)}` : ""}</button>`).join(""),
      (t) => { ui.gChips.innerHTML = t; });
    put("load", v.load, (t) => { ui.gLoad.hidden = !t; ui.gLoad.textContent = t; });
    put("retry", String(v.retry), (t) => { ui.gRetry.hidden = t !== "true"; });
    put("steps", gSteps.map((s, n) => {
      const st = G.res[n] || (n === v.cur ? "now" : n < v.cur ? "ok" : "");
      return `<li class="${st}">${{ ok: "✓ ", fast: "△ ", miss: "✗ " }[st] || ""}${s.label}</li>`;
    }).join(""), (t) => {
        ui.gSteps.innerHTML = t;
        const cur = ui.gSteps.querySelector(".now");
        if (cur) ui.gSteps.scrollLeft = cur.offsetLeft - (ui.gSteps.clientWidth - cur.offsetWidth) / 2;
      });

    // 조작부 빛내기
    const next = new Map(v.hl.map((h) => [h.el, h]));
    G.lit.forEach((_, el) => { if (!next.has(el)) el.classList.remove("gl", "wait", "easy", "has-mark"); });
    next.forEach((h, el) => {
      el.classList.add("gl");
      el.classList.toggle("wait", h.cls === "wait");
      el.classList.toggle("easy", h.cls === "easy");
      el.classList.toggle("has-mark", h.target != null);
      const tag = el.querySelector(".gl-tag");
      if (tag) setText(tag, h.tag || "");
      if (h.target == null) return;
      if (h.kind === "knob") el.style.setProperty("--ga", `${-135 + h.target * 270}deg`);
      else el.style.setProperty("--gp", h.kind === "vfader" ? 1 - h.target : h.target);
    });
    G.lit = next;
  }

  function guideTick(now) {
    if (!G.on) return;
    guideOut();
    guideRender(guideView(now));
  }

  function guideSetOn(on) {
    G.on = on;
    if (!on) { G.lit.forEach((_, el) => el.classList.remove("gl", "wait", "easy", "has-mark")); G.lit = new Map(); }
    guideReset(null);
    guideSave();
    guideSyncUi();
  }

  function guideSetMethod(m) {
    G.method = m;
    gSteps = guideSteps();
    guideReset(null);
    G.summary = null;
    guideSave();
    guideSyncUi();
  }

  function guideSyncUi() {
    ui.gLive.hidden = !G.on;
    ui.gSteps.hidden = !G.on;
    ui.gToggle.textContent = G.on ? "가이드 켜짐" : "가이드 꺼짐";
    ui.gToggle.setAttribute("aria-pressed", G.on);
    root.querySelectorAll("[data-method]").forEach((b) => {
      b.classList.toggle("on", b.dataset.method === G.method.id);
      b.setAttribute("aria-pressed", b.dataset.method === G.method.id);
    });
    setText(ui.gSummary, G.method.summary);
  }

  // 전환 준비 구간으로 바로 이동: 조작부를 기본값으로 돌리고, 나가는 곡을 준비 시작 마디부터 재생해요
  function guideJump() {
    const n = G.out ?? (decks[0].buffer ? 0 : 1), o = decks[n], i = decks[1 - n];
    if (!o.buffer) { toast("곡을 만드는 중이에요. 잠시 후 다시 눌러 주세요."); return; }
    ensureCtx();
    if (!G.on) guideSetOn(true);
    decks.forEach((d) => { d.previewing = false; d.pause(); ["hi", "mid", "low", "filter", "fader"].forEach((c) => { const x = ctl[`${d.n}.${c}`]; x.set(x.def); }); });
    ctl.xfader.set(0.5);
    i.seek(0);
    i.cue = 0;
    G.summary = null;
    guideReset(n);
    o.seek((G.method.start - PREP_BARS) * 4 * o.beat);
    o.play(false);
  }

  // ---------- 조작키 설명 ----------
  function showInfo(id, n) {
    const info = DJ_INFO.find((x) => x.id === id);
    const sig = `${id}|${n}`;
    if (!info || G.sig.info === sig) return;
    G.sig.info = sig;
    const keys = !info.keys ? "" : info.keys.both ? info.keys.both : n == null ? "" : DECK_KEYS[n][info.keys];
    ui.gInfo.innerHTML = `<b>${n == null ? "" : `${dk(n)} `}${info.name}</b>${keys ? ` ${kbd(keys.replace(" ", "</kbd> <kbd>"))}` : ""} ${info.what}`;
  }

  function infoFromEl(el) {
    if (!el.closest || !el.closest(".dj-stage, .dj-waves")) return;
    const info = DJ_INFO.find((x) => el.closest(x.sel));
    if (!info) return;
    const deck = el.closest("[data-deck]");
    showInfo(info.id, deck ? +deck.dataset.deck : null);
  }

  function flashInfo(info) {
    const els = [...root.querySelectorAll(info.sel)].filter((el) => el.closest(".dj-stage, .dj-waves"));
    if (!els.length) return;
    els[0].closest(".dj-waves, .dj-console").scrollIntoView({ behavior: "smooth", block: "start" });
    els.forEach((el) => el.classList.add("flash-ctl"));
    setTimeout(() => els.forEach((el) => el.classList.remove("flash-ctl")), 2600);
    showInfo(info.id, null);
  }

  const guideHtml = () => `
    <div class="dj-guide">
      <div class="dg-bar">
        <b class="dg-name">전환 가이드</b>
        <div class="dg-methods">${DJ_METHODS.map((m) => `<button type="button" data-method="${m.id}">${m.name}<small>${m.level}</small></button>`).join("")}</div>
        <button type="button" class="dg-jump">전환 구간부터 연습</button>
        <button type="button" class="dg-toggle"></button>
      </div>
      <p class="dg-summary"></p>
    </div>
    <div class="dg-sticky">
      <div class="dg-live">
        <div class="dg-count"><b></b><span></span></div>
        <div class="dg-body">
          <strong class="dg-title" aria-live="polite"></strong>
          <p class="dg-detail"></p>
          <div class="dg-actions"><div class="dg-chips"></div><button type="button" class="dg-load" hidden></button><button type="button" class="dg-retry" hidden>다시 연습</button></div>
        </div>
      </div>
      <ol class="dg-steps"></ol>
      <p class="dg-info">조작부에 마우스를 올리거나 만지면, 또는 키를 누르면 무슨 역할인지 여기에 나와요.</p>
    </div>`;

  const plain = (s) => s.replaceAll("{in}", "다음 곡").replaceAll("{out}", "지금 곡");
  const methodsHtml = () => DJ_METHODS.map((m) => `
    <article class="dm">
      <h4>${m.name}<small>${m.level}</small></h4>
      <p>${m.summary}</p>
      <ol>
        <li><b>${m.start + 1}마디</b> 다음 곡 PLAY</li>
        ${m.steps.map((s) => `<li><b>${Math.floor(s.from) + 1}마디</b> ${plain(s.title)}</li>`).join("")}
      </ol>
      <p class="dj-note"><b>느낌</b> ${m.sound}<br><b>요령</b> ${m.tip}</p>
      <button type="button" class="dm-try" data-try="${m.id}">이 방법 연습하기</button>
    </article>`).join("");

  const infoHtml = () => ["믹서", "박자", "재생", "화면"].map((g) => `
    <h4 class="di-group">${g}</h4>
    <div class="di-grid">${DJ_INFO.filter((x) => x.group === g).map((x) => {
      const keys = !x.keys ? "" : x.keys.both ? `<span>${kbd(x.keys.both.replace(" ", "</kbd> <kbd>"))}</span>`
        : [0, 1].map((n) => `<span>${dk(n)} ${kbd(DECK_KEYS[n][x.keys].replace(" ", "</kbd> <kbd>"))}</span>`).join("");
      return `<button type="button" class="di" data-info="${x.id}"><b>${x.name}</b>${keys ? `<span class="di-keys">${keys}</span>` : ""}<span>${x.what}</span><span class="di-use">${x.use}</span></button>`;
    }).join("")}</div>`).join("");

  function guideBind() {
    const q = (s) => root.querySelector(s);
    Object.assign(ui, {
      gLive: q(".dg-live"), gBig: q(".dg-count b"), gUnit: q(".dg-count span"), gTitle: q(".dg-title"), gDetail: q(".dg-detail"),
      gChips: q(".dg-chips"), gLoad: q(".dg-load"), gRetry: q(".dg-retry"), gSteps: q(".dg-steps"), gInfo: q(".dg-info"),
      gToggle: q(".dg-toggle"), gSummary: q(".dg-summary")
    });
    root.querySelectorAll("[data-method]").forEach((b) => b.addEventListener("click", () => guideSetMethod(DJ_METHODS.find((m) => m.id === b.dataset.method))));
    root.querySelectorAll("[data-try]").forEach((b) => b.addEventListener("click", () => {
      guideSetMethod(DJ_METHODS.find((m) => m.id === b.dataset.try));
      guideJump();
      q(".dj-console").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    root.querySelectorAll("[data-info]").forEach((b) => b.addEventListener("click", () => flashInfo(DJ_INFO.find((x) => x.id === b.dataset.info))));
    q(".dg-jump").addEventListener("click", guideJump);
    ui.gRetry.addEventListener("click", guideJump);
    ui.gToggle.addEventListener("click", () => guideSetOn(!G.on));
    ui.gLoad.addEventListener("click", () => {
      if (G.out == null) return;
      const o = decks[G.out], i = decks[1 - G.out];
      load(i, guidePick(o, i));
    });
    // 안내 글을 누르면 그 조작부가 보이게 화면을 옮겨요 (휴대폰에서 조작부가 화면 밖에 있을 때)
    ui.gChips.addEventListener("click", (e) => {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      const el = b.dataset.go ? ctl[b.dataset.go].el : G.lit.keys().next().value;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    root.addEventListener("pointerover", (e) => infoFromEl(e.target));
    root.addEventListener("pointerdown", (e) => infoFromEl(e.target));
    guideSyncUi();
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
    if (key === "tempo") { d.change(() => { d.tempo = (v - 0.5) * 2 * RANGE; }); decks.forEach((x) => { x.synced = false; }); return; }
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
      <div class="knob" data-ctl="${id}" data-kind="knob"><div class="knob-dial"><i></i></div><i class="gl-mark"></i><em class="gl-tag"></em></div>
      ${keys ? kbd(keys) : ""}
    </div>`;
  const fader = (id, kind, cls) => `<div class="fader ${cls}" data-ctl="${id}" data-kind="${kind}"><div class="fader-slot"></div><div class="fader-cap"></div><i class="gl-mark"></i><em class="gl-tag"></em></div>`;

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
          <div class="jog"><em class="gl-tag"></em><div class="jog-platter"><i class="jog-mark"></i><div class="jog-center"><b class="jog-bpm">—</b><small>BPM</small></div></div></div>
          <span class="jog-hint">재생 중: 박자 밀기 · 멈춤: 위치 이동 ${kbd(k.nudge)}</span>
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
      <div class="dj-console">
      ${guideHtml()}
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
      </div>
      <div class="dj-bottom">
        <div class="dj-panel dj-library">
          <h3>트랙 목록</h3>
          <table><thead><tr><th>트랙</th><th>BPM</th><th>길이</th><th>불러오기</th></tr></thead><tbody></tbody></table>
          <p class="dj-note">모든 트랙은 64마디 구조예요: 인트로 16 · 빌드업 16 · 브레이크 8 · 드롭 16 · 아웃트로 8. 박자가 정확히 맞춰져 있어서 BPM만 맞으면 박이 겹쳐요.</p>
        </div>
        <div class="dj-panel dj-methods">
          <h3>곡을 넘기는 4가지 방법</h3>
          <p class="dj-note">어떤 방법이든 원칙은 같아요. ① BPM을 같게 ② 새 구간의 첫 박에 시작 ③ 저음은 한 번에 한 곡만. 아래 마디 숫자는 나가는 곡 기준이에요.</p>
          <div class="dm-grid">${methodsHtml()}</div>
        </div>
      </div>
      <div class="dj-panel dj-info">
        <h3>조작키 설명</h3>
        <p class="dj-note">카드를 누르면 화면에서 그 조작부가 반짝여요. 키를 <b>누르고 있으면</b> 계속 움직이고, <b>Shift</b>+조절 키는 기본값으로 되돌려요. 크로스페이더는 <b>Shift+화살표</b>를 누르면 그쪽 끝으로 단번에 넘어가요. 마우스는 드래그하거나 휠을 굴리고, 더블클릭하면 기본값이에요. 한글 입력 상태여도 작동해요.</p>
        ${infoHtml()}
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
    guideBind();

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
        jog: q(".jog"), jogMark: q(".jog-mark"), jogBpm: q(".jog-bpm"), play: q(".play"), cue: q(".cue"), sync: q(".sync"),
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
    showInfo(b ? b[1] : k[0] === "xfader" ? "xfader" : k[0].slice(2), b ? b[0] : k[0] === "xfader" ? null : +k[0][0]);
    if (b) { if (!e.repeat) press(decks[b[0]], b[1], true, e); return; }
    if (e.shiftKey) {
      // Shift+화살표: 크로스페이더를 그쪽 끝으로 단번에 / Shift+조절 키: 기본값으로 되돌리기
      if (k[0] === "xfader") { ctl.xfader.set(k[1] < 0 ? 0 : 1); return; }
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
