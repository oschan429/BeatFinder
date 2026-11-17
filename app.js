// ---------- 유틸 ----------
const $ = (sel) => document.querySelector(sel);

const norm = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9가-힣\s]/g, " ")
  .replace(/\s+/g, " ").trim();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1);
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

const baseTitle = (t) => String(t).replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\s-\s.*$/, "").trim() || t;
const firstArtist = (a) => String(a).split(/,|&|\sx\s|\sfeat\.?\s|\swith\s/i)[0].trim();
const trackKey = (t) => `${norm(baseTitle(t.title))}|${norm(firstArtist(t.artist))}`;

// 받침 유무에 따라 조사 고르기 (하우스는 / 테크노란 / IDM은)
const hasBatchim = (word) => {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code >= 0 && code <= 11171) return code % 28 !== 0;
  return /[lmn]$/i.test(ch);
};
const josa = (word, withB, withoutB) => word + (hasBatchim(word) ? withB : withoutB);

const familyOf = (genre) => GENRES[genre].family;
const isRelatedFamily = (f1, f2) => RELATED_FAMILIES.some(([a, b]) => (a === f1 && b === f2) || (a === f2 && b === f1));

const bassWord = (v) => v <= 3 ? "가벼운" : v <= 6 ? "적당한" : v <= 8 ? "묵직한" : "아주 강한";
const energyWord = (v) => v <= 3 ? "잔잔한" : v <= 6 ? "중간 정도의" : v <= 8 ? "높은" : "폭발적인";
const brightWord = (v) => v <= 3 ? "어둡고 따뜻한" : v <= 6 ? "균형 잡힌" : "밝고 선명한";
const vocalWord = { vocal: "보컬 중심", sample: "보컬 샘플", inst: "연주곡(인스트루멘탈)" };

// ---------- 애플뮤직(iTunes Search API, JSONP) ----------
let jsonpSeq = 0;

function jsonp(url, timeout = 8000) {
  return new Promise((resolve) => {
    const cb = `__bf_cb_${jsonpSeq++}`;
    const script = document.createElement("script");
    const done = (val) => { delete window[cb]; script.remove(); clearTimeout(timer); resolve(val); };
    const timer = setTimeout(() => done(null), timeout);
    window[cb] = (data) => done(data);
    script.onerror = () => done(null);
    script.src = `${url}&callback=${cb}`;
    document.head.appendChild(script);
  });
}

// 애플 검색 API는 분당 약 20회로 제한돼 있어서, 결과를 하루 동안 기억해 둬요.
const SEARCH_KEY = "bf_search_v1";
const SEARCH_TTL = 24 * 60 * 60 * 1000;
let searchCache = {};
try { searchCache = JSON.parse(localStorage.getItem(SEARCH_KEY) || "{}"); } catch { searchCache = {}; }
const KEEP_FIELDS = ["trackId", "trackName", "artistName", "releaseDate", "primaryGenreName", "previewUrl", "artworkUrl60", "artworkUrl100", "trackViewUrl", "collectionName"];

// 실패하면 null, 결과가 없으면 [] 를 돌려줘요.
async function itunesSearch(term, extra = {}) {
  const params = new URLSearchParams({ term, media: "music", entity: "song", limit: 25, ...extra });
  const key = params.toString();
  const hit = searchCache[key];
  if (hit && Date.now() - hit.t < SEARCH_TTL) return hit.r;
  const data = await jsonp(`https://itunes.apple.com/search?${params}`);
  if (!data) return null;
  const results = (data.results || []).map((r) => Object.fromEntries(KEEP_FIELDS.map((f) => [f, r[f]])));
  searchCache[key] = { t: Date.now(), r: results };
  try {
    const keys = Object.keys(searchCache);
    if (keys.length > 300) keys.sort((a, b) => searchCache[a].t - searchCache[b].t).slice(0, 100).forEach((k) => delete searchCache[k]);
    localStorage.setItem(SEARCH_KEY, JSON.stringify(searchCache));
  } catch { /* 저장 공간 부족 등은 무시 */ }
  return results;
}

