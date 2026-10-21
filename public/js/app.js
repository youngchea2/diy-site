/* ============================================================
   app.js : 페이지를 그려주는 프로그램 (config.js, data.js 의 내용을 사용)

   구성
   1) 공통 도구 함수 (글자 안전처리, 가격 표시 등)
   2) 공통 영역 그리기 (상단 메뉴, 하단)
   3) 메인 페이지 그리기
   4) 상세 페이지 그리기
   5) 시작 지점 (현재 페이지를 판단해서 알맞은 함수 실행)
============================================================ */

/* ---------- 1) 공통 도구 함수 ---------- */

// HTML 특수문자를 안전한 글자로 바꿈 (데이터에 < > 가 있어도 깨지지 않게)
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 가격 표시: 0 → "무료", 5000 → "5,000원"
function formatPrice(price) {
  return price === 0 ? "무료" : price.toLocaleString("ko-KR") + "원";
}

// 공개(published) 상태인 프로젝트만 골라냄
function getPublished() {
  return PROJECTS.filter(p => p.status === "published");
}

// 유튜브 썸네일 주소 (영상 ID가 없으면 빈 글자)
function thumbUrl(p) {
  return p.youtubeId
    ? `https://img.youtube.com/vi/${encodeURIComponent(p.youtubeId)}/hqdefault.jpg` : "";
}

/* ---------- 2) 공통 영역 ---------- */

function renderLayout() {
  // 상단 메뉴
  const channel = SITE.youtubeChannel
    ? `<a href="${esc(SITE.youtubeChannel)}" target="_blank" rel="noopener">유튜브</a>` : "";
  document.getElementById("site-header").innerHTML =
    `<nav class="nav"><a class="logo" href="index.html">${esc(SITE.name)}</a>${channel}</nav>`;

  // 하단
  document.getElementById("site-footer").innerHTML =
    `© ${SITE.year} ${esc(SITE.name)} · 문의 <a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a>
     · <a href="privacy.html">개인정보처리방침</a>`;
}

/* ---------- 3) 메인 페이지 ---------- */

function renderHome() {
  document.getElementById("hero-title").textContent = SITE.heroTitle;
  document.getElementById("hero-desc").textContent = SITE.heroDesc;

  // 프로젝트마다 카드 1장을 만들어 이어 붙임
  document.getElementById("project-grid").innerHTML = getPublished().map(p => {
    const bg = thumbUrl(p) ? `style="background-image:url('${thumbUrl(p)}')"` : "";
    const placeholder = thumbUrl(p) ? "" : "영상 준비중";
    return `
      <a class="card" href="project.html?id=${encodeURIComponent(p.id)}">
        <div class="thumb" ${bg}>${placeholder}</div>
        <div class="card-body">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.summary)}</p>
          <div class="meta">${esc(p.category)} · ${esc(p.level)} · 도면 ${formatPrice(p.price)}</div>
        </div>
      </a>`;
  }).join("");
}

/* ---------- 4) 상세 페이지 ---------- */

function renderProject() {
  const box = document.getElementById("project-detail");
  const id = new URLSearchParams(location.search).get("id"); // 주소의 ?id= 값
  const p = getPublished().find(x => x.id === id);

  // 없는 주소로 들어온 경우 안내 문구
  if (!p) {
    box.innerHTML = `<p>프로젝트를 찾을 수 없습니다.</p><a href="index.html">← 목록으로</a>`;
    return;
  }
  document.title = `${p.title} | ${SITE.name}`; // 브라우저 탭 제목

  // 영상 영역: 영상 ID가 있으면 유튜브 삽입, 없으면 안내 문구
  const video = p.youtubeId
    ? `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(p.youtubeId)}"
         title="${esc(p.title)}" allowfullscreen loading="lazy"></iframe>`
    : "영상 준비중";

  // 구매 버튼: 결제 주소가 있으면 링크, 없으면 비활성 버튼
  const buy = p.buyUrl
    ? `<a class="btn" href="${esc(p.buyUrl)}" target="_blank" rel="noopener">도면 받기</a>`
    : `<span class="btn off">도면 준비중</span>`;

  box.className = "detail";
  box.innerHTML = `
    <a class="back" href="index.html">← 목록으로</a>
    <h1>${esc(p.title)}</h1>
    <div class="meta">${esc(p.category)} · ${esc(p.level)}</div>
    <div class="video">${video}</div>
    ${p.description.map(t => `<p>${esc(t)}</p>`).join("")}
    <h2>사용한 도구</h2>
    <ul class="tools">${p.tools.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    <div class="buy">
      <p class="price">${formatPrice(p.price)}</p>
      ${buy}
    </div>`;
}

/* ---------- 5) 시작 지점 ---------- */

renderLayout();
// <body data-page="..."> 값에 따라 알맞은 페이지를 그림
const page = document.body.dataset.page;
if (page === "home") renderHome();
if (page === "project") renderProject();
