// ---------- 신청곡 ----------
// 신청곡은 Firebase(Cloud Firestore)에 저장해서 모든 방문자가 같은 목록을 봐요.
// Firebase 콘솔 → 프로젝트 설정에서 "프로젝트 ID"를 아래에 넣으면 동작해요. (보안 규칙은 firestore.rules)
const REQ_FIREBASE = {
  projectId: "beatfinder-oschan429",
  apiKey: "AIzaSyA9RaBVCu5MvssuWTsrfy9mGBA5IAMUbrY",   // 프로젝트 설정 → 내 앱(웹)의 apiKey. 관리자 로그인에만 써요. (공개돼도 괜찮은 값이에요)
};

const REQ = (() => {
  const LIMIT = 150;
  const LIKED_KEY = "bf_req_liked_v1";
  const LAST_KEY = "bf_req_last_v1";
  const COOLDOWN = 30 * 1000;   // 같은 브라우저에서 연달아 신청하는 것 막기

  const ready = () => !!REQ_FIREBASE.projectId;
  const base = () => `https://firestore.googleapis.com/v1/projects/${REQ_FIREBASE.projectId}/databases/(default)/documents`;

  // ---------- 관리자 로그인 (Firebase 이메일/비밀번호) ----------
  // 수정·삭제 권한은 firestore.rules에서 관리자 UID로만 허용해요. 화면의 버튼은 편의용이에요.
  const ADMIN_KEY = "bf_req_admin_v1";
  let admin = null;   // { email, idToken, refreshToken, exp }
  try { admin = JSON.parse(localStorage.getItem(ADMIN_KEY) || "null"); } catch { admin = null; }
  const saveAdmin = () => { try { admin ? localStorage.setItem(ADMIN_KEY, JSON.stringify(admin)) : localStorage.removeItem(ADMIN_KEY); } catch { /* 무시 */ } };
  const authUrl = (u) => `${u}?key=${encodeURIComponent(REQ_FIREBASE.apiKey)}`;

  const LOGIN_ERRORS = {
    INVALID_LOGIN_CREDENTIALS: "이메일이나 비밀번호가 맞지 않아요.",
    INVALID_PASSWORD: "이메일이나 비밀번호가 맞지 않아요.",
    EMAIL_NOT_FOUND: "이메일이나 비밀번호가 맞지 않아요.",
    INVALID_EMAIL: "이메일 형식이 아니에요.",
    USER_DISABLED: "사용이 중지된 계정이에요.",
    OPERATION_NOT_ALLOWED: "Firebase에서 이메일/비밀번호 로그인이 꺼져 있어요."
  };

  async function signIn(email, password) {
    const res = await fetch(authUrl("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = String(d.error && d.error.message || "").split(" ")[0];
      throw new Error(LOGIN_ERRORS[code] || (code.startsWith("TOO_MANY") ? "시도가 너무 많아요. 잠시 뒤에 다시 해 주세요." : "로그인하지 못했어요."));
    }
    admin = { email: d.email, idToken: d.idToken, refreshToken: d.refreshToken, exp: Date.now() + (+d.expiresIn - 60) * 1000 };
    saveAdmin();
  }

  function signOut() { admin = null; saveAdmin(); }

  // 로그인 토큰은 1시간짜리라, 만료되면 저장해 둔 refreshToken으로 새로 받아요.
  async function adminToken() {
    if (!admin) return null;
    if (Date.now() < admin.exp) return admin.idToken;
    try {
      const res = await fetch(authUrl("https://securetoken.googleapis.com/v1/token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: admin.refreshToken })
      });
      if (!res.ok) throw new Error("refresh");
      const d = await res.json();
      admin = { ...admin, idToken: d.id_token, refreshToken: d.refresh_token, exp: Date.now() + (+d.expires_in - 60) * 1000 };
      saveAdmin();
      return admin.idToken;
    } catch {
      signOut();
      return null;
    }
  }

  async function headers() {
    const h = { "Content-Type": "application/json" };
    const t = await adminToken();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }

  let root, items = [], sort = "hot", picked = null, loading = false, built = false;
  let sugTimer = null, sugReq = 0, sugItems = [];

  let liked = new Set();
  try { liked = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); } catch { /* 무시 */ }
  const saveLiked = () => { try { localStorage.setItem(LIKED_KEY, JSON.stringify([...liked])); } catch { /* 무시 */ } };

  const safeUrl = (u) => /^https:\/\//.test(u || "") ? u : "";

  // ---------- Firestore REST ----------
  const val = (v) => v == null ? null : "stringValue" in v ? v.stringValue : "integerValue" in v ? +v.integerValue : "timestampValue" in v ? v.timestampValue : null;

  async function fetchList() {
    const res = await fetch(`${base()}:runQuery`, {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "requests" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: LIMIT
      } })
    });
    if (!res.ok) throw new Error(`list ${res.status}`);
    const rows = await res.json();
    return rows.filter((r) => r.document).map(({ document: d }) => {
      const f = d.fields || {};
      return {
        name: d.name, id: d.name.split("/").pop(),
        title: val(f.title) || "", artist: val(f.artist) || "",
        who: val(f.name) || "", message: val(f.message) || "",
        art: safeUrl(val(f.art)), preview: safeUrl(val(f.preview)), url: safeUrl(val(f.url)),
        likes: val(f.likes) || 0, status: val(f.status) || "new", createdAt: val(f.createdAt)
      };
    });
  }

  async function commit(writes) {
    const res = await fetch(`${base()}:commit`, {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ writes })
    });
    if (!res.ok) throw new Error(`commit ${res.status}`);
  }

  const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]).join("");
  const str = (s) => ({ stringValue: s });

  function createRequest(data) {
    const name = `projects/${REQ_FIREBASE.projectId}/databases/(default)/documents/requests/${randomId()}`;
    return commit([{
      update: { name, fields: {
        title: str(data.title), artist: str(data.artist), name: str(data.who), message: str(data.message),
        art: str(data.art), preview: str(data.preview), url: str(data.url),
        likes: { integerValue: "0" }, status: str("new")
      } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }]
    }]);
  }

  const addLike = (docName) => commit([{
    transform: { document: docName, fieldTransforms: [{ fieldPath: "likes", increment: { integerValue: "1" } }] }
  }]);

  // 관리자 전용 (규칙에서 관리자 UID만 허용)
  const setReqStatus = (docName, status) => commit([{
    update: { name: docName, fields: { status: str(status) } },
    updateMask: { fieldPaths: ["status"] },
    currentDocument: { exists: true }
  }]);
  const deleteReq = (docName) => commit([{ delete: docName }]);

  // ---------- 곡 검색 (애플뮤직 / 아이폰은 디저) ----------
  async function searchSongs(q) {
    const results = IS_IOS ? await deezerSearch(q) : await itunesSearch(q, { limit: 20 });
    if (!results) return null;
    const seen = new Set();
    return results.map(IS_IOS ? fromDeezer : fromApple)
      .filter((t) => !COVER_RE.test(`${t.title} ${t.artist} ${t.album || ""}`))
      .filter((t) => { const k = trackKey(t); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8);
  }

  // ---------- 화면 ----------
  function build() {
    root = $("#requests");
    root.innerHTML = `
      <div class="req-head">
        <p class="eyebrow">SONG REQUESTS</p>
        <h2>듣고 싶은 곡을 신청해 주세요</h2>
        <p class="sub">장르는 상관없어요. EDM이 아니어도 괜찮아요. 다른 사람이 신청한 곡에 <b>♥</b>를 눌러 응원할 수도 있어요.</p>
      </div>

      <form class="req-form" id="reqForm" autocomplete="off">
        <div class="req-search">
          <input id="reqSearch" type="text" placeholder="곡 제목이나 아티스트로 검색" aria-label="신청곡 검색">
          <ul class="suggestions" id="reqSug" role="listbox" hidden></ul>
        </div>
        <div class="req-picked" id="reqPicked" hidden></div>
        <p class="req-manual-hint" id="reqManualHint">검색해도 안 나오면 <button type="button" class="req-textbtn" id="reqManualBtn">직접 입력</button>할 수 있어요.</p>
        <div class="req-manual" id="reqManual" hidden>
          <input id="reqTitle" type="text" maxlength="200" placeholder="곡 제목" aria-label="곡 제목">
          <input id="reqArtist" type="text" maxlength="200" placeholder="아티스트" aria-label="아티스트">
        </div>
        <div class="req-extra">
          <input id="reqWho" type="text" maxlength="30" placeholder="닉네임 (선택)" aria-label="닉네임">
          <input id="reqMsg" type="text" maxlength="200" placeholder="한마디 (선택)" aria-label="한마디">
        </div>
        <button type="submit" class="btn-primary" id="reqSubmit">신청하기</button>
        <p class="req-status" id="reqStatus" hidden></p>
      </form>

      <div class="req-list-head">
        <h3>신청곡 목록 <small id="reqCount"></small></h3>
        <div class="req-sort">
          <button type="button" class="chip toggle on" data-sort="hot">♥ 많은 순</button>
          <button type="button" class="chip toggle" data-sort="new">최신순</button>
          <button type="button" class="chip toggle" data-sort="refresh" aria-label="새로고침">↻</button>
        </div>
      </div>
      <ul class="req-list" id="reqList"></ul>
      <div class="req-admin" id="reqAdmin"></div>`;

    const input = $("#reqSearch"), sug = $("#reqSug");

    input.addEventListener("input", () => {
      clearTimeout(sugTimer);
      const q = input.value.trim();
      if (q.length < 2) { sug.hidden = true; return; }
      sugTimer = setTimeout(async () => {
        const req = ++sugReq;
        const found = await searchSongs(q);
        if (req !== sugReq) return;
        if (!found) { setStatus("음악 검색이 잠시 안 돼요. 아래 '직접 입력'으로 신청해 주세요.", true); return; }
        sugItems = found;
        renderSug();
      }, 400);
    });
    sug.addEventListener("mousedown", (e) => { if (e.target.closest("li")) e.preventDefault(); });
    sug.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      if (li.dataset.manual) { openManual(input.value.trim()); return; }
      pick(sugItems[+li.dataset.i]);
    });
    document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".req-search")) sug.hidden = true; });

    $("#reqManualBtn").addEventListener("click", () => openManual(input.value.trim()));
    $("#reqPicked").addEventListener("click", (e) => { if (e.target.closest("[data-unpick]")) unpick(); });
    $("#reqForm").addEventListener("submit", submit);

    root.querySelector(".req-sort").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sort]");
      if (!b) return;
      if (b.dataset.sort === "refresh") { load(); return; }
      sort = b.dataset.sort;
      root.querySelectorAll(".req-sort [data-sort]").forEach((x) => x.classList.toggle("on", x.dataset.sort === sort));
      renderList();
    });
    $("#reqList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-like]");
      if (b) like(b.dataset.like);
      const a = e.target.closest("[data-act]");
      if (a) adminAct(a.dataset.act, a.closest("[data-id]").dataset.id, a);
    });
    $("#reqAdmin").addEventListener("click", (e) => {
      const b = e.target.closest("[data-admin]");
      if (!b) return;
      if (b.dataset.admin === "open") renderAdmin(true);
      else if (b.dataset.admin === "cancel") renderAdmin(false);
      else if (b.dataset.admin === "logout") { signOut(); renderAdmin(false); renderList(); }
    });
    $("#reqAdmin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target, msg = form.querySelector(".req-admin-msg"), btn = form.querySelector("button[type=submit]");
      btn.disabled = true; msg.textContent = "";
      try {
        await signIn(form.email.value.trim(), form.password.value);
        renderAdmin(false);
        renderList();
      } catch (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      }
    });
    renderAdmin(false);
    built = true;
  }

  function renderSug() {
    const sug = $("#reqSug");
    sug.innerHTML = sugItems.map((t, i) => `
      <li role="option" data-i="${i}">
        ${t.thumb ? `<img src="${esc(t.thumb)}" alt="">` : `<span class="thumb-ph"></span>`}
        <span class="s-text">
          <span class="s-title">${esc(t.title)}</span>
          <span class="s-artist">${esc(t.artist)}${t.year ? ` · ${t.year}` : ""}</span>
        </span>
        <span class="s-genre">${esc(t.appleGenre || "")}</span>
      </li>`).join("") + `<li class="req-sug-manual" data-manual="1">찾는 곡이 없나요? <b>직접 입력하기</b></li>`;
    sug.hidden = false;
  }

  function pick(t) {
    picked = t;
    $("#reqSug").hidden = true;
    $("#reqSearch").value = "";
    $("#reqSearch").parentElement.hidden = true;
    $("#reqManual").hidden = true;
    $("#reqManualHint").hidden = true;
    $("#reqPicked").innerHTML = `
      ${t.art ? `<img src="${esc(t.art)}" alt="">` : `<span class="thumb-ph"></span>`}
      <span class="g-text"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></span>
      <button type="button" class="req-textbtn" data-unpick>다시 고르기</button>`;
    $("#reqPicked").hidden = false;
    setStatus("");
  }

  function unpick() {
    picked = null;
    $("#reqPicked").hidden = true;
    $("#reqSearch").parentElement.hidden = false;
    $("#reqManualHint").hidden = false;
    $("#reqSearch").focus();
  }

  function openManual(q) {
    picked = null;
    $("#reqSug").hidden = true;
    $("#reqPicked").hidden = true;
    $("#reqSearch").parentElement.hidden = true;
    $("#reqManualHint").hidden = true;
    $("#reqManual").hidden = false;
    if (q && !$("#reqTitle").value) $("#reqTitle").value = q;
    $("#reqTitle").focus();
  }

  function resetForm() {
    picked = null;
    ["#reqSearch", "#reqTitle", "#reqArtist", "#reqMsg"].forEach((s) => { $(s).value = ""; });
    $("#reqPicked").hidden = true;
    $("#reqManual").hidden = true;
    $("#reqSearch").parentElement.hidden = false;
    $("#reqManualHint").hidden = false;
  }

  function setStatus(text, bad) {
    const el = $("#reqStatus");
    el.textContent = text || "";
    el.hidden = !text;
    el.classList.toggle("bad", !!bad);
  }

  async function submit(e) {
    e.preventDefault();
    if (!ready()) { setStatus("아직 신청곡 저장소가 연결되지 않았어요.", true); return; }
    const manualOpen = !$("#reqManual").hidden;
    const title = picked ? picked.title : $("#reqTitle").value.trim();
    const artist = picked ? picked.artist : $("#reqArtist").value.trim();
    if (!title) { setStatus(manualOpen ? "곡 제목을 적어 주세요." : "검색해서 곡을 골라 주세요.", true); return; }

    let last = 0;
    try { last = +localStorage.getItem(LAST_KEY) || 0; } catch { /* 무시 */ }
    if (Date.now() - last < COOLDOWN) { setStatus("방금 신청했어요. 30초 뒤에 다시 신청할 수 있어요.", true); return; }

    const dup = items.find((r) => trackKey(r) === trackKey({ title, artist }) && r.status !== "played");
    if (dup) {
      setStatus("이미 신청된 곡이에요. 목록에서 ♥를 눌러 주세요!", true);
      highlight(dup.id);
      return;
    }

    const btn = $("#reqSubmit");
    btn.disabled = true;
    try {
      await createRequest({
        title: title.slice(0, 200), artist: artist.slice(0, 200),
        who: $("#reqWho").value.trim().slice(0, 30), message: $("#reqMsg").value.trim().slice(0, 200),
        art: picked ? safeUrl(picked.art) : "", preview: picked ? safeUrl(picked.preview) : "", url: picked ? safeUrl(picked.url) : ""
      });
      try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch { /* 무시 */ }
      resetForm();
      setStatus("신청했어요! 🎶");
      sort = "new";
      root.querySelectorAll(".req-sort [data-sort]").forEach((x) => x.classList.toggle("on", x.dataset.sort === sort));
      await load();
    } catch {
      setStatus("신청을 저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.", true);
    } finally {
      btn.disabled = false;
    }
  }

  async function like(id) {
    const r = items.find((x) => x.id === id);
    if (!r || liked.has(id)) return;
    liked.add(id); saveLiked();
    r.likes++;
    renderList();
    try { await addLike(r.name); }
    catch { liked.delete(id); saveLiked(); r.likes--; renderList(); }
  }

  function renderAdmin(formOpen) {
    const box = $("#reqAdmin");
    if (!REQ_FIREBASE.apiKey) { box.innerHTML = ""; return; }
    if (admin) {
      box.innerHTML = `<p class="req-admin-on">🔑 관리자 모드 · ${esc(admin.email)} <button type="button" class="req-textbtn" data-admin="logout">로그아웃</button></p>`;
    } else if (formOpen) {
      box.innerHTML = `
        <form class="req-admin-form" autocomplete="on">
          <input name="email" type="email" placeholder="관리자 이메일" autocomplete="username" required>
          <input name="password" type="password" placeholder="비밀번호" autocomplete="current-password" required>
          <button type="submit" class="btn-primary">로그인</button>
          <button type="button" class="req-textbtn" data-admin="cancel">닫기</button>
          <p class="req-admin-msg"></p>
        </form>`;
      box.querySelector("input").focus();
    } else {
      box.innerHTML = `<button type="button" class="req-admin-link" data-admin="open">관리자</button>`;
    }
  }

  async function adminAct(act, id, btn) {
    const r = items.find((x) => x.id === id);
    if (!r || !admin) return;
    if (act === "delete" && !confirm(`"${r.title}" 신청곡을 지울까요? 되돌릴 수 없어요.`)) return;
    btn.disabled = true;
    try {
      if (act === "delete") { await deleteReq(r.name); items = items.filter((x) => x !== r); }
      else { await setReqStatus(r.name, act); r.status = act; }
      renderList();
    } catch {
      btn.disabled = false;
      alert(admin ? "처리하지 못했어요. 관리자 계정이 맞는지, Firebase 규칙이 최신인지 확인해 주세요." : "로그인이 만료됐어요. 다시 로그인해 주세요.");
      renderAdmin(false);
    }
  }

  function highlight(id) {
    const li = $("#reqList").querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!li) return;
    li.scrollIntoView({ behavior: "smooth", block: "center" });
    li.classList.remove("flash"); void li.offsetWidth; li.classList.add("flash");
  }

  const ago = (iso) => {
    if (!iso) return "";
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "방금";
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  };

  function renderList() {
    const list = $("#reqList");
    $("#reqCount").textContent = items.length ? `${items.length}곡` : "";
    if (!ready()) { list.innerHTML = `<li class="req-empty">신청곡 저장소를 준비하고 있어요. 곧 열릴 거예요!</li>`; return; }
    if (loading && !items.length) { list.innerHTML = `<li class="req-empty">불러오는 중…</li>`; return; }
    if (!items.length) { list.innerHTML = `<li class="req-empty">아직 신청곡이 없어요. 첫 곡을 신청해 주세요!</li>`; return; }

    const sorted = [...items].sort((a, b) =>
      (a.status === "played") - (b.status === "played") ||
      (sort === "hot" ? b.likes - a.likes : 0) ||
      String(b.createdAt).localeCompare(String(a.createdAt)));

    list.innerHTML = sorted.map((r) => {
      const pid = `req-${r.id}`;
      if (r.preview) trackRegistry.set(pid, { id: pid, title: r.title, artist: r.artist, preview: r.preview });
      const on = liked.has(r.id);
      return `
      <li class="req-item${r.status === "played" ? " played" : ""}" data-id="${esc(r.id)}">
        ${r.art ? `<img src="${esc(r.art)}" alt="" loading="lazy">` : `<span class="thumb-ph req-ph">♪</span>`}
        <div class="req-text">
          <b>${esc(r.title)}</b>
          <span>${esc(r.artist || "아티스트 미입력")}</span>
          ${r.message ? `<p class="req-msg">“${esc(r.message)}”</p>` : ""}
          <small>${r.who ? `${esc(r.who)} · ` : ""}${ago(r.createdAt)}${r.status === "played" ? ` · <em>✓ 틀었어요</em>` : ""}</small>
        </div>
        <div class="req-actions">
          ${r.preview ? `<button class="btn-play" data-preview="${esc(pid)}" style="--p:0" aria-label="${esc(r.title)} 30초 미리듣기"><span class="play-ring"></span><span class="label">30초 미리듣기</span></button>` : ""}
          <button type="button" class="req-like${on ? " on" : ""}" data-like="${esc(r.id)}" ${on ? "disabled" : ""} aria-label="나도 듣고 싶어요">♥ <span>${r.likes}</span></button>
        </div>
        ${admin ? `<div class="req-admin-acts">
          ${r.status === "played"
            ? `<button type="button" data-act="new">↺ 되돌리기</button>`
            : `<button type="button" data-act="played" class="ok">✓ 틀었어요</button>`}
          <button type="button" data-act="delete" class="del">삭제</button>
        </div>` : ""}
      </li>`;
    }).join("");
    wireCards(list);
  }

  async function load() {
    if (!ready()) { renderList(); return; }
    loading = true;
    renderList();
    try {
      items = await fetchList();
    } catch {
      if (!items.length) $("#reqList").innerHTML = `<li class="req-empty">목록을 불러오지 못했어요. ↻를 눌러 다시 시도해 주세요.</li>`;
      loading = false;
      return;
    }
    loading = false;
    renderList();
  }

  function enter() {
    if (!built) build();
    load();
  }

  function leave() {
    if (built) $("#reqSug").hidden = true;
  }

  return { enter, leave };
})();