const yearOf = (r) => r.releaseDate ? +r.releaseDate.slice(0, 4) : null;
const isElectronic = (r) => ELECTRONIC_GENRE_RE.test(r.primaryGenreName || "");
const JUNK_RE = /\b(mixed|extended|instrumental|live|acapella|a cappella|karaoke|sped up|slowed|dj mix)\b/i;
// 추천 후보에서는 원곡만 쓰도록 리믹스·다른 버전도 빼요
const VERSION_RE = /remix|\bdub\b|acoustic|rework|\bvip\b|version|bootleg|\bflip\b|sped|slowed/i;
const COMPILATION_RE =/remaster|greatest|best of|anthology|classics|collection|\bhits\b|years of/i;

function curatedFor(t) {
  const key = trackKey(t);
  return CURATED.find((c) => trackKey(c) === key) || null;
}
const artistGenre = (artist) => {
  const a = norm(firstArtist(artist));
  const c = CURATED.find((x) => norm(firstArtist(x.artist)) === a);
  if (c) return c.genre;
  const g = Object.entries(GENRE_ARTISTS).find(([, list]) => list.some((x) => norm(x) === a));
  return g ? g[0] : null;
};

function fromApple(r) {
  const t = {
    id: `a${r.trackId}`,
    title: r.trackName,
    artist: r.artistName,
    year: yearOf(r),
    appleGenre: r.primaryGenreName,
    preview: r.previewUrl || null,
    art: (r.artworkUrl100 || "").replace("100x100bb", "400x400bb"),
    thumb: r.artworkUrl60 || r.artworkUrl100,
    url: r.trackViewUrl,
    curated: false, genre: null, genreGuessed: true, mood: [], moodAuto: true, vocal: null
  };
  const c = curatedFor(t);
  if (c) Object.assign(t, { curated: true, genre: c.genre, genreGuessed: false, mood: c.mood, moodAuto: false, vocal: c.vocal });
  else if (APPLE_GENRE_MAP[t.appleGenre]) Object.assign(t, { genre: APPLE_GENRE_MAP[t.appleGenre], genreGuessed: false });
  return t;
}

// 큐레이션 곡은 애플뮤직 정보와 분석값을 미리 계산해 둬서(curated-apple.js) 요청 없이 바로 써요.
const CURATED_TRACKS = CURATED.map((c) => {
  const a = (typeof CURATED_APPLE !== "undefined") && CURATED_APPLE[`${c.artist}|${c.title}`];
  if (!a) return null;
  return {
    ...c, id: `a${a.trackId}`, artist: a.artistName, appleGenre: a.genre,
    preview: a.preview, art: a.art, url: a.url,
    genreGuessed: false, moodAuto: false, feat: toScores(a.raw)
  };
}).filter(Boolean);

// ---------- 음원 분석 ----------
const FEAT_KEY = "bf_feat_v1";
let featCache = {};
try { featCache = JSON.parse(localStorage.getItem(FEAT_KEY) || "{}"); } catch { featCache = {}; }
function saveFeatCache() {
  try { localStorage.setItem(FEAT_KEY, JSON.stringify(featCache)); } catch { /* 저장 공간 부족 등은 무시 */ }
}

let decodeCtx = null;
async function analyzePreview(url) {
  const cacheKey = url.split("?")[0];
  if (featCache[cacheKey]) return featCache[cacheKey];
  const buf = await (await fetch(url)).arrayBuffer();
  decodeCtx = decodeCtx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 44100, 44100);
  const audioBuf = await decodeCtx.decodeAudioData(buf);
  const chs = Array.from({ length: audioBuf.numberOfChannels }, (_, i) => audioBuf.getChannelData(i));
  const raw = analyzePcm(chs, audioBuf.sampleRate);
  featCache[cacheKey] = raw;
  saveFeatCache();
  return raw;
}

// 원시 분석값 → 1~10 점수 (실제 곡 20여 개로 범위를 맞췄어요)
function toScores(raw) {
  const lowDb = raw.loudDb + 20 * Math.log10(raw.bassRatio || 1e-6);
  const s = (x) => Math.round(clamp(1 + 9 * x, 1, 10));
  return {
    bpm: raw.bpm,
    bass: s(0.6 * unit(raw.bassRatio, 0.35, 0.95) + 0.4 * unit(lowDb, -27, -9)),
    energy: s(0.5 * unit(raw.loudDb, -18, -8) +0.3 * unit(raw.brightRatio, 0.05, 0.35) + 0.2 * unit(raw.bpm, 90, 175)),
    bright: s(unit(raw.brightRatio, 0.04, 0.32))
  };
}

