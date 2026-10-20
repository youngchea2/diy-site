/* ============================================================
   data.js : 프로젝트(영상 + 도면) 데이터  ★ 가장 자주 수정하는 파일 ★

   새 프로젝트 추가 방법: 아래 배열 맨 끝에 { ... }, 블록을 복사해서 붙여넣기.

   각 항목 설명
   - id        : 주소에 쓰이는 영문 이름 (중복 금지, 공백 금지)
   - title     : 제목
   - summary   : 목록 카드에 보이는 한 줄 설명
   - category  : 분류 (3D프린터 / 아두이노 / 모델링 등)
   - level     : 난이도 (입문 / 중급 / 고급)
   - youtubeId : 유튜브 주소 v= 뒤의 11글자 (영상 올리기 전엔 "" 로 두기)
   - description : 상세 페이지 설명 (문단 배열, 한 줄이 한 문단)
   - tools     : 사용한 AI/도구/부품 목록
   - price     : 도면 가격(원). 0 이면 '무료'
   - buyUrl    : 결제 페이지 주소 (스마트스토어 등). 없으면 "" → '준비중' 표시
   - status    : "published" 공개 / "draft" 숨김
============================================================ */
const PROJECTS = [
  {
    id: "rc-fishing-boat",
    title: "AI로 만드는 RC 낚시배",
    summary: "AI에게 물어가며 설계하고 출력한 원격 조종 낚시배.",
    category: "3D프린터", level: "고급",
    youtubeId: "",
    description: [
      "AI와 대화하며 선체를 설계하고 3D 프린터로 출력해 완성하는 과정을 담았습니다.",
      "방수, 무게중심, 모터 선정에서 겪은 시행착오도 함께 공개합니다."
    ],
    tools: ["ChatGPT/Claude", "3D 프린터", "RC 수신기", "브러시리스 모터"],
    price: 0, buyUrl: "", status: "published"
  },
  {
    id: "arduino-playground",
    title: "AI로 아두이노 가지고 놀기",
    summary: "코드는 AI가 짜고, 나는 회로만 연결해 보는 입문 실험.",
    category: "아두이노", level: "입문",
    youtubeId: "",
    description: [
      "LED, 센서, 서보모터를 AI가 만든 코드로 움직여 봅니다.",
      "AI 코드가 틀렸을 때 어떻게 고치는지도 보여드립니다."
    ],
    tools: ["아두이노 우노", "브레드보드", "서보모터", "AI 코딩"],
    price: 0, buyUrl: "", status: "published"
  },
  {
    id: "ai-modeling",
    title: "AI를 이용하여 모델링 해보기",
    summary: "AI로 3D 모델을 설계하고 출력 가능한 파일로 다듬는 방법.",
    category: "모델링", level: "입문",
    youtubeId: "",
    description: [
      "AI로 모델 아이디어를 얻고 스케치업 등에서 출력용으로 정리하는 과정을 다룹니다."
    ],
    tools: ["AI", "스케치업", "슬라이서"],
    price: 0, buyUrl: "", status: "published"
  },
  {
    id: "robot-arm",
    title: "AI로 간단 로봇 팔 제작",
    summary: "서보모터 4개로 움직이는 로봇 팔 — 도면과 코드 포함.",
    category: "아두이노", level: "중급",
    youtubeId: "",
    description: [
      "3D 프린터로 관절을 출력하고 아두이노로 제어하는 로봇 팔입니다.",
      "도면(STL)과 아두이노 코드를 함께 제공할 예정입니다."
    ],
    tools: ["3D 프린터", "아두이노", "서보모터 x4", "AI 코딩"],
    price: 5000, buyUrl: "", status: "published"
  },
  {
    id: "ai-airplane",
    title: "AI로 비행기 만들기",
    summary: "AI와 설계하고 출력해서 날려 보는 모형 비행기.",
    category: "3D프린터", level: "고급",
    youtubeId: "",
    description: [
      "날개 단면, 무게, 모터 선정까지 AI와 상의하며 제작합니다.",
      "첫 비행의 성공과 실패를 모두 공개합니다."
    ],
    tools: ["3D 프린터", "AI", "RC 장비"],
    price: 5000, buyUrl: "", status: "published"
  }
];
