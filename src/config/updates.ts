/**
 * 새 소식(/updates) 문구. 소식 자체는 운영진 페이지 '새 소식' 탭에서 쓰고 DB(site_updates, SQL 54)에 담긴다.
 */

export type UpdateKind = "new" | "improve" | "notice"

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  new: "새 기능",
  improve: "개선",
  notice: "안내",
}

export const updatesPage = {
  title: "새 소식",
  lead: "누리집에 새로 생기거나 바뀐 것을 모아 둡니다.",
  empty: "아직 올라온 소식이 없어요.",
}

/** 처음 접속 팝업 — 마지막으로 본 뒤 올라온 소식을 한 번 보여 준다 */
export const updatesPopup = {
  title: "새 소식",
  more: "새 소식 모두 보기",
  close: "닫기",
  /** 한 번도 본 적 없는 방문자에게는 이 날수 안의 소식만 보여 준다 */
  firstVisitDays: 14,
  /** 팝업에 보여 줄 최대 개수 */
  max: 3,
}
