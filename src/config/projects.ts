/**
 * 협업 프로젝트(PRD §15) — 바이브코딩 메뉴 아래. 이름·주소·화면 문구는 여기 한 곳.
 */

export type ProjectStatus = "recruiting" | "working" | "done" | "stopped"

export const projects = {
  title: "협업 프로젝트",
  /** 상세·쓰기 주소의 앞부분 */
  path: "/training/projects",
  /** 목록은 바이브코딩 화면 아래 영역에 단계처럼 뜬다(2026-11-25 사용자 요청) */
  listPath: "/training?stage=projects",
  ctaLabel: "프로젝트 열기",
  status: {
    recruiting: "모집 중",
    working: "작업 중",
    done: "완성",
    stopped: "그만둠",
  } satisfies Record<ProjectStatus, string>,
  /** 목록 걸러보기 순서(그만둠은 전체에서만) */
  filters: ["recruiting", "working", "done"] as ProjectStatus[],
  emptyTitle: "첫 프로젝트를 기다리고 있어요",
  form: {
    heading: "프로젝트 열기",
    editHeading: "프로젝트 고치기",
    title: "프로젝트 이름",
    titlePlaceholder: "급식 메뉴 그림 카드",
    vision: "비전 한 줄",
    visionPlaceholder: "말 대신 그림을 눌러 오늘 먹고 싶은 반찬을 고르게 하고 싶어요",
    needed: "필요 인원",
    neededOption: (n: number) => `나 말고 ${n}명`,
    mockup: "목업 링크 (선택)",
    cover: "대표 사진 (선택)",
    body: "소개",
    bodyPlaceholder: "어떤 학생, 어떤 장면에서 쓰고 싶은지",
    guard: "학생의 얼굴·이름·개인 정보가 나오는 사진이나 자료는 올리지 말아 주세요.",
    submit: "모집 시작",
    save: "고친 내용 저장",
  },
  detail: {
    needed: "필요 인원",
    leader: "리더",
    members: "함께하는 사람",
    mockup: "목업 보기",
  },
  /** 2묶음: 협업 요청·결성·팀 공간 */
  request: {
    work: "지금 하는 일",
    workPlaceholder: "강원 특수학교 중학부 / 국어 담당",
    message: "요청 메시지",
    messagePlaceholder: "그림 카드 만들어 본 적 있어요",
    goal: "이루고 싶은 것 (선택)",
    goalPlaceholder: "우리 반에서 바로 써 보기",
    privacy: "리더와 나만 봐요",
    send: "협업 요청 보내기",
    cancel: "요청 취소",
    messageLeader: "리더에게 쪽지",
    full: "모집 인원이 다 찼어요",
    status: {
      pending: "답을 기다리는 중",
      accepted: "함께함",
      declined: "이번엔 어려워요",
      closed: "모집 마감",
    },
  },
  leader: {
    heading: "받은 요청",
    accept: "함께하기",
    decline: "이번엔 어려워요",
    message: "쪽지",
    empty: "아직 받은 요청이 없어요",
    formHeading: "결성 확정",
    due: "마감일",
    kakao: "카카오톡 오픈채팅 링크",
    kakaoPlaceholder: "https://open.kakao.com/o/…",
    form: "결성 확정하기",
    formNote: "기다리는 요청은 '모집 마감'으로 바뀌어요",
  },
  team: {
    heading: "팀 공간",
    join: "카톡 단톡방 들어가기",
    changeLink: "링크 바꾸기",
  },
  my: {
    tab: "내 협업",
    led: "내가 연 프로젝트",
    joined: "보낸 요청 · 참여 중",
    newRequests: (n: number) => `새 요청 ${n}`,
    team: "팀 공간",
    emptyLed: "아직 연 프로젝트가 없어요.",
    emptyJoined: "아직 보낸 요청이 없어요.",
  },
}

export const projectPath = (id: string) => `${projects.path}/${id}`
