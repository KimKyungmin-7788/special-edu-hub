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
