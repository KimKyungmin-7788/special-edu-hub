# BUILD.md — 빌드 설계

> PRD.md(무엇을 만드는가) + CLAUDE.md(작업 규칙)를 받아, **폴더·파일을 어떻게 배치할지** 그리는 청사진.
> 0단계에서 이 구조대로 뼈대를 잡는다. 구조를 바꿔야 하면 먼저 물어본다.

---

## 1. 폴더 구조

```
src/
├─ config/
│  ├─ site.ts          # 누리집명·로고·히어로 문구 등 브랜드 요소 (한 곳에서 수정)
│  └─ categories.ts    # 카테고리(과목·업무) 목록
├─ styles/
│  └─ tokens.css       # 색·폰트·반경·여백 = CSS 변수 토큰 (디자인 교체 지점)
├─ data/
│  └─ seed.ts          # 0단계 목업 데이터 (1단계에서 Supabase로 이전)
├─ lib/
│  └─ supabase.ts      # Supabase 클라이언트 (1단계부터)
├─ components/
│  ├─ layout/          # Header, Nav, Footer
│  ├─ home/            # Hero(캐러셀), CategoryGrid, AppCardList
│  ├─ app/             # AppCard, AppDetail 구성요소
│  └─ ui/              # shadcn/ui 컴포넌트
├─ pages/ (또는 routes/)
│  ├─ Home.tsx             # 랜딩
│  ├─ AllApps.tsx          # 전체
│  ├─ SubjectApps.tsx      # 과목별
│  ├─ WorkApps.tsx         # 업무혁신
│  ├─ AppDetail.tsx        # 앱 상세
│  └─ ComingSoon.tsx       # 수업실천사례/자유게시판/교사인증센터 공용 "준비 중"
├─ App.tsx             # 라우팅
└─ main.tsx
```

> 폴더명·확장자는 합리적 범위에서 조정 가능. 단 **config / styles(tokens) / data 의 분리**는 반드시 유지한다.

---

## 2. 디자인 토큰 (styles/tokens.css)

색·폰트·반경을 변수로 모은다. 컴포넌트는 이 변수만 참조한다. **나중에 브랜드가 정해지면 이 파일만 바꾼다.**

```css
:root {
  /* 색 — 지금은 중립(화이트·블랙·그레이) */
  --color-bg: #ffffff;
  --color-surface: #f7f7f8;     /* 카드·영역 배경 */
  --color-border: #e5e5e8;
  --color-text: #1a1a1a;
  --color-text-muted: #6b6b70;
  --color-primary: #1a1a1a;      /* 브랜드 정해지면 여기부터 교체 */
  --color-primary-foreground: #ffffff;

  /* 타이포 */
  --font-main: system-ui, -apple-system, "Pretendard", sans-serif;

  /* 모양 */
  --radius: 12px;
  --space-unit: 8px;
}
```

Tailwind/shadcn을 쓰면 `tailwind.config`와 shadcn 테마 변수를 이 토큰에 연결한다(색을 Tailwind 임의값으로 직접 쓰지 말 것).

---

## 3. 브랜드 config (config/site.ts)

```ts
export const site = {
  name: "강원 특수교육 디지털 학습자료 누리집", // 가칭, 추후 교체
  logoText: "(로고 미정)",                      // 이미지 로고 들어오면 교체
  hero: {
    title: "교과서만으로는 수업이 힘든\n특수교사가 직접 만든 디지털 교육자료",
    subtitle: "",          // 필요 시
    ctaLabel: "자료 둘러보기",
  },
  // 히어로는 캐러셀: 문구 슬라이드 + 배너 이미지 슬라이드를 배열로
  heroSlides: [
    { type: "text" /* title/subtitle/cta 사용 */ },
    // { type: "banner", imageUrl: "..." }  // 배너 추가 시
  ],
};
```

화면 어디서도 누리집명·문구를 직접 쓰지 않고 이 객체에서 불러온다.

---

## 4. 카테고리 config (config/categories.ts)

```ts
export const categories = [
  { id: "korean",   name: "국어",     type: "subject", icon: "book" },
  { id: "math",     name: "수학",     type: "subject", icon: "calculator" },
  { id: "social",   name: "사회",     type: "subject", icon: "globe" },
  { id: "science",  name: "과학",     type: "subject", icon: "flask" },
  { id: "music",    name: "음악",     type: "subject", icon: "music" },
  { id: "art",      name: "미술",     type: "subject", icon: "palette" },
  { id: "pe",       name: "체육",     type: "subject", icon: "activity" },
  { id: "life",     name: "일상생활", type: "subject", icon: "home" },
  { id: "career",   name: "진로직업", type: "subject", icon: "briefcase" },
  { id: "creative", name: "창체",     type: "subject", icon: "sparkles" },
  { id: "class",    name: "학급경영", type: "subject", icon: "users" },
  { id: "work",     name: "업무혁신", type: "work",    icon: "settings" },
];
```

