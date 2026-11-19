/**
 * 수업실천사례 설정 (PRD §13) — 문구·선택지의 단일 소스.
 */

/** 대상 선택지(선택 항목, 한 개). DB 에는 이 글자가 그대로 저장된다(최대 30자). */
export const practiceTargets = [
  "유치원",
  "초등 저학년",
  "초등 고학년",
  "중학교",
  "고등학교",
  "전공과",
] as const

/**
 * 본문 소제목 틀 — 새 글을 열면 에디터에 미리 들어간다. 지우거나 바꿔도 된다.
 * guide 는 폼의 에디터 위 안내에만 쓰인다(본문에는 들어가지 않음).
 */
export const practiceSections = [
  { title: "수업 개요", guide: "어떤 학생들과, 무엇을 목표로 한 수업인지" },
  { title: "활동 흐름", guide: "도입–전개–정리, 또는 활동 순서대로" },
  { title: "학생 반응", guide: "학생들이 보인 모습, 인상 깊었던 장면" },
  { title: "돌아보며", guide: "잘된 점, 다음에 바꿔 볼 점, 나누고 싶은 팁" },
] as const

export const practiceBodyTemplate = practiceSections
  .map((s) => `<h2>${s.title}</h2><p></p>`)
  .join("")

/** 학생 개인정보 확인 문구(등록 시 필수 체크). */
export const practicePrivacyCheck =
  "사진·파일·본문에 학생이 식별되지 않도록 처리했거나(얼굴·이름·학교 등), 보호자 동의를 받았습니다."

export const practiceCopy = {
  listTitle: "수업실천사례",
  listIntro: "선생님들의 수업 이야기와 설계안, 함께 쓴 학습자료를 모았습니다.",
  writeTitle: "수업 사례 쓰기",
  writeIntro:
    "기본 정보만 채우면 바로 올릴 수 있어요. 본문은 소제목 틀을 참고해 자유롭게 써 주세요.",
  editTitle: "수업 사례 수정",
  editIntro: "저장하면 바로 반영됩니다.",
}

/** 지도안 양식(72) 화면 문구 — 쓰기 폼과 상세가 같이 쓴다. */
export const planText = {
  formats: { plan: "지도안", free: "자유 본문" },
  bars: {
    head: "수업 지도안",
    groups: "학생 특성·개별화 지원",
    lessons: "차시별 활동",
    record: "실천 기록",
    cover: "표지",
  },
  title: "수업명",
  subject: "교과",
  target: "대상",
  unit: "단원",
  standards: "성취기준",
  goals: "수업 목표",
  tools: "활용할 AI·디지털 도구",
  toolsApps: "누리집 자료",
  toolsOther: "바깥 도구",
  toolsOtherPlaceholder: "예: Gemini, 패들렛",
  toolsOtherAdd: "추가",
  group: {
    level: "집단",
    performance: "수행 수준",
    content: "조정된 내용",
    method: "조정된 방법",
    highTouch: "하이터치",
  },
  groupPlaceholders: {
    performance: "예: 숫자 1~31 읽기 가능",
    content: "예: 날짜만",
    method: "예: 큰 글씨 달력 함께",
    highTouch: "예: 눈 맞추고 3초 기다리기",
  },
  goalPlaceholders: {
    가: "예: 달력에서 오늘의 날짜와 요일을 찾아 말할 수 있다.",
    나: "예: 달력에서 오늘의 날짜를 찾아 말할 수 있다.",
    다: "예: 도움을 받아 달력에서 오늘 날짜를 가리킬 수 있다.",
  },
  lesson: {
    head: "차시",
    step: "단계",
    text: "수업 내용",
    tool: "활용 도구",
    minutes: "분",
    add: "차시 추가",
    remove: "차시 삭제",
    noTool: "선택",
  },
  steps: { intro: "도입", main: "전개", wrap: "정리" },
  evaluation: "평가 방법",
  evaluationPlaceholder: "예: 관찰 — 달력에서 오늘 날짜를 찾는지(스스로·몸짓 도움·말 도움)",
  reaction: "학생 반응",
  reactionPlaceholder: "수업 뒤에 직접 써 주세요",
  reflection: "돌아보며",
  reflectionPlaceholder: "잘된 점, 다음에 바꿔 볼 점",
  cover: "표지",
  coverUpload: "사진 올리기",
}