function autoMoods(f) {
  const m = [];
  if (f.bright >= 7) m.push("밝은");
  if (f.bright <= 3) m.push("어두운");
  if (f.energy >= 8) m.push("강렬한");
  if (f.energy <= 4) m.push("차분한");
  if (f.energy >= 6 && f.bpm >= 120 && f.bright >= 5) m.push("신나는");
  return m;
}

function guessGenreFromSound(f) {
  if (f.bpm >= 160) return "dnb";
  if (f.bpm >= 138 && f.bass >= 7) return "uk-bass";
  if (f.bpm >= 131) return "techno";
  if (f.bpm >= 118) return "house";
  if (f.bpm >= 100) return f.bass >= 6 ? "future-bass" : "downtempo";
  return "downtempo";
}

async function analyzeTrack(t) {
  if (t.feat) return t;
  if (!t.preview) throw new Error("no preview");
  t.feat = toScores(await analyzePreview(t.preview));
  if (!t.genre) {
    t.genre = artistGenre(t.artist) || guessGenreFromSound(t.feat);
    t.genreGuessed = true;
  }
  if (t.moodAuto) t.mood = autoMoods(t.feat);
  return t;
}

async function runPool(items, size, worker) {
  let i = 0;
  const out = [];
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await worker(items[idx], idx); } catch { out[idx] = null; }
    }
  }));
  return out;
}

