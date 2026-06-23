/**
 * 0단계 목업 데이터.
 * 1단계에서 동일한 모양을 Supabase `apps` 테이블로 옮긴다.
 * → 데이터 "모양"을 같게 유지해 이전이 매끄럽게(BUILD.md 5·7).
 *
 * thumbnailUrl 이 비어있으면 카드가 중립 플레이스홀더를 렌더링한다.
 * (실제 썸네일·URL·본문은 시드 채울 때 교체)
 */

export type App = {
  id: string
  title: string
  appUrl: string // 새 탭 실행 대상
  thumbnailUrl: string
  authorName: string
  description: string // 블로그형 소개 본문 (마크다운/텍스트)
  categoryIds: string[] // categories.ts 의 id 참조
  viewCount: number // 시드값 (누적은 후속 단계)
  likeCount: number // 시드값
  bookmarkCount: number // 시드값
  createdAt: string
}

export const seedApps: App[] = [
  {
    id: "date-johyo",
    title: "날짜 저요저요!",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "김경민",
    description:
      "달력 학습 앱. 뒤집기 → 드래그 두 단계로 오늘 날짜를 익힙니다. 특수교육 현장에서 매일 아침 활동으로 쓰려고 만들었어요.",
    categoryIds: ["math", "life"],
    viewCount: 151,
    likeCount: 8,
    bookmarkCount: 5,
    createdAt: "2026-06-21",
  },
  {
    id: "multiboard",
    title: "멀티보드",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "이수아",
    description:
      "수업용 전자칠판 도구. 그리기·도형·이미지 붙이기를 가볍게. 태블릿에서도 부드럽게 동작하도록 다듬었습니다.",
    categoryIds: ["class"],
    viewCount: 432,
    likeCount: 21,
    bookmarkCount: 17,
    createdAt: "2026-06-18",
  },
  {
    id: "job-value-cup",
    title: "직업가치관 월드컵",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "박도현",
    description:
      "이상형 월드컵 형식으로 직업 가치관을 탐색합니다. 진로 수업 도입 활동으로 학생 참여도가 높았어요.",
    categoryIds: ["career"],
    viewCount: 288,
    likeCount: 14,
    bookmarkCount: 9,
    createdAt: "2026-06-15",
  },
  {
    id: "cat-numbers",
    title: "야옹야옹 고양이 숫자 놀이",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "정유진",
    description:
      "고양이와 함께 1~10 수 개념을 익히는 놀이. 소근육·집중에 어려움이 있는 학생도 쉽게 따라올 수 있게 큼직한 버튼으로 구성했습니다.",
    categoryIds: ["math", "life"],
    viewCount: 197,
    likeCount: 11,
    bookmarkCount: 6,
    createdAt: "2026-06-12",
  },
  {
    id: "hangul-play",
    title: "한글 떼기 놀이",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "최민서",
    description:
      "자음·모음을 결합해 글자를 만드는 한글 학습 놀이. 단계별로 난이도를 올릴 수 있습니다.",
    categoryIds: ["korean"],
    viewCount: 365,
    likeCount: 19,
    bookmarkCount: 13,
    createdAt: "2026-06-09",
  },
  {
    id: "emotion-card",
    title: "감정 카드",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "한지원",
    description:
      "오늘의 감정을 카드로 고르고 이야기 나누는 도구. 아침 모임·상담 활동에 활용합니다.",
    categoryIds: ["life", "class"],
    viewCount: 124,
    likeCount: 7,
    bookmarkCount: 4,
    createdAt: "2026-06-05",
  },
  {
    id: "color-music",
    title: "색칠 음악대",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "오세훈",
    description:
      "색을 칠하면 소리가 나는 음악·미술 통합 놀이. 감각 활동으로 좋아요.",
    categoryIds: ["music", "art"],
    viewCount: 158,
    likeCount: 10,
    bookmarkCount: 8,
    createdAt: "2026-06-02",
  },
  {
    id: "pe-timer",
    title: "체육 스트레칭 타이머",
    appUrl: "https://example.com",
    thumbnailUrl: "",
    authorName: "윤하늘",
    description:
      "동작별 시간을 알려주는 스트레칭 타이머. 큰 글씨와 음성 안내로 혼자서도 따라할 수 있습니다.",
    categoryIds: ["pe"],
    viewCount: 96,
    likeCount: 5,
    bookmarkCount: 3,
    createdAt: "2026-05-29",
  },
]