> 시작 목록일 뿐 조정 가능. 아이콘은 lucide-react 아이콘명 기준(예시).

---

## 5. 시드/데이터 스키마 (data/seed.ts → 1단계 Supabase)

0단계는 이 목업으로, 1단계는 동일 구조를 Supabase `apps` 테이블로 옮긴다. **두 단계의 데이터 모양을 같게** 만들어 이전이 매끄럽게 한다.

```ts
export type App = {
  id: string;
  title: string;
  appUrl: string;          // 새 탭 실행 대상
  thumbnailUrl: string;
  authorName: string;
  description: string;     // 블로그형 소개 본문 (마크다운/텍스트)
  categoryIds: string[];   // categories.ts의 id 참조
  viewCount: number;       // 시드값 (누적은 후속 단계)
  likeCount: number;       // 시드값
  bookmarkCount: number;   // 시드값
  createdAt: string;
};

export const seedApps: App[] = [
  {
    id: "date-johyo",
    title: "날짜 저요저요!",
    appUrl: "https://...",          // ← 실제 URL로 채우기
    thumbnailUrl: "https://...",    // ← 실제 썸네일
    authorName: "김경민",
    description: "달력 학습 앱. 뒤집기→드래그 두 단계로 날짜를 익힌다 ...",
    categoryIds: ["math", "life"],
    viewCount: 151,
    likeCount: 8,
    bookmarkCount: 5,
    createdAt: "2026-06-21",
  },
  // 멀티보드 / 직업가치관 월드컵 / 고양이 숫자 놀이 ... 추가
];
```

> **채워야 할 빈칸:** 각 앱의 실제 `appUrl`, `thumbnailUrl`, `description`, `categoryIds`. → 시드 채울 때 함께 정리.

---

## 6. 라우팅 맵

| 경로 | 페이지 | 상태 |
|---|---|---|
| `/` | Home | ✅ |
| `/apps` | AllApps (전체) | ✅ |
| `/apps/subject/:categoryId` | SubjectApps (과목별) | ✅ |
| `/apps/work` | WorkApps (업무혁신) | ✅ |
| `/app/:id` | AppDetail (상세) | ✅ |
| `/practices` | 수업실천사례 | 🚧 ComingSoon |
| `/board` | 자유게시판 | 🚧 ComingSoon |
| `/verify` | 교사인증센터 | 🚧 ComingSoon |

> 로그인/회원가입 버튼은 헤더에 모양만. 라우트 연결은 후속 단계.

---

## 7. 0단계 → 1단계 전환 포인트

- 0단계: 컴포넌트가 `data/seed.ts`에서 직접 읽는다.
- 1단계: 같은 데이터 모양을 Supabase에서 읽도록 **데이터 호출부만 교체**(`lib/supabase.ts` 경유). 컴포넌트·화면은 그대로.
- 이를 위해 0단계부터 데이터 접근을 한 군데(예: `lib/apps.ts`의 `getApps()`, `getApp(id)`)로 모아, 내부 구현만 seed→Supabase로 바꾸면 되게 한다.

---

## 8. 0단계 작업 체크리스트

- [ ] Vite + React + Tailwind + shadcn/ui 초기화
- [ ] `tokens.css` 중립 토큰 작성, Tailwind/shadcn에 연결
- [ ] `config/site.ts`, `config/categories.ts` 작성
- [ ] 레이아웃(Header/Nav/Footer) — 로고·메뉴·로그인/가입 버튼(모양만)
- [ ] Home: Hero(캐러셀) + CategoryGrid + AppCardList(목업)
- [ ] AppCard 컴포넌트(썸네일/제목/태그/좋아요·담기 수)
- [ ] 전체·과목별·업무혁신 페이지(목업 필터)
- [ ] AppDetail(목업): 제목·개발자·앱 열기(새 탭)·소개 본문·조회수
- [ ] ComingSoon 3종 자리
- [ ] 데이터 접근 함수(`getApps`/`getApp`)로 호출 일원화
- [ ] 브라우저 확인 → Git 커밋

> 1단계 체크리스트는 0단계 완료 후 별도로 잡는다.