// ---------- 후보곡 모으기 (2020년 이후만) ----------
async function gatherCandidates(seed, progress) {
  const seedKey = trackKey(seed);
  const seedArtist = norm(firstArtist(seed.artist));
  const fam = familyOf(seed.genre);
  const famScore = (g) => g === seed.genre ? 3 : familyOf(g) === fam ? 2 : isRelatedFamily(familyOf(g), fam) ? 1 : 0;

  // 1) 큐레이션 곡 전체 (분석값이 미리 계산돼 있어서 요청이 필요 없어요)
  const curated = CURATED_TRACKS.filter((c) => trackKey(c) !== seedKey);

  // 2) 같은 장르 대표 아티스트 2명 + 같은 계열의 다른 장르 아티스트 1명의 2020년 이후 곡
  const notSeed = (a) => norm(a) !== seedArtist;
  const sameGenre = shuffle((GENRE_ARTISTS[seed.genre] || []).filter(notSeed)).slice(0, 2);
  const sameFamily = shuffle(Object.entries(GENRE_ARTISTS)
    .filter(([g]) => g !== seed.genre && familyOf(g) === fam)
    .flatMap(([, list]) => list).filter((a) => notSeed(a) && !sameGenre.includes(a))).slice(0, 1);
  const artists = [...sameGenre, ...sameFamily];

  const pickFromArtist = async (artist, n, inheritGenre) => {
    const results = (await itunesSearch(artist, { attribute: "artistTerm", limit: 50 })) || [];
    const seen = new Set();
    return shuffle(results.filter((r) =>
      r.previewUrl && yearOf(r) >= MIN_YEAR && isElectronic(r) &&
      norm(r.artistName).includes(norm(artist)) &&
      !JUNK_RE.test(r.trackName) && !VERSION_RE.test(r.trackName) && !COMPILATION_RE.test(r.collectionName || "")
    )).filter((r) => {
      const k = trackKey({ title: r.trackName, artist: r.artistName });
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, n).map((r) => {
      const t = fromApple(r);
      if (!t.genre && inheritGenre) { t.genre = inheritGenre; t.genreGuessed = true; }
      return t;
    });
  };

  const searches = artists.map((a) => pickFromArtist(a, 4, artistGenre(a)));
  if (!seed.manual) searches.push(pickFromArtist(firstArtist(seed.artist), 2, seed.genre));
  // 3) 애플뮤직 장르가 구체적이면(예: Techno) 그 장르로도 검색
  if (APPLE_GENRE_MAP[seed.appleGenre]) {
    searches.push(itunesSearch(seed.appleGenre, { limit: 50 }).then((rs) => shuffle((rs || []).filter((r) =>
      r.previewUrl && yearOf(r) >= MIN_YEAR && r.primaryGenreName === seed.appleGenre && !JUNK_RE.test(r.trackName) && !VERSION_RE.test(r.trackName)
    )).slice(0, 5).map(fromApple)));
  }

  progress("애플뮤직에서 2020년 이후 후보곡을 모으는 중…", 0);
  const appleLists = await Promise.all(searches);

  const pool = new Map();
  for (const t of appleLists.flat()) {
    const k = trackKey(t);
    if (k !== seedKey && !pool.has(k) && t.preview && !curated.some((c) => trackKey(c) === k)) pool.set(k, t);
  }
  const list = [...pool.values()];

  let done = 0;
  const analyzed = await runPool(list, 6, async (t) => {
    const r = await analyzeTrack(t);
    progress(`새로 찾은 후보곡의 음원을 분석하는 중… (${++done}/${list.length})`, done / list.length);
    return r;
  });
  return [...curated, ...analyzed.filter(Boolean)];
}

// ---------- 추천 엔진 ----------
function tempoCompare(a, b) {
  const direct = Math.abs(a - b);
  const half = Math.min(Math.abs(a - b * 2), Math.abs(a * 2 - b));
  return half + 4 < direct ? { diff: half, halftime: true } : { diff: direct, halftime: false };
}

function compare(seed, cand) {
  const reasons = [];
  const s = seed.feat, c = cand.feat;
  let score = 0;

  // 1) 장르 (최대 30)
  const gs = GENRES[seed.genre], gc = GENRES[cand.genre];
  const guess = seed.genreGuessed || cand.genreGuessed ? " <small>(장르 추정)</small>" : "";
  if (seed.genre === cand.genre) {
    score += 30;
    reasons.push({ w: 30, icon: "🎛️", text: `같은 장르예요: 둘 다 <b>${gc.name}</b>${guess}` });
  } else if (gs.family === gc.family) {
    score += 20;
    reasons.push({ w: 20, icon: "🧬", text: `같은 <b>${FAMILY_NAMES[gc.family]}</b>이에요 (${gs.name} ↔ ${gc.name})${guess}` });
  } else if (isRelatedFamily(gs.family, gc.family)) {
    score += 9;
    reasons.push({ w: 9, icon: "🔗", text: `사운드가 겹치는 가까운 장르예요 (${gs.name} ↔ ${gc.name})${guess}` });
  }

  // 2) 속도 (최대 25)
  const tempo = tempoCompare(s.bpm, c.bpm);
  const tempoPts = 25 * Math.max(0, 1 - tempo.diff / 20);
  score += tempoPts;
  if (tempo.halftime && tempo.diff <= 8) {
    reasons.push({ w: tempoPts, icon: "⏱️", text: `하프타임으로 들으면 속도가 맞아요 (${s.bpm} ↔ ${c.bpm} BPM, 약 2배 관계)` });
  } else if (tempo.diff <= 3) {
    reasons.push({ w: tempoPts, icon: "⏱️", text: `속도가 거의 같아요 (${s.bpm} ↔ <b>${c.bpm} BPM</b>)` });
  } else if (tempo.diff <= 9) {
    reasons.push({ w: tempoPts, icon: "⏱️", text: `속도가 비슷해요 (${s.bpm} ↔ <b>${c.bpm} BPM</b>)` });
  }

  // 3) 베이스 (최대 14)
  const bassDiff = Math.abs(s.bass - c.bass);
  const bassPts = 14 * (1 - bassDiff / 9);
  score += bassPts;
  if (bassDiff <= 1) {
    const label = bassWord(s.bass) === bassWord(c.bass) ? `: 둘 다 <b>${bassWord(c.bass)} 베이스</b>` : "";
    reasons.push({ w: bassPts, icon: "🔊", text: `베이스 강조 정도가 비슷해요${label} (${s.bass} ↔ ${c.bass}/10)` });
  }

  // 4) 에너지 (최대 12)
  const enDiff = Math.abs(s.energy - c.energy);
  const enPts = 12 * (1 - enDiff / 9);
  score += enPts;
  if (enDiff <= 1) {
    const label = energyWord(s.energy) === energyWord(c.energy) ? `: 둘 다 <b>${energyWord(c.energy)} 에너지</b>` : "";
    reasons.push({ w: enPts, icon: "⚡", text: `에너지 레벨이 비슷해요${label} (${s.energy} ↔ ${c.energy}/10)` });
  }

  // 5) 음색 밝기 (최대 8)
  if (s.bright != null) {
    const brDiff = Math.abs(s.bright - c.bright);
    const brPts = 8 * (1 - brDiff / 9);
    score += brPts;
    if (brDiff <= 1) {
      const label = brightWord(s.bright) === brightWord(c.bright) ? `: 둘 다 <b>${brightWord(c.bright)} 소리</b>` : "";
      reasons.push({ w: brPts, icon: "🎨", text: `음색의 밝기가 비슷해요${label}` });
    }
  }

  // 6) 분위기 (최대 9)
  const shared = seed.mood.filter((m) => cand.mood.includes(m));
  if (seed.mood.length && cand.mood.length) {
    const moodPts = 9 * shared.length / Math.max(seed.mood.length, cand.mood.length);
    score += moodPts;
    if (shared.length) reasons.push({ w: moodPts + 3, icon: "🌙", text: `공통된 분위기: ${shared.map((m) => `<b>${m}</b>`).join(", ")}` });
  }

  // 7) 보컬 스타일 (최대 2, 둘 다 알 때만)
  if (seed.vocal && cand.vocal && seed.vocal === cand.vocal) {
    score += 2;
    reasons.push({ w: 2, icon: "🎤", text: `보컬 스타일이 같아요: 둘 다 ${vocalWord[cand.vocal]}` });
  }

  reasons.sort((a, b) => b.w - a.w);
  return { score, reasons };
}

function recommend(seed, candidates, n = 3) {
  const ranked = candidates
    .map((t) => ({ track: t, ...compare(seed, t) }))
    .sort((a, b) => b.score - a.score);
  // 같은 아티스트가 겹치지 않게, 원곡 아티스트는 다른 후보가 부족할 때만
  const seedArtist = norm(firstArtist(seed.artist));
  const picked = [], used = new Set([seedArtist]);
  for (const r of ranked) {
    const a = norm(firstArtist(r.track.artist));
    if (used.has(a)) continue;
    picked.push(r); used.add(a);
    if (picked.length === n) return picked;
  }
  for (const r of ranked) {
    if (!picked.includes(r)) picked.push(r);
    if (picked.length === n) break;
  }
  return picked;
}

// ---------- 미리듣기 ----------
const audio = new Audio();
let playingBtn = null;
const trackRegistry = new Map();

function stopAudio() {
  audio.pause();
  if (playingBtn) {
    playingBtn.classList.remove("playing");
    playingBtn.querySelector(".label").textContent = "30초 미리듣기";
    playingBtn.style.setProperty("--p", 0);
  }
  playingBtn = null;
}
audio.addEventListener("timeupdate", () => {
  if (playingBtn && audio.duration) playingBtn.style.setProperty("--p", audio.currentTime / audio.duration);
});
audio.addEventListener("ended", stopAudio);

function togglePreview(btn, track) {
  if (playingBtn === btn) { stopAudio(); return; }
  stopAudio();
  audio.src = track.preview;
  audio.play().catch(() => { btn.querySelector(".label").textContent = "재생 실패"; });
  playingBtn = btn;
  btn.classList.add("playing");
  btn.querySelector(".label").textContent = "일시정지";
}

// ---------- 렌더링 ----------
const spotifyUrl = (t) => `https://open.spotify.com/search/${encodeURIComponent(`${baseTitle(t.title)} ${firstArtist(t.artist)}`)}`;
const youtubeUrl = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${firstArtist(t.artist)} ${baseTitle(t.title)}`)}`;

function artHue(t) {
  let h = 0;
  for (const c of t.title + t.artist) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function meter(label, value, seedValue) {
  if (value == null) return "";
  const dots = Array.from({ length: 10 }, (_, i) => {
    const cls = i < value ? "on" : (seedValue != null && i < seedValue ? "ghost" : "");
    return `<i class="${cls}"></i>`;
  }).join("");
  const cmp = seedValue != null ? `<span class="cmp">원곡 ${seedValue}</span>` : "";
  return `<div class="meter"><span class="m-label">${label}</span><span class="dots">${dots}</span><span class="m-val">${value}</span>${cmp}</div>`;
}

function actionsHtml(t) {
  if (t.manual) return "";
  trackRegistry.set(t.id, t);
  return `
    <div class="actions">
      ${t.preview ? `<button class="btn-play" data-preview="${esc(t.id)}" style="--p:0">
        <span class="play-ring"></span><span class="label">30초 미리듣기</span>
      </button>` : ""}
      <a class="btn-link spotify" href="${spotifyUrl(t)}" target="_blank" rel="noopener">Spotify</a>
      <a class="btn-link youtube" href="${youtubeUrl(t)}" target="_blank" rel="noopener">YouTube</a>
    </div>`;
}

function artHtml(t) {
  const img = t.art ? ` style="--h:${artHue(t)};background-image:url('${esc(t.art)}')"` : ` style="--h:${artHue(t)}"`;
  return `<div class="art${t.art ? " loaded" : ""}"${img}><span>${t.manual ? "?" : esc(t.title.charAt(0))}</span></div>`;
}

function genreChip(t) {
  const g = GENRES[t.genre];
  return `<span class="chip genre" title="${esc(g.desc)}">${g.name}${t.genreGuessed ? ` <small class="guess">추정</small>` : ""}</span>`;
}

function renderSeed(t) {
  const g = GENRES[t.genre];
  const f = t.feat;
  $("#seedCard").innerHTML = `
    ${artHtml(t)}
    <div class="seed-body">
      <p class="eyebrow">당신이 고른 곡</p>
      <h2>${esc(t.title)}</h2>
      <p class="artist">${esc(t.artist)}${t.year ? ` · ${t.year}` : ""}</p>
      <div class="chips">
        ${genreChip(t)}
        <span class="chip">${f.bpm} BPM</span>
        ${t.mood.map((m) => `<span class="chip soft">${m}</span>`).join("")}
      </div>
      <p class="genre-desc"><b>${g.name}</b>${hasBatchim(g.name) ? "이란" : "란"}?${g.desc}${t.genreGuessed ? " <span class='muted'>(애플뮤직 장르가 넓게 분류돼 있어서, 소리와 아티스트를 보고 추정했어요)</span>" : ""}</p>
      <div class="meters">
        ${meter("베이스", f.bass)}
        ${meter("에너지", f.energy)}
        ${meter("밝기", f.bright)}
      </div>
      ${actionsHtml(t)}
    </div>`;
}

function renderRecs(seed, recs) {
  if (!recs.length) {
    $("#recGrid").innerHTML = `<p class="empty">후보곡을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>`;
    return;
  }
  $("#recGrid").innerHTML = recs.map(({ track: t, score, reasons }, i) => {
    const g = GENRES[t.genre];
    const pct = Math.round(clamp(score, 0, 100));
    return `
      <article class="card" style="animation-delay:${i * 90}ms">
        ${artHtml(t)}
        <div class="card-body">
          <div class="card-top">
            <span class="rank">#${i + 1}</span>
            <span class="match"><b>${pct}%</b> 비슷함</span>
          </div>
          <h3>${esc(t.title)}</h3>
          <p class="artist">${esc(t.artist)} · ${t.year}</p>
          <div class="chips">
            ${genreChip(t)}
            <span class="chip">${t.feat.bpm} BPM</span>
            <span class="chip src ${t.curated ? "cur" : ""}">${t.curated ? "큐레이션" : "애플뮤직 발견"}</span>
          </div>
          <div class="meters">
            ${meter("베이스", t.feat.bass, seed.feat.bass)}
            ${meter("에너지", t.feat.energy, seed.feat.energy)}
            ${seed.feat.bright != null ? meter("밝기", t.feat.bright, seed.feat.bright) : ""}
          </div>
          <div class="why">
            <h4>이 곡을 추천한 이유</h4>
            <ul>${reasons.slice(0, 4).map((r) => `<li><span class="ic">${r.icon}</span><span>${r.text}</span></li>`).join("")}</ul>
          </div>
          <details class="genre-more">
            <summary>${josa(g.name, "은", "는")} 어떤 장르?</summary>
            <p>${g.desc}</p>
          </details>
          ${actionsHtml(t)}
        </div>
      </article>`;
  }).join("");
}

function wireCards(container) {
  container.querySelectorAll("[data-preview]").forEach((btn) => {
    btn.addEventListener("click", () => togglePreview(btn, trackRegistry.get(btn.dataset.preview)));
  });
}

function show(sections) {
  ["#hero", "#fallback", "#loading", "#results"].forEach((id) => { $(id).hidden = true; });
  sections.forEach((id) => { $(id).hidden = false; });
  document.body.classList.toggle("compact", sections.length > 1);
}

function setProgress(text, ratio) {
  $("#loadingText").textContent = text;
  $("#loadingBar").style.width = `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
}

// ---------- 전체 흐름 ----------
let runId = 0;

async function runRecommendation(seed) {
  const myRun = ++runId;
  stopAudio();
  hideSuggestions();
  show(["#hero", "#loading"]);
  setProgress("고른 곡의 미리듣기 음원을 분석하는 중…", 0);
  $("#loading").scrollIntoView({ behavior: "smooth", block: "start" });

  if (!seed.manual) {
    try {
      await analyzeTrack(seed);
    } catch {
      if (myRun === runId) openFallback(seed.title, seed, "이 곡은 미리듣기 음원이 없어서 분석할 수 없어요.");
      return;
    }
  }
  const candidates = await gatherCandidates(seed, (text, r) => { if (myRun === runId) setProgress(text, r); });
  if (myRun !== runId) return;

  renderSeed(seed);
  renderRecs(seed, recommend(seed, candidates));
  show(["#hero", "#results"]);
  wireCards($("#results"));
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- 검색 & 자동완성 ----------
const input = $("#searchInput");
const sugList = $("#suggestions");
let sugItems = [];
let sugIndex = -1;
let sugQuery = "";
let sugTimer = null;
let sugReq = 0;

function hideSuggestions() { sugList.hidden = true; sugIndex = -1; }

function setStatus(text) {
  $("#searchStatus").textContent = text || "";
  $("#searchStatus").hidden = !text;
}
const RATE_MSG = "애플뮤직이 응답하지 않아요. 인터넷 연결을 확인하거나, 요청이 많았다면 1분쯤 뒤에 다시 시도해 주세요.";

// 실패하면 null
async function fetchSuggestions(q) {
  const results = await itunesSearch(q, { limit: 15 });
  if (!results) return null;
  const seen = new Set();
  return results
    .filter((r) => r.previewUrl && !JUNK_RE.test(r.trackName))
    .filter((r) => {
      const k = trackKey({ title: r.trackName, artist: r.artistName });
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 7)
    .map(fromApple);
}

function renderSuggestions() {
  if (!sugItems.length || !input.value.trim()) { hideSuggestions(); return; }
  sugList.innerHTML = sugItems.map((t, i) => `
    <li role="option" data-i="${i}" class="${i === sugIndex ? "active" : ""}">
      ${t.thumb ? `<img src="${esc(t.thumb)}" alt="">` : `<span class="thumb-ph"></span>`}
      <span class="s-text">
        <span class="s-title">${esc(t.title)}</span>
        <span class="s-artist">${esc(t.artist)}${t.year ? ` · ${t.year}` : ""}</span>
      </span>
      <span class="s-genre">${esc(t.appleGenre || "")}</span>
    </li>`).join("");
  sugList.hidden = false;
}

input.addEventListener("input", () => {
  clearTimeout(sugTimer);
  const q = input.value.trim();
  if (!q) { sugItems = []; hideSuggestions(); return; }
  if (q.length < 2) return;
  sugTimer = setTimeout(async () => {
    const req = ++sugReq;
    const items = await fetchSuggestions(q);
    if (req !== sugReq) return;
    setStatus(items ? "" : RATE_MSG);
    sugItems = items || []; sugQuery = q; sugIndex = -1;
    renderSuggestions();
  }, 400);
});
input.addEventListener("keydown", (e) => {
  if (sugList.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); sugIndex = (sugIndex + 1) % sugItems.length; renderSuggestions(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sugIndex = (sugIndex - 1 + sugItems.length) % sugItems.length; renderSuggestions(); }
  else if (e.key === "Escape") hideSuggestions();
});
sugList.addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  e.preventDefault();
  pick(sugItems[+li.dataset.i]);
});
input.addEventListener("blur", () => setTimeout(hideSuggestions, 100));

function pick(t) {
  input.value = `${t.title} - ${t.artist}`;
  input.blur();
  runRecommendation(t);
}

$("#searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  if (sugIndex >= 0 && sugItems[sugIndex]) { pick(sugItems[sugIndex]); return; }
  clearTimeout(sugTimer);
  sugReq++;
  const items = sugQuery === q && sugItems.length ? sugItems : await fetchSuggestions(q.replace(/\s-\s/g, " "));
  if (!items) { setStatus(RATE_MSG); return; }
  setStatus("");
  if (items.length) pick(items[0]);
  else openFallback(q, null, "애플뮤직에서 이 곡을 찾지 못했어요.");
});

// ---------- 곡을 못 찾았을 때: 느낌 직접 입력 ----------
const fbMoods = new Set();

function openFallback(q, track, reason) {
  stopAudio();
  hideSuggestions();
  $("#fallbackQuery").textContent = q;
  $("#fallbackReason").textContent = reason;
  if (track && track.genre) $("#fbGenre").value = track.genre;
  show(["#hero", "#fallback"]);
  $("#fallback").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#fbGenre").innerHTML = Object.entries(GENRES)
  .map(([k, g]) => `<option value="${k}">${g.name} — ${FAMILY_NAMES[g.family]}</option>`).join("");
$("#fbGenre").value = "house";

[["#fbBpm", "#fbBpmOut"], ["#fbBass", "#fbBassOut"], ["#fbEnergy", "#fbEnergyOut"]].forEach(([inp, out]) => {
  $(inp).addEventListener("input", () => { $(out).textContent = $(inp).value; });
});

$("#fbMoods").innerHTML = MOODS.map((m) => `<button type="button" class="chip toggle" data-mood="${m}">${m}</button>`).join("");
$("#fbMoods").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mood]");
  if (!b) return;
  const m = b.dataset.mood;
  fbMoods.has(m) ? fbMoods.delete(m) : fbMoods.add(m);
  b.classList.toggle("on");
});

$("#fbSubmit").addEventListener("click", () => {
  runRecommendation({
    id: "manual",
    manual: true,
    title: $("#fallbackQuery").textContent,
    artist: "직접 입력한 느낌",
    year: null,
    genre: $("#fbGenre").value,
    genreGuessed: false,
    appleGenre: null,
    feat: { bpm: +$("#fbBpm").value, bass: +$("#fbBass").value, energy: +$("#fbEnergy").value, bright: null },
    mood: [...fbMoods],
    vocal: null
  });
});

// ---------- 예시 칩 & 홈 ----------
function renderExamples() {
  $("#exampleChips").innerHTML = shuffle(CURATED_TRACKS).slice(0, 5)
    .map((c) => `<button type="button" class="chip example" data-ex="${c.id}">${esc(c.title)} <small>${esc(firstArtist(c.artist))}</small></button>`).join("");
}
$("#exampleChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ex]");
  if (b) pick(CURATED_TRACKS.find((x) => x.id === b.dataset.ex));
});

$("#homeLink").addEventListener("click", (e) => {
  e.preventDefault();
  runId++;
  stopAudio();
  input.value = "";
  renderExamples();
  show(["#hero"]);
  window.scrollTo({ top: 0, behavior: "smooth" });
  input.focus();
});

renderExamples();
show(["#hero"]);
input.focus();
