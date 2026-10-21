/* ============================================================
   worker.js : 카카오 로그인 + 회원(D1) 처리 서버

   주소(라우트)
   - GET  /auth/kakao/login     카카오 로그인 시작
   - GET  /auth/kakao/callback  카카오가 돌려보내는 주소 (Redirect URI)
   - GET  /auth/logout          로그아웃
   - GET  /api/me               내 정보 + 구매내역 조회
   - POST /api/me               표시 이름 수정
   - POST /api/withdraw         회원 탈퇴 (우리 DB 의 내 데이터 삭제)
   필요한 설정: Secret KAKAO_REST_API_KEY, D1 바인딩 DB
============================================================ */

const REDIRECT_PATH = "/auth/kakao/callback";   // 카카오에 등록한 주소와 같아야 함
const SESSION_DAYS = 14;                        // 로그인 유지 기간
let dbReady = false;                            // 테이블 생성 여부(서버가 켜진 동안 1번만)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      await initDb(env.DB);
      if (p === "/auth/kakao/login") return kakaoLogin(url, env);
      if (p === REDIRECT_PATH) return kakaoCallback(request, url, env);
      if (p === "/auth/logout") return logout(request, env);
      if (p === "/api/me") return request.method === "POST" ? updateMe(request, env) : getMe(request, env);
      if (p === "/api/withdraw" && request.method === "POST") return withdraw(request, env);
    } catch (e) {
      console.error(e);                          // 오류 내용은 Cloudflare 로그에서 확인
      return json({ error: "서버 오류가 발생했습니다." }, 500);
    }
    return env.ASSETS.fetch(request);            // 그 외는 사이트 파일 그대로 전달
  },
};

/* ---------- 1) 공통 도구 ---------- */

function json(data, status = 200, cookies = []) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  cookies.forEach(c => h.append("set-cookie", c));
  return new Response(JSON.stringify(data), { status, headers: h });
}
function redirect(location, cookies = []) {
  const h = new Headers({ location });
  cookies.forEach(c => h.append("set-cookie", c));
  return new Response(null, { status: 302, headers: h });
}
// 쿠키: HttpOnly(자바스크립트로 못 읽음) + Secure(https 만) + SameSite=Lax(외부 사이트 요청 제한)
const cookie = (name, value, maxAge, path = "/") =>
  `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
function getCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? m[1] : null;
}
// 추측 불가능한 랜덤 문자열 (세션 토큰, state 용)
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))]
  .map(b => b.toString(16).padStart(2, "0")).join("");
const now = () => Math.floor(Date.now() / 1000);
// POST 요청이 우리 사이트에서 온 것인지 확인 (다른 사이트의 몰래 요청 차단)
const sameOrigin = (request) => request.headers.get("origin") === new URL(request.url).origin;

/* ---------- 2) 데이터베이스 (처음 실행 시 테이블 자동 생성) ---------- */

async function initDb(db) {
  if (dbReady) return;
  await db.batch([
    // 회원: 카카오 회원번호로 구분, display_name 은 회원이 수정 가능한 이름
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, kakao_id TEXT UNIQUE NOT NULL,
      kakao_nickname TEXT, display_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
    // 로그인 상태: 쿠키의 토큰과 매칭
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL)`),
    // 구매내역: 지금은 비어 있음 (나중에 도면 구매 정보를 넣을 자리)
    db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      product TEXT NOT NULL, purchased_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
  ]);
  dbReady = true;
}

// 쿠키의 세션 토큰으로 로그인한 회원 찾기 (없거나 만료면 null)
function getUser(request, env) {
  const token = getCookie(request, "session");
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.display_name, u.kakao_nickname FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token = ?1 AND s.expires_at > ?2`
  ).bind(token, now()).first();
}

/* ---------- 3) 카카오 로그인 ---------- */

// 1단계: 카카오 로그인 화면으로 보냄 (state = 위조 방지용 확인 값)
function kakaoLogin(url, env) {
  const state = randHex(16);
  const q = new URLSearchParams({
    client_id: env.KAKAO_REST_API_KEY, redirect_uri: url.origin + REDIRECT_PATH,
    response_type: "code", state,
  });
  return redirect("https://kauth.kakao.com/oauth/authorize?" + q, [cookie("oauth_state", state, 600, "/auth")]);
}

// 2단계: 카카오가 인가 코드를 들고 돌아옴 → 토큰 → 회원 정보 → 세션 생성
async function kakaoCallback(request, url, env) {
  const clearState = cookie("oauth_state", "", 0, "/auth");
  const fail = () => redirect("/mypage.html?error=login", [clearState]);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== getCookie(request, "oauth_state")) return fail();

  // 인가 코드 → 액세스 토큰
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code", client_id: env.KAKAO_REST_API_KEY,
      redirect_uri: url.origin + REDIRECT_PATH, code,
    }),
  });
  if (!tokenRes.ok) return fail();
  const { access_token } = await tokenRes.json();

  // 액세스 토큰 → 회원 정보(회원번호, 닉네임)
  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { authorization: "Bearer " + access_token },
  });
  if (!meRes.ok) return fail();
  const me = await meRes.json();
  const kakaoId = String(me.id);
  const nick = me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? "회원";

  // 처음이면 가입, 이미 회원이면 카카오 닉네임만 갱신 (수정한 표시 이름은 유지)
  await env.DB.prepare(
    `INSERT INTO users (kakao_id, kakao_nickname, display_name) VALUES (?1, ?2, ?2)
     ON CONFLICT(kakao_id) DO UPDATE SET kakao_nickname = ?2`
  ).bind(kakaoId, nick).run();
  const user = await env.DB.prepare("SELECT id FROM users WHERE kakao_id = ?1").bind(kakaoId).first();

  // 로그인 상태(세션) 생성
  const token = randHex(32);
  const maxAge = SESSION_DAYS * 86400;
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)")
    .bind(token, user.id, now() + maxAge).run();
  return redirect("/mypage.html", [cookie("session", token, maxAge), clearState]);
}

async function logout(request, env) {
  const token = getCookie(request, "session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
  return redirect("/", [cookie("session", "", 0)]);
}

/* ---------- 4) 회원 API ---------- */

async function getMe(request, env) {
  const user = await getUser(request, env);
  if (!user) return json({ loggedIn: false });
  const { results } = await env.DB.prepare(
    "SELECT product, purchased_at FROM purchases WHERE user_id = ?1 ORDER BY id DESC"
  ).bind(user.id).all();
  return json({ loggedIn: true, displayName: user.display_name,
                kakaoNickname: user.kakao_nickname, purchases: results });
}

async function updateMe(request, env) {
  if (!sameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  const user = await getUser(request, env);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const body = await request.json().catch(() => ({}));
  const name = String(body.displayName ?? "").trim();
  if (name.length < 1 || name.length > 20) return json({ error: "표시 이름은 1~20자로 입력하세요." }, 400);
  await env.DB.prepare("UPDATE users SET display_name = ?1 WHERE id = ?2").bind(name, user.id).run();
  return json({ ok: true, displayName: name });
}

// 탈퇴: 우리 DB 의 회원/세션/구매내역 삭제 (카카오 쪽 연결 해제는 카카오 계정 설정에서)
async function withdraw(request, env) {
  if (!sameOrigin(request)) return json({ error: "잘못된 요청입니다." }, 403);
  const user = await getUser(request, env);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM purchases WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user.id),
    env.DB.prepare("DELETE FROM users WHERE id = ?1").bind(user.id),
  ]);
  return json({ ok: true }, 200, [cookie("session", "", 0)]);
}
