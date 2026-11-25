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
    mockup: "목업 보기",
  },
}

export const projectPath = (id: string) => `${projects.path}/${id}`
