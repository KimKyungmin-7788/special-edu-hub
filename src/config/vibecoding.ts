import { trainingPath } from "@/config/training"

/**
 * 바이브코딩 슬라이드 자료 — 그림 위치와 주소.
 * '왜 바이브코딩인가?'는 연수 1, 환경구축·연수 돌아보기는 연수 3에 있다. 메뉴는 config/training.ts 에서 관리한다.
 */
export const vibecoding = {
  /** 하위 페이지 그림·로고 위치(public/vibecoding/) */
  assetBase: "/vibecoding/",
  whyPath: trainingPath("vibecoding", "why"),
  setupPath: trainingPath("agent", "setup"),
  surveyPath: trainingPath("agent", "survey"),
}
