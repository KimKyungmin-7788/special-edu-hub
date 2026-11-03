/**
 * 새 소식(/updates) — 누리집에 새로 생기거나 바뀐 것. 최신이 위.
 * 소식을 올리려면 맨 위에 한 줄 더하고 배포한다. 운영진만 쓰는 변경은 넣지 않는다.
 * 운영진 공지 알림의 링크를 '/updates' 로 걸면 회원이 여기로 온다.
 */

export type UpdateKind = "new" | "improve" | "notice"

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  new: "새 기능",
  improve: "개선",
  notice: "안내",
}

export type UpdateItem = {
  /** 2026-11-03 형식 */
  date: string
  kind: UpdateKind
  title: string
  body: string
  /** 눌러서 가 볼 곳(사이트 안 경로) */
  link?: { label: string; to: string }
}

export const updatesPage = {
  title: "새 소식",
  lead: "누리집에 새로 생기거나 바뀐 것을 모아 둡니다.",
}

export const updates: UpdateItem[] = [
  {
    date: "2026-11-03",
    kind: "new",
    title: "자료 카드 미리보기 영상",
    body: "목록에서 자료 카드에 마우스를 올리면 앱 화면이 소리 없이 재생돼요. 자료 수정 화면의 '미리보기 영상' 칸에 앱 화면 녹화를 넣어 주세요. 영상이 길거나 커도 담을 10초를 고르면 누리집이 알아서 작게 줄여 담아요. 학생 얼굴이나 이름이 나오는 화면은 넣지 말아 주세요.",
    link: { label: "내 자료에 넣어 보기", to: "/mypage" },
  },
  {
    date: "2026-11-03",
    kind: "notice",
    title: "열린연수방 11월 8일 공개 예정",
    body: "'왜 바이브코딩인가?'와 '기초 익히기'를 먼저 엽니다. 나머지 과정도 차례로 열어요.",
    link: { label: "열린연수방 보기", to: "/training" },
  },
  {
    date: "2026-11-02",
    kind: "new",
    title: "자료에 파일 3개까지 첨부",
    body: "활동지·안내서 같은 파일을 자료와 함께 올릴 수 있어요.",
  },
  {
    date: "2026-11-02",
    kind: "improve",
    title: "소속 학교를 나이스에서 검색",
    body: "학교 이름 몇 글자만 치면 목록에서 고를 수 있어요.",
  },
]
